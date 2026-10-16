-- Atomic portal publishing and visibility repair. Apply after migrations 001-005.
-- Existing duplicate live applications stop this transaction for manual review.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Recompute from authoritative inputs; never infer ownership of an old mapping
-- from category_sites AFTER a mapping has already been removed.
create or replace function private.sync_job_sites(
  p_job_id uuid, p_category_id smallint, p_origin_site_id smallint
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_job public.jobs%rowtype;
  v_sites smallint[];
begin
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then return; end if;

  if v_job.deleted_at is null then
    select coalesce(array_agg(distinct destination.site_id), '{}'::smallint[])
      into v_sites
    from (
      select s.id as site_id from public.sites s
        where s.is_active and (s.slug = 'jooblie' or s.id = v_job.origin_site_id)
      union
      select cs.site_id from public.category_sites cs
        join public.sites s on s.id = cs.site_id and s.is_active
        where cs.category_id = v_job.category_id
      union
      select jas.site_id from public.job_audience_sites jas
        join public.sites s on s.id = jas.site_id and s.is_active
        where jas.job_id = v_job.id
    ) destination;
  else
    v_sites := '{}'::smallint[];
  end if;

  delete from public.job_sites where job_id = v_job.id
    and not (site_id = any(v_sites));
  insert into public.job_sites(job_id, site_id)
    select v_job.id, unnest(v_sites)
    on conflict (job_id, site_id) do nothing;
end;
$$;
revoke all on function private.sync_job_sites(uuid, smallint, smallint) from public, anon, authenticated;

create or replace function private.trg_sync_job_sites()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
begin
  perform private.sync_job_sites(new.id, new.category_id, new.origin_site_id);
  return new;
end;
$$;
revoke all on function private.trg_sync_job_sites() from public, anon, authenticated;
drop trigger if exists trg_jobs_sync_sites on public.jobs;
create trigger trg_jobs_sync_sites
after insert or update of category_id, origin_site_id, status, published_at, deleted_at
on public.jobs for each row execute function private.trg_sync_job_sites();

-- Serialize direct targeting edits with job writes, including Table Editor edits.
create or replace function private.validate_job_audience_site()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op = 'UPDATE' and old.job_id is distinct from new.job_id then
    perform 1 from public.jobs where id in (old.job_id, new.job_id) order by id for update;
  else
    perform 1 from public.jobs where id = case when tg_op = 'DELETE' then old.job_id else new.job_id end for update;
  end if;
  if tg_op <> 'DELETE' and not exists (
    select 1 from public.sites where id = new.site_id
      and slug in ('aboriginal', 'newcomers') and is_active
  ) then
    raise exception using errcode = '22023', message = 'AUDIENCE_SITE_INVALID';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.validate_job_audience_site() from public, anon, authenticated;
drop trigger if exists trg_validate_job_audience_site on public.job_audience_sites;
create trigger trg_validate_job_audience_site
before insert or update or delete on public.job_audience_sites
for each row execute function private.validate_job_audience_site();

create or replace function private.trg_resync_audience_jobs()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.sync_job_sites(old.job_id, null, null);
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.job_id is distinct from old.job_id) then
    perform private.sync_job_sites(new.job_id, null, null);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.trg_resync_audience_jobs() from public, anon, authenticated;
drop trigger if exists trg_add_job_audience_visibility on public.job_audience_sites;
drop trigger if exists trg_remove_job_audience_visibility on public.job_audience_sites;
drop trigger if exists trg_job_audience_resync_jobs on public.job_audience_sites;
create trigger trg_job_audience_resync_jobs after insert or update or delete
on public.job_audience_sites for each row execute function private.trg_resync_audience_jobs();

create or replace function private.trg_resync_category_jobs()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare v_job record;
begin
  for v_job in
    select id from public.jobs
    where category_id in (
      case when tg_op <> 'INSERT' then old.category_id end,
      case when tg_op <> 'DELETE' then new.category_id end
    ) order by id
  loop
    perform private.sync_job_sites(v_job.id, null, null);
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.trg_resync_category_jobs() from public, anon, authenticated;
drop trigger if exists trg_category_sites_resync_jobs on public.category_sites;
create trigger trg_category_sites_resync_jobs after insert or update or delete
on public.category_sites for each row execute function private.trg_resync_category_jobs();

create or replace function private.trg_resync_portal_jobs()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare v_job record;
begin
  if new.is_active is not distinct from old.is_active and new.slug is not distinct from old.slug then
    return new;
  end if;
  for v_job in select id from public.jobs order by id loop
    perform private.sync_job_sites(v_job.id, null, null);
  end loop;
  return new;
end;
$$;
revoke all on function private.trg_resync_portal_jobs() from public, anon, authenticated;
drop trigger if exists trg_sites_resync_jobs on public.sites;
create trigger trg_sites_resync_jobs after update of is_active, slug on public.sites
for each row execute function private.trg_resync_portal_jobs();

-- Service-role API: p_job_id NULL creates; audience NULL preserves existing
-- targeting on update, [] clears explicit targeting. Audience-origin membership
-- remains implicit via origin_site_id. No caller can change company/origin/actor.
create or replace function public.save_portal_job(
  p_actor_id uuid,
  p_job_id uuid,
  p_site_id smallint,
  p_payload jsonb,
  p_audience_slugs text[] default null,
  p_is_admin boolean default false
)
returns setof public.jobs language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor public.profiles%rowtype;
  v_job public.jobs%rowtype;
  v_next public.jobs%rowtype;
  v_source public.sites%rowtype;
  v_company uuid;
  v_company_count integer;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_status text;
  v_audience_ids smallint[];
begin
  p_is_admin := coalesce(p_is_admin, false);
  if jsonb_typeof(v_payload) <> 'object' or exists (
    select 1 from jsonb_object_keys(v_payload) k
    where k not in ('title','category_id','province','city','is_remote',
      'workplace_type','experience_level','salary_min','salary_max','salary_currency',
      'salary_period','employment_type','skills','description','status','removed_reason')
  ) then
    raise exception using errcode = '22023', message = 'JOB_PAYLOAD_INVALID';
  end if;
  select * into v_actor from public.profiles where id = p_actor_id;
  if not found or v_actor.status::text <> 'active' then
    raise exception using errcode = '42501', message = 'ACTOR_INACTIVE';
  end if;
  if (p_is_admin and v_actor.role::text <> 'admin') or
     (not p_is_admin and v_actor.role::text not in ('recruiter','admin')) then
    raise exception using errcode = '42501', message = 'JOB_FORBIDDEN';
  end if;
  if not p_is_admin and v_payload ? 'removed_reason' then
    raise exception using errcode = '42501', message = 'JOB_FORBIDDEN';
  end if;

  if p_job_id is null then
    if p_is_admin then
      raise exception using errcode = '42501', message = 'JOB_FORBIDDEN';
    end if;
    v_company := v_actor.recruiter_company_id;
    if v_company is null then
      select count(*), (array_agg(company_id))[1] into v_company_count, v_company
      from public.company_members where user_id = p_actor_id;
      if v_company_count <> 1 then
        raise exception using errcode = '42501', message = 'COMPANY_FORBIDDEN';
      end if;
    end if;
    v_job.workplace_type := 'onsite';
    v_job.experience_level := 'mid_level';
    v_job.is_remote := false;
    v_job.salary_currency := 'CAD';
    v_job.skills := '{}'::text[];
    v_job.status := 'active';
    v_job.published_at := now();
    v_job.origin_site_id := p_site_id;
    v_job.company_id := v_company;
    v_job.created_by := p_actor_id;
  else
    select * into v_job from public.jobs where id = p_job_id and deleted_at is null for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'JOB_NOT_FOUND';
    end if;
    v_company := v_job.company_id;
  end if;

  if not p_is_admin and not exists (
    select 1 from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.user_id = p_actor_id and cm.company_id = v_company
      and c.status::text = 'active' and c.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'COMPANY_FORBIDDEN';
  end if;
  if (not p_is_admin and p_site_id is null) or (p_site_id is not null and not exists (select 1 from public.sites where id = p_site_id and is_active)) then
    raise exception using errcode = '22023', message = 'SOURCE_SITE_INVALID';
  end if;
  select * into v_source from public.sites where id = v_job.origin_site_id;
  if not found or (p_job_id is null and not v_source.is_active) then
    raise exception using errcode = '22023', message = 'SOURCE_SITE_INVALID';
  end if;
  if p_job_id is null and not exists (select 1 from public.sites where slug = 'jooblie' and is_active) then
    raise exception using errcode = '22023', message = 'SOURCE_SITE_INVALID';
  end if;

  begin
    v_next := jsonb_populate_record(v_job, v_payload);
  exception when invalid_text_representation or numeric_value_out_of_range or datatype_mismatch then
    raise exception using errcode = '22023', message = 'JOB_PAYLOAD_INVALID';
  end;
  if v_next.title is null or length(btrim(v_next.title)) not between 3 and 180
     or v_next.description is null or length(btrim(v_next.description)) not between 20 and 30000
     or v_next.employment_type is null or v_next.workplace_type is null
     or v_next.experience_level is null or v_next.skills is null
     or v_next.status is null or v_next.salary_currency is null
     or length(btrim(v_next.salary_currency::text)) <> 3
     or v_next.workplace_type not in ('onsite','hybrid','remote')
     or v_next.experience_level not in ('entry_level','mid_level','senior','executive') then
    raise exception using errcode = '22023', message = 'JOB_PAYLOAD_INVALID';
  end if;
  -- Historical category/config changes must not block closing or moderation.
  -- Validate active category and origin compatibility when selecting a category.
  if p_job_id is null or v_next.category_id is distinct from v_job.category_id then
    if not exists (select 1 from public.categories where id = v_next.category_id and is_active) then
      raise exception using errcode = '22023', message = 'SITE_CATEGORY_MISMATCH';
    end if;
    if v_source.site_type::text not in ('aggregator','audience') then
      if exists (select 1 from public.category_sites where site_id = v_source.id) then
        if not exists (select 1 from public.category_sites where site_id = v_source.id and category_id = v_next.category_id) then
          raise exception using errcode = '22023', message = 'SITE_CATEGORY_MISMATCH';
        end if;
      elsif v_source.sector_id is null or not exists (
        select 1 from public.categories where id = v_next.category_id and sector_id = v_source.sector_id
      ) then
        raise exception using errcode = '22023', message = 'SITE_CATEGORY_MISMATCH';
      end if;
    end if;
  end if;
  if v_next.salary_min < 0 or v_next.salary_max < 0 or
    (v_next.salary_min is not null and v_next.salary_max is not null and v_next.salary_max < v_next.salary_min) then
    raise exception using errcode = '23514', message = 'SALARY_RANGE_INVALID';
  end if;
  if v_payload ? 'is_remote' and not (v_payload ? 'workplace_type') then
    if v_next.is_remote is null then
      raise exception using errcode = '22023', message = 'JOB_PAYLOAD_INVALID';
    end if;
    v_next.workplace_type := case when v_next.is_remote then 'remote' else 'onsite' end;
  end if;
  v_next.is_remote := v_next.workplace_type = 'remote';
  if v_next.is_remote then v_next.city := null; v_next.province := null; end if;
  v_next.title := btrim(v_next.title);
  v_next.salary_currency := upper(v_next.salary_currency);

  v_status := v_next.status::text;
  if not p_is_admin and v_status not in ('active','closed') then
    raise exception using errcode = '42501', message = 'JOB_FORBIDDEN';
  end if;
  if p_job_id is null then
    v_next.status := 'active';
    v_next.published_at := now();
  elsif v_status = 'active' then
    if v_job.status::text <> 'active' or v_job.published_at is null then v_next.published_at := now(); end if;
    v_next.removed_reason := null;
  elsif v_status = 'pending_review' then
    v_next.published_at := null;
    v_next.removed_reason := null;
  elsif v_status = 'removed' then
    v_next.removed_reason := coalesce(nullif(btrim(v_next.removed_reason), ''), 'Removed by administrator');
  end if;

  -- Resolve the entire audience BEFORE any write; unknown/inactive portals fail
  -- atomically. The function call is one PostgreSQL transaction with the job write.
  if p_audience_slugs is not null then
    if exists (select 1 from unnest(p_audience_slugs) x where x is null or x not in ('aboriginal','newcomers'))
       or exists (select 1 from unnest(p_audience_slugs) x where not exists (
         select 1 from public.sites where slug = x and is_active
       )) then
      raise exception using errcode = '22023', message = 'AUDIENCE_SITE_INVALID';
    end if;
    select coalesce(array_agg(distinct id), '{}'::smallint[]) into v_audience_ids
      from public.sites where slug = any(p_audience_slugs) and is_active;
  end if;

  if p_job_id is null then
    insert into public.jobs(company_id,origin_site_id,created_by,category_id,title,description,
      province,city,is_remote,salary_min,salary_max,salary_currency,salary_period,
      employment_type,workplace_type,experience_level,skills,status,published_at)
    values(v_company,v_job.origin_site_id,p_actor_id,v_next.category_id,v_next.title,v_next.description,
      v_next.province,v_next.city,v_next.is_remote,v_next.salary_min,v_next.salary_max,
      v_next.salary_currency,v_next.salary_period,v_next.employment_type,v_next.workplace_type,
      v_next.experience_level,v_next.skills,'active',v_next.published_at)
    returning * into v_job;
    -- Existing projects may have a BEFORE INSERT trigger deriving pending_review
    -- for unverified companies. Preserve the API's active-publishing policy in
    -- this same transaction, using the existing permitted pending->active path.
    if v_job.status::text <> 'active' then
      update public.jobs set status='active',published_at=coalesce(v_job.published_at,now()),updated_at=now()
        where id=v_job.id returning * into v_job;
    end if;
  else
    update public.jobs set category_id=v_next.category_id,title=v_next.title,description=v_next.description,
      province=v_next.province,city=v_next.city,is_remote=v_next.is_remote,
      salary_min=v_next.salary_min,salary_max=v_next.salary_max,salary_currency=v_next.salary_currency,
      salary_period=v_next.salary_period,employment_type=v_next.employment_type,
      workplace_type=v_next.workplace_type,experience_level=v_next.experience_level,skills=v_next.skills,
      status=v_next.status,published_at=v_next.published_at,removed_reason=v_next.removed_reason,updated_at=now()
    where id=v_job.id returning * into v_job;
  end if;
  if p_audience_slugs is not null then
    delete from public.job_audience_sites where job_id=v_job.id and not (site_id=any(v_audience_ids));
    insert into public.job_audience_sites(job_id,site_id)
      select v_job.id,unnest(v_audience_ids) on conflict (job_id,site_id) do nothing;
  end if;
  perform private.sync_job_sites(v_job.id,v_job.category_id,v_job.origin_site_id);
  return next v_job;
end;
$$;
revoke all on function public.save_portal_job(uuid,uuid,smallint,jsonb,text[],boolean) from public, anon, authenticated;
grant execute on function public.save_portal_job(uuid,uuid,smallint,jsonb,text[],boolean) to service_role;

-- No automatic deletion/merging of application history. Withdrawn applications
-- continue to reserve the applicant/job pair; only soft-deleted rows release it.
do $$
begin
  if exists (select 1 from public.applications where deleted_at is null
    group by job_id,applicant_id having count(*) > 1) then
    raise exception 'APPLICATION_DUPLICATES_REQUIRE_REVIEW: resolve duplicate nondeleted applicant/job pairs before applying migration 006';
  end if;
end;
$$;
create unique index if not exists applications_live_job_applicant_uidx
  on public.applications(job_id,applicant_id) where deleted_at is null;
create index if not exists job_sites_site_job_idx on public.job_sites(site_id,job_id);
create index if not exists category_sites_site_category_idx on public.category_sites(site_id,category_id);
create index if not exists job_audience_sites_site_job_idx on public.job_audience_sites(site_id,job_id);
create index if not exists jobs_live_category_idx on public.jobs(category_id) where deleted_at is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.jobs'::regclass and conname='jobs_salary_range_valid') then
    alter table public.jobs add constraint jobs_salary_range_valid
      check (salary_min is null or salary_max is null or salary_max >= salary_min) not valid;
  end if;
  if exists (select 1 from public.jobs where salary_min is not null and salary_max is not null and salary_max < salary_min) then
    raise notice 'Historical invalid salary ranges require review; constraint enforces new writes and remains NOT VALID';
  else
    alter table public.jobs validate constraint jobs_salary_range_valid;
  end if;
end;
$$;

-- Restore private resumes; preserve existing owner policies from migration 002.
update storage.buckets set public=false where id='resumes';
do $$
begin
  if not exists (select 1 from storage.buckets where id='resumes') then
    raise exception 'RESUME_BUCKET_MISSING: apply migration 002 first';
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='resumes_select_own') then
    raise exception 'RESUME_OWNER_POLICY_MISSING: review/apply migration 002 first';
  end if;
end;
$$;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_new_applicant boolean not null default true,
  email_daily_summary boolean not null default false,
  email_marketing boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public,anon,authenticated;
grant select,insert,update on public.notification_preferences to service_role;

-- Repair visibility only. Pending review/removed jobs are not silently published.
do $$
declare v_job record;
begin
  for v_job in select id,category_id,origin_site_id from public.jobs order by id loop
    perform private.sync_job_sites(v_job.id,v_job.category_id,v_job.origin_site_id);
  end loop;
end;
$$;
notify pgrst, 'reload schema';
commit;
