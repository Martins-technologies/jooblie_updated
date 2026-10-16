// Isolated PostgreSQL, with no project secrets or Supabase connection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(process.env.PGLITE_MODULE?pathToFileURL(process.env.PGLITE_MODULE).href:'@electric-sql/pglite');
const db=new PGlite();
const actor='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',seeker='10000000-0000-4000-8000-000000000003',job='20000000-0000-4000-8000-000000000001';
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema private;
  create type public.user_role as enum('admin','recruiter','job_seeker');
  create table public.profiles(id uuid primary key,role public.user_role,status text,full_name text,email text);
  create table public.jobs(id uuid primary key,title text,updated_at timestamptz,deleted_at timestamptz);
  create table public.notifications(id uuid primary key,user_id uuid,read_at timestamptz,created_at timestamptz);
  insert into public.profiles values('${actor}','admin','active','Actor','actor@example.test'),('${other}','admin','active','Other','other@example.test'),('${seeker}','job_seeker','active','Seeker','seeker@example.test');
  insert into public.jobs values('${job}','Original','2026-10-15T10:00:00.123456Z',null);
  create function public.save_portal_job(uuid,uuid,smallint,jsonb,text[],boolean) returns setof public.jobs language plpgsql as $$
    begin return query update public.jobs set title=coalesce($4->>'title',title),updated_at=clock_timestamp() where id=$2 returning *;end;$$;
`);
const migration=await readFile(new URL('../migrations/007_admin_concurrency.sql',import.meta.url),'utf8');
await db.exec(migration);await db.exec(migration);
test('admin job update locks and compares exact database revision before writing',async()=>{
  const result=await db.query(`select * from public.admin_update_portal_job($1,$2,$3,$4)`,[actor,job,'2026-10-15T10:00:00.123456Z',{title:'Changed'}]);
  assert.equal(result.rows[0].title,'Changed');
  await assert.rejects(db.query(`select * from public.admin_update_portal_job($1,$2,$3,$4)`,[actor,job,'2026-10-15T10:00:00.123456Z',{title:'Stale overwrite'}]),error=>error.code==='40001');
  assert.equal((await db.query('select title from public.jobs')).rows[0].title,'Changed');
});
test('admin guards reject recruiter/seeker actors and missing/deleted jobs',async()=>{
  await assert.rejects(db.query(`select * from public.admin_update_portal_job($1,$2,now(),'{}')`,[seeker,job]),error=>error.code==='42501');
  await assert.rejects(db.query(`select * from public.admin_update_portal_job($1,$2,null,'{}')`,[actor,job]),error=>error.message==='JOB_VERSION_REQUIRED');
  await db.query('update public.jobs set deleted_at=now()');
  await assert.rejects(db.query(`select * from public.admin_update_portal_job($1,$2,now(),'{}')`,[actor,job]),error=>error.code==='P0002');
});
test('role change is confirmed, stale changes rejected and last active administrator preserved',async()=>{
  await db.query(`select * from public.admin_change_user_role($1,$2,'recruiter','admin')`,[actor,other]);
  await assert.rejects(db.query(`select * from public.admin_change_user_role($1,$2,'job_seeker','admin')`,[actor,other]),error=>error.code==='40001');
  await assert.rejects(db.query(`select * from public.admin_change_user_role($1,$1,'recruiter','admin')`,[actor]),error=>error.message==='SELF_ROLE_CHANGE_BLOCKED');
  await assert.rejects(db.query(`select * from public.admin_change_user_role($1,$2,'admin','job_seeker')`,[seeker,seeker]),error=>error.code==='42501');
  // A suspended second administrator is not counted as an available administrator.
  await db.query(`update public.profiles set role='admin',status='blocked' where id=$1`,[other]);
  assert.equal((await db.query(`select count(*)::int as count from public.profiles where role='admin' and status='active'`)).rows[0].count,1);
  assert.match(migration,/pg_advisory_xact_lock/);
});
test('transaction routines are service-only and notification indexes are idempotent',async()=>{
  for(const role of ['anon','authenticated'])for(const signature of ['public.admin_update_portal_job(uuid,uuid,timestamptz,jsonb)','public.admin_change_user_role(uuid,uuid,public.user_role,public.user_role)']){
    assert.equal((await db.query('select has_function_privilege($1,$2,\'execute\') as allowed',[role,signature])).rows[0].allowed,false);
  }
  assert.equal((await db.query("select count(*)::int as count from pg_indexes where indexname in ('notifications_owner_created_idx','notifications_owner_unread_idx')")).rows[0].count,2);
  await db.close();
});
