// Isolated PostgreSQL tests. Never connects to Supabase or reads project secrets.
// Install @electric-sql/pglite in a scratch folder and set PGLITE_MODULE to its
// dist/index.js file, or make the package available in the local Node resolution.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

const moduleName = process.env.PGLITE_MODULE;
const { PGlite } = await import(moduleName ? pathToFileURL(moduleName).href : '@electric-sql/pglite');
const db = new PGlite();
const migration = await readFile(new URL('../migrations/006_portal_workflow_integrity.sql', import.meta.url), 'utf8');
const preflight = await readFile(new URL('./006_portal_workflow_preflight.sql', import.meta.url), 'utf8');
const recruiter = '10000000-0000-0000-0000-000000000001';
const stranger = '10000000-0000-0000-0000-000000000002';
const admin = '10000000-0000-0000-0000-000000000003';
const seeker = '10000000-0000-0000-0000-000000000004';
const company = '20000000-0000-0000-0000-000000000001';

await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create schema storage;
  create function auth.uid() returns uuid language sql as 'select null::uuid';
  create type public.user_role as enum ('job_seeker','recruiter','admin');
  create type public.user_status as enum ('active','blocked');
  create type public.site_type as enum ('aggregator','specialist','audience');
  create type public.job_status as enum ('active','pending_review','closed','removed','expired');
  create type public.employment_type as enum ('full_time','part_time','contract','temporary','internship','seasonal');
  create table public.sectors(id smallint primary key,slug text unique,name text,sort_order smallint);
  create table public.sites(id smallint primary key,slug text unique not null,name text,domain text unique,
    site_type public.site_type not null,sector_id smallint references public.sectors(id),is_active boolean default true);
  create table public.categories(id smallint primary key,sector_id smallint references public.sectors(id),
    slug text unique,name text,sort_order smallint,is_active boolean default true);
  create table public.profiles(id uuid primary key,role public.user_role not null,status public.user_status not null default 'active',recruiter_company_id uuid);
  create table public.companies(id uuid primary key,status text default 'active',deleted_at timestamptz,verification_status text default 'pending');
  alter table public.profiles add foreign key(recruiter_company_id) references public.companies(id);
  create table public.company_members(company_id uuid references public.companies(id),user_id uuid references public.profiles(id),role text,primary key(company_id,user_id));
  create table public.jobs(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
    origin_site_id smallint not null references public.sites(id),created_by uuid not null references public.profiles(id),
    category_id smallint not null references public.categories(id),title text not null,description text not null,
    province text,city text,is_remote boolean not null default false,salary_min numeric check(salary_min>=0),
    salary_max numeric check(salary_max>=0),salary_currency char(3) not null default 'CAD',salary_period text,
    employment_type public.employment_type not null,workplace_type text not null default 'onsite',
    experience_level text not null default 'mid_level',skills text[] not null default '{}',
    status public.job_status not null default 'active',published_at timestamptz,expires_at timestamptz,
    removed_reason text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz);
  create table public.job_sites(job_id uuid references public.jobs(id),site_id smallint references public.sites(id),primary key(job_id,site_id));
  create table public.category_sites(category_id smallint references public.categories(id),site_id smallint references public.sites(id),primary key(category_id,site_id));
  create table public.job_audience_sites(job_id uuid references public.jobs(id),site_id smallint references public.sites(id),created_at timestamptz default now(),primary key(job_id,site_id));
  create table public.applications(id uuid primary key default gen_random_uuid(),job_id uuid references public.jobs(id),
    applicant_id uuid references public.profiles(id),status text default 'submitted',deleted_at timestamptz);
  create table storage.buckets(id text primary key,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key,bucket_id text,name text);
  alter table storage.objects enable row level security;
  create policy resumes_select_own on storage.objects for select to authenticated
    using(bucket_id='resumes' and split_part(name,'/',1)=auth.uid()::text);
  insert into storage.buckets(id,public) values('resumes',true);
  insert into public.sectors values(1,'office','Office',1),(2,'it','IT',2),(3,'health','Health',3);
  insert into public.sites values
    (1,'jooblie','Jooblie','jooblie.test','aggregator',null,true),
    (2,'office-jobs','Office','office.test','specialist',1,true),
    (3,'it-jobs','IT','it.test','specialist',2,true),
    (4,'health-care','Health','health.test','specialist',3,true),
    (5,'aboriginal','Aboriginal','aboriginal.test','audience',null,true),
    (6,'newcomers','Newcomers','newcomers.test','audience',null,true);
  insert into public.categories values(101,1,'administration','Administration',1,true),
    (201,2,'software','Software',2,true),(301,3,'nursing','Nursing',3,true);
  insert into public.companies(id) values('${company}');
  insert into public.profiles values
    ('${recruiter}','recruiter','active','${company}'),
    ('${stranger}','recruiter','active',null),
    ('${admin}','admin','active','${company}'),
    ('${seeker}','job_seeker','active',null);
  insert into public.company_members values('${company}','${recruiter}','owner'),('${company}','${admin}','member');
  insert into public.category_sites values(101,1),(201,1),(301,1),(101,2),(201,3),(301,4);
  -- Reproduce the legacy triggers discovered by production catalog preflight.
  create function public.fixture_jobs_derive_status() returns trigger language plpgsql as $$
  begin
    if exists(select 1 from public.companies where id=new.company_id and verification_status='verified') then
      new.status := 'active'; new.published_at := now(); new.expires_at := now()+interval '60 days';
    else
      new.status := 'pending_review'; new.published_at := null; new.expires_at := null;
    end if;
    return new;
  end;
  $$;
  create trigger jobs_derive_status before insert on public.jobs
    for each row execute function public.fixture_jobs_derive_status();
  create function public.fixture_jobs_populate_job_sites() returns trigger language plpgsql as $$
  begin
    insert into public.job_sites(job_id,site_id)
      select new.id,new.origin_site_id union select new.id,id from public.sites where slug='jooblie';
    return new;
  end;
  $$;
  create trigger jobs_populate_job_sites after insert on public.jobs
    for each row execute function public.fixture_jobs_populate_job_sites();
  create function public.fixture_validate_job_status_transition() returns trigger language plpgsql as $$
  begin
    if old.status is distinct from new.status and not (
      (old.status='pending_review' and new.status in ('active','removed')) or
      (old.status='active' and new.status in ('closed','expired','removed')) or
      (old.status in ('closed','expired','removed') and new.status='active')
    ) then
      raise exception using errcode='JB007',message='Invalid job status transition';
    end if;
    return new;
  end;
  $$;
  create trigger validate_job_status_transition before update of status on public.jobs
    for each row execute function public.fixture_validate_job_status_transition();
`);

const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
const destinations = async (jobId) => (await rows('select site_id from public.job_sites where job_id=$1 order by site_id', [jobId])).map(r => r.site_id);
const save = async ({ actor = recruiter, job = null, site = 1, payload = {}, audience = null, isAdmin = false } = {}) =>
  (await rows('select * from public.save_portal_job($1::uuid,$2::uuid,$3::smallint,$4::jsonb,$5::text[],$6::boolean)',
    [actor, job, site, JSON.stringify(payload), audience, isAdmin]))[0];
const content = (category = 301) => ({ title: 'Database test position',description: 'This is a complete test position description.',category_id: category,employment_type: 'full_time',salary_min: 20,salary_max: 40 });
const fails = async (fn, message) => assert.rejects(fn, error => error.message.includes(message));

await test('portal workflow integrity in isolated PostgreSQL', async (t) => {
  await t.test('read-only preflight runs against the pre-migration schema', async () => {
    await db.exec(preflight);
  });
  await t.test('migration applies twice and restores private bucket while preserving owner policy', async () => {
    const before = (await rows("select qual from pg_policies where policyname='resumes_select_own'"))[0].qual;
    await db.exec(migration);
    await db.exec(migration);
    assert.equal((await rows("select public from storage.buckets where id='resumes'"))[0].public,false);
    assert.equal((await rows("select qual from pg_policies where policyname='resumes_select_own'"))[0].qual,before);
  });
  await t.test('RPC grants only service role, preferences retain RLS and restricted privileges', async () => {
    const sql = "select has_function_privilege($1,'public.save_portal_job(uuid,uuid,smallint,jsonb,text[],boolean)','execute') as allowed";
    assert.equal((await rows(sql,['anon']))[0].allowed,false);
    assert.equal((await rows(sql,['authenticated']))[0].allowed,false);
    assert.equal((await rows(sql,['service_role']))[0].allowed,true);
    assert.equal((await rows("select relrowsecurity from pg_class where oid='public.notification_preferences'::regclass"))[0].relrowsecurity,true);
    assert.equal((await rows("select has_table_privilege('authenticated','public.notification_preferences','select') as allowed"))[0].allowed,false);
  });
  let nursing;
  await t.test('new job is active and atomically reaches aggregator/category/audience', async () => {
    nursing = await save({payload: content(),audience:['aboriginal']});
    assert.equal(nursing.status,'active');
    assert.ok(nursing.published_at);
    assert.deepEqual(await destinations(nursing.id),[1,4,5]);
  });
  await t.test('admin concurrency guard preserves the existing publishing transaction and mappings', async () => {
    await db.exec('create table public.notifications(id uuid primary key,user_id uuid,read_at timestamptz,created_at timestamptz)');
    const adminMigration = await readFile(new URL('../migrations/007_admin_concurrency.sql', import.meta.url), 'utf8');
    await db.exec(adminMigration);
    const record = await save({payload:content(201)});
    const revision = (await rows('select updated_at::text as revision from public.jobs where id=$1',[record.id]))[0].revision;
    const before = await destinations(record.id);
    const changed = (await rows('select * from public.admin_update_portal_job($1,$2,$3,$4)',[admin,record.id,revision,JSON.stringify({title:'Admin revised title'})]))[0];
    assert.equal(changed.title,'Admin revised title');
    assert.deepEqual(await destinations(record.id),before);
    await fails(()=>rows('select * from public.admin_update_portal_job($1,$2,$3,$4)',[admin,record.id,revision,JSON.stringify({title:'Stale overwrite'})]),'JOB_VERSION_CONFLICT');
    assert.equal((await rows('select title from public.jobs where id=$1',[record.id]))[0].title,'Admin revised title');
  });
  await t.test('legacy pending insert is activated atomically and verified insert preserves expiration', async () => {
    assert.equal((await rows('select verification_status from public.companies where id=$1',[company]))[0].verification_status,'pending');
    const pendingCompanyJob = await save({payload:content(201)});
    assert.equal(pendingCompanyJob.status,'active');
    assert.ok(pendingCompanyJob.published_at);
    await db.query("update public.companies set verification_status='verified' where id=$1",[company]);
    const verifiedCompanyJob = await save({payload:content(201)});
    assert.equal(verifiedCompanyJob.status,'active');
    assert.ok(new Date(verifiedCompanyJob.expires_at)>new Date(verifiedCompanyJob.published_at));
    await db.query("update public.companies set verification_status='pending' where id=$1",[company]);
  });
  await t.test('invalid audience creates no orphan job and failed edit changes nothing', async () => {
    const before = (await rows('select count(*)::int as n from public.jobs'))[0].n;
    await fails(() => save({payload:content(),audience:['invalid']}),'AUDIENCE_SITE_INVALID');
    assert.equal((await rows('select count(*)::int as n from public.jobs'))[0].n,before);
    await fails(() => save({job:nursing.id,payload:{title:'Must roll back entirely'},audience:['invalid']}),'AUDIENCE_SITE_INVALID');
    assert.equal((await rows('select title from public.jobs where id=$1',[nursing.id]))[0].title,nursing.title);
    assert.deepEqual(await destinations(nursing.id),[1,4,5]);
  });
  await t.test('removing final category mapping removes stale portal but preserves audience', async () => {
    await db.exec('delete from public.category_sites where category_id=301 and site_id=4');
    assert.deepEqual(await destinations(nursing.id),[1,5]);
    await db.exec('insert into public.category_sites values(301,4)');
  });
  await t.test('updating category mapping reconciles old and new category jobs', async () => {
    const office = await save({payload:content(101)});
    await db.exec('update public.category_sites set category_id=101 where category_id=301 and site_id=4');
    assert.deepEqual(await destinations(nursing.id),[1,5]);
    assert.deepEqual(await destinations(office.id),[1,2,4]);
    await db.exec('update public.category_sites set category_id=301 where category_id=101 and site_id=4');
  });
  await t.test('audience UPDATE changes site and also reconciles both jobs when job_id changes', async () => {
    await db.query('update public.job_audience_sites set site_id=6 where job_id=$1 and site_id=5',[nursing.id]);
    assert.deepEqual(await destinations(nursing.id),[1,4,6]);
    const other = await save({payload:content(201)});
    await db.query('update public.job_audience_sites set job_id=$2 where job_id=$1 and site_id=6',[nursing.id,other.id]);
    assert.deepEqual(await destinations(nursing.id),[1,4]);
    assert.deepEqual(await destinations(other.id),[1,3,6]);
  });
  await t.test('close preserves publish timestamp; publish reconciles stale mappings; content edits stay active', async () => {
    const closed = await save({job:nursing.id,payload:{status:'closed'}});
    assert.equal(new Date(closed.published_at).getTime(),new Date(nursing.published_at).getTime());
    // Production's legacy transition guard only permits pending_review on insert.
    const pending = (await rows(`insert into public.jobs(company_id,origin_site_id,created_by,category_id,title,description,employment_type)
      values($1,1,$2,301,'Pending fixture position','Pending fixture position description','full_time') returning *`,[company,recruiter]))[0];
    assert.equal(pending.status,'pending_review');
    await db.query('delete from public.job_sites where job_id=$1',[pending.id]);
    const publishedPending = await save({actor:admin,isAdmin:true,job:pending.id,site:null,payload:{status:'active'}});
    assert.equal(publishedPending.status,'active');
    assert.deepEqual(await destinations(pending.id),[1,4]);
    await db.query('delete from public.job_sites where job_id=$1',[nursing.id]);
    const active = await save({actor:admin,isAdmin:true,job:nursing.id,site:null,payload:{status:'active'}});
    assert.equal(active.status,'active');
    assert.ok(active.published_at);
    assert.deepEqual(await destinations(nursing.id),[1,4]);
    assert.equal((await save({job:nursing.id,payload:{title:'Updated active position'}})).status,'active');
  });
  await t.test('audience-origin visibility remains when explicit audience is cleared', async () => {
    const job = await save({site:5,payload:content(201),audience:['newcomers']});
    assert.deepEqual(await destinations(job.id),[1,3,5,6]);
    await save({job:job.id,payload:{},audience:[]});
    assert.deepEqual(await destinations(job.id),[1,3,5]);
  });
  await t.test('merged salary checks and workplace normalization apply to partial edits', async () => {
    await fails(() => save({job:nursing.id,payload:{salary_max:10}}),'SALARY_RANGE_INVALID');
    const remote = await save({job:nursing.id,payload:{workplace_type:'remote',city:'Toronto',province:'Ontario'}});
    assert.equal(remote.is_remote,true); assert.equal(remote.city,null); assert.equal(remote.province,null);
    const onsite = await save({job:nursing.id,payload:{is_remote:false}});
    assert.equal(onsite.workplace_type,'onsite'); assert.equal(onsite.is_remote,false);
  });
  await t.test('actor role, company ownership, specialist category, and immutable fields cannot be bypassed', async () => {
    await fails(() => save({actor:stranger,job:nursing.id,payload:{title:'Unauthorized change'}}),'COMPANY_FORBIDDEN');
    await fails(() => save({actor:seeker,job:nursing.id,isAdmin:null,payload:{title:'Null admin bypass'}}),'JOB_FORBIDDEN');
    await fails(() => save({actor:recruiter,job:nursing.id,isAdmin:true,payload:{status:'removed'}}),'JOB_FORBIDDEN');
    await fails(() => save({payload:{...content(),company_id:company}}),'JOB_PAYLOAD_INVALID');
    await fails(() => save({site:3,payload:content(301)}),'SITE_CATEGORY_MISMATCH');
    assert.ok((await save({actor:admin,payload:content(201)})).id);
  });
  await t.test('historical inactive categories/config changes do not prevent close or admin removal', async () => {
    const job = await save({site:3,payload:content(201)});
    await db.exec('update public.categories set is_active=false where id=201');
    await db.exec('update public.category_sites set category_id=101 where category_id=201 and site_id=3');
    assert.equal((await save({job:job.id,payload:{status:'closed'}})).status,'closed');
    // Production allows closed->active->removed, not closed->removed.
    await save({job:job.id,payload:{status:'active'}});
    assert.equal((await save({job:job.id,actor:admin,isAdmin:true,site:null,payload:{status:'removed'}})).status,'removed');
    await fails(() => save({payload:content(201)}),'SITE_CATEGORY_MISMATCH');
    await db.exec('update public.categories set is_active=true where id=201');
    await db.exec('update public.category_sites set category_id=201 where category_id=101 and site_id=3');
  });
  await t.test('portal deactivate/reactivate and soft deletion reconcile visibility', async () => {
    await db.exec('update public.sites set is_active=false where id=4');
    assert.deepEqual(await destinations(nursing.id),[1]);
    await db.exec('update public.sites set is_active=true where id=4');
    assert.deepEqual(await destinations(nursing.id),[1,4]);
    await db.query("update public.jobs set deleted_at=now(),status='removed' where id=$1",[nursing.id]);
    assert.deepEqual(await destinations(nursing.id),[]);
  });
  await t.test('application duplicate index covers cross-portal and withdrawn applications; soft delete allows new row', async () => {
    const job = await save({payload:content(201)});
    await db.query('insert into public.applications(job_id,applicant_id) values($1,$2)',[job.id,seeker]);
    await assert.rejects(() => db.query('insert into public.applications(job_id,applicant_id) values($1,$2)',[job.id,seeker]),e=>e.code==='23505');
    await db.query("update public.applications set status='withdrawn' where job_id=$1",[job.id]);
    await assert.rejects(() => db.query('insert into public.applications(job_id,applicant_id) values($1,$2)',[job.id,seeker]),e=>e.code==='23505');
    await db.query('update public.applications set deleted_at=now() where job_id=$1',[job.id]);
    await db.query('insert into public.applications(job_id,applicant_id) values($1,$2)',[job.id,seeker]);
  });
  await t.test('notification preferences persist per user with expected defaults', async () => {
    await db.query('insert into public.notification_preferences(user_id) values($1)',[recruiter]);
    assert.deepEqual((await rows('select email_new_applicant,email_daily_summary,email_marketing from public.notification_preferences where user_id=$1',[recruiter]))[0],
      {email_new_applicant:true,email_daily_summary:false,email_marketing:false});
  });
  await t.test('post-migration preflight finds no visibility drift', async () => {
    const reports = await db.exec(preflight);
    const drift = reports.find(report => report.fields?.some(field => field.name==='issue'));
    assert.ok(drift);
    assert.deepEqual(drift.rows,[]);
  });
  await t.test('historical duplicate applications stop migration without deleting data', async () => {
    const job = await save({payload:content(201)});
    await db.exec('drop index public.applications_live_job_applicant_uidx');
    await db.query('insert into public.applications(job_id,applicant_id) values($1,$2),($1,$2)',[job.id,seeker]);
    await fails(() => db.exec(migration),'APPLICATION_DUPLICATES_REQUIRE_REVIEW');
    await db.exec('rollback');
    assert.equal((await rows('select count(*)::int as n from public.applications where job_id=$1',[job.id]))[0].n,2);
    await db.query('delete from public.applications where job_id=$1',[job.id]);
    await db.exec(migration);
  });
  await t.test('historical invalid salaries are preserved for review and new writes remain checked', async () => {
    const job = await save({payload:content(201)});
    await db.exec('alter table public.jobs drop constraint jobs_salary_range_valid');
    await db.query('update public.jobs set salary_max=1 where id=$1',[job.id]);
    await db.exec(migration);
    assert.equal((await rows("select convalidated from pg_constraint where conname='jobs_salary_range_valid'"))[0].convalidated,false);
    assert.equal(Number((await rows('select salary_max from public.jobs where id=$1',[job.id]))[0].salary_max),1);
    await assert.rejects(() => db.query('update public.jobs set salary_max=2 where id=$1',[job.id]),e=>e.code==='23514');
    await db.query('update public.jobs set salary_max=40 where id=$1',[job.id]);
    await db.exec(migration);
    assert.equal((await rows("select convalidated from pg_constraint where conname='jobs_salary_range_valid'"))[0].convalidated,true);
  });
});
await db.close();
