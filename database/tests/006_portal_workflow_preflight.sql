-- READ ONLY. Run before and after migration 006 in Supabase SQL Editor.
-- Catalog output can contain project structure, but never selects API keys/users'
-- email addresses, resumes, application text, or other private document contents.

-- 1. Portal configuration and current publication states.
select id,slug,domain,site_type,is_active from public.sites order by id;
select status, (deleted_at is not null) as soft_deleted,count(*) as jobs,
  count(*) filter (where published_at is null) as without_publish_timestamp
from public.jobs group by status,(deleted_at is not null) order by status,soft_deleted;

-- 2. Existing FK delete behavior, application uniqueness, salary checks.
select conrelid::regclass as table_name,conname,contype,convalidated,
  pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid in
  ('public.jobs'::regclass,'public.job_sites'::regclass,
   'public.job_audience_sites'::regclass,'public.applications'::regclass)
order by conrelid::regclass::text,conname;
select tablename,indexname,indexdef from pg_indexes
where schemaname='public' and tablename in
  ('jobs','job_sites','category_sites','job_audience_sites','applications')
order by tablename,indexname;
select job_id,applicant_id,count(*) as duplicate_count
from public.applications where deleted_at is null
group by job_id,applicant_id having count(*)>1;
select id,salary_min,salary_max from public.jobs
where salary_min is not null and salary_max is not null and salary_max<salary_min;

-- 3. Installed trigger/function definitions (inspect unexpected legacy triggers).
select t.tgrelid::regclass as table_name,t.tgname,t.tgenabled,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t where not t.tgisinternal and t.tgrelid in
  ('public.jobs'::regclass,'public.job_audience_sites'::regclass,
   'public.category_sites'::regclass,'public.sites'::regclass)
order by t.tgrelid::regclass::text,t.tgname;
select n.nspname as schema_name,p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef,
  p.proconfig,p.proacl,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='private' and p.proname in
  ('sync_job_sites','trg_sync_job_sites','validate_job_audience_site',
   'trg_resync_audience_jobs','trg_resync_category_jobs','trg_resync_portal_jobs'))
  or (n.nspname='public' and p.proname='save_portal_job')
order by n.nspname,p.proname;

-- 4. Storage privacy and owner policy. Preserve/inspect owner scope; do not rerun
-- old migrations merely to change the public bucket flag.
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='resumes';
select policyname,permissive,roles,cmd,qual,with_check from pg_policies
where schemaname='storage' and tablename='objects' order by policyname;

-- 5. Visibility drift under the exact target rule used by migration 006.
with expected as (
  select j.id as job_id,s.id as site_id from public.jobs j join public.sites s
    on s.is_active and (s.slug='jooblie' or s.id=j.origin_site_id)
    where j.deleted_at is null
  union
  select j.id,cs.site_id from public.jobs j
    join public.category_sites cs on cs.category_id=j.category_id
    join public.sites s on s.id=cs.site_id and s.is_active where j.deleted_at is null
  union
  select j.id,jas.site_id from public.jobs j
    join public.job_audience_sites jas on jas.job_id=j.id
    join public.sites s on s.id=jas.site_id and s.is_active where j.deleted_at is null
), drift as (
  select coalesce(e.job_id,a.job_id) as job_id,coalesce(e.site_id,a.site_id) as site_id,
    case when e.job_id is null then 'unexpected_mapping' else 'missing_mapping' end as issue
  from expected e full join public.job_sites a on a.job_id=e.job_id and a.site_id=e.site_id
  where e.job_id is null or a.job_id is null
)
select * from drift order by site_id,job_id limit 200;

-- 6. RPC/table privilege checks. NULL means the new function is not installed.
select r.rolname,
  has_function_privilege(r.rolname,
    to_regprocedure('public.save_portal_job(uuid,uuid,smallint,jsonb,text[],boolean)'),
    'EXECUTE') as save_job_allowed
from pg_roles r where r.rolname in ('anon','authenticated','service_role') order by r.rolname;
select c.relname,c.relrowsecurity,c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('notification_preferences','job_audience_sites');
select column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='public' and table_name='notification_preferences'
order by ordinal_position;
