-- Jooblie shared-backend alignment migration
-- Target: the EXISTING Supabase schema used by Jooblie/jobline portals.
-- Safe to run more than once. It does not recreate profiles/jobs/companies/etc.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1) Canonical category -> portal mappings
-- -----------------------------------------------------------------------------
-- Jooblie receives every category.
insert into public.category_sites (category_id, site_id)
select c.id, s.id
from public.categories c
join public.sites s on s.slug = 'jooblie'
where c.is_active = true
on conflict do nothing;

-- Office receives sector 1.
insert into public.category_sites (category_id, site_id)
select c.id, s.id
from public.categories c
join public.sites s on s.slug = 'office-jobs'
where c.sector_id = 1 and c.is_active = true
on conflict do nothing;

-- IT receives sector 2.
insert into public.category_sites (category_id, site_id)
select c.id, s.id
from public.categories c
join public.sites s on s.slug = 'it-jobs'
where c.sector_id = 2 and c.is_active = true
on conflict do nothing;

-- Health Care receives clinical/care categories 301-304.
insert into public.category_sites (category_id, site_id)
select c.id, s.id
from public.categories c
join public.sites s on s.slug = 'health-care'
where c.slug in ('healthcare-clinical', 'nursing', 'allied-health', 'caregiving-support')
  and c.is_active = true
on conflict do nothing;

-- ServiceCare receives hospitality/service categories 305-308.
insert into public.category_sites (category_id, site_id)
select c.id, s.id
from public.categories c
join public.sites s on s.slug = 'service-care'
where c.slug in ('hospitality-guest-services', 'food-beverage', 'housekeeping-facilities', 'recreation-wellness')
  and c.is_active = true
on conflict do nothing;

-- FarmerFreight receives sector 4.
insert into public.category_sites (category_id, site_id)
select c.id, s.id
from public.categories c
join public.sites s on s.slug = 'farmerfreight'
where c.sector_id = 4 and c.is_active = true
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 2) Audience targeting table (Aboriginal / Newcomers)
-- -----------------------------------------------------------------------------
create table if not exists public.job_audience_sites (
  job_id uuid not null references public.jobs(id) on delete cascade,
  site_id smallint not null references public.sites(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (job_id, site_id)
);

alter table public.job_audience_sites enable row level security;
revoke all on public.job_audience_sites from public, anon, authenticated;
grant all on public.job_audience_sites to service_role;

create or replace function private.validate_job_audience_site()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_slug text;
begin
  select slug into v_slug from public.sites where id = new.site_id;
  if v_slug is null then
    raise exception 'Audience site does not exist';
  end if;
  if v_slug not in ('aboriginal', 'newcomers') then
    raise exception 'Site % is not an audience portal', v_slug;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_job_audience_site() from public, anon, authenticated;

drop trigger if exists trg_validate_job_audience_site on public.job_audience_sites;
create trigger trg_validate_job_audience_site
before insert or update on public.job_audience_sites
for each row execute function private.validate_job_audience_site();

create or replace function private.add_job_audience_visibility()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  insert into public.job_sites (job_id, site_id)
  values (new.job_id, new.site_id)
  on conflict (job_id, site_id) do nothing;
  return new;
end;
$$;

revoke all on function private.add_job_audience_visibility() from public, anon, authenticated;

drop trigger if exists trg_add_job_audience_visibility on public.job_audience_sites;
create trigger trg_add_job_audience_visibility
after insert on public.job_audience_sites
for each row execute function private.add_job_audience_visibility();

create or replace function private.remove_job_audience_visibility()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_origin_site_id smallint;
  v_category_id smallint;
  v_jooblie_site_id smallint;
begin
  select origin_site_id, category_id
  into v_origin_site_id, v_category_id
  from public.jobs
  where id = old.job_id;

  select id into v_jooblie_site_id
  from public.sites
  where slug = 'jooblie'
  limit 1;

  if old.site_id = v_jooblie_site_id or old.site_id = v_origin_site_id then
    return old;
  end if;

  if exists (
    select 1 from public.category_sites cs
    where cs.category_id = v_category_id and cs.site_id = old.site_id
  ) then
    return old;
  end if;

  if exists (
    select 1 from public.job_audience_sites jas
    where jas.job_id = old.job_id and jas.site_id = old.site_id
  ) then
    return old;
  end if;

  delete from public.job_sites
  where job_id = old.job_id and site_id = old.site_id;
  return old;
end;
$$;

revoke all on function private.remove_job_audience_visibility() from public, anon, authenticated;

drop trigger if exists trg_remove_job_audience_visibility on public.job_audience_sites;
create trigger trg_remove_job_audience_visibility
after delete on public.job_audience_sites
for each row execute function private.remove_job_audience_visibility();

-- -----------------------------------------------------------------------------
-- 3) One jobs row -> Jooblie + origin + category portals
-- -----------------------------------------------------------------------------
create or replace function private.sync_job_sites(
  p_job_id uuid,
  p_category_id smallint,
  p_origin_site_id smallint
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_jooblie_site_id smallint;
begin
  select id into v_jooblie_site_id
  from public.sites
  where slug = 'jooblie' and is_active = true
  limit 1;

  if v_jooblie_site_id is null then
    raise exception 'Jooblie site configuration is missing';
  end if;

  -- Remove the old auto-controlled destination set. Audience-only mappings are
  -- intentionally left alone and are managed by job_audience_sites triggers.
  delete from public.job_sites js
  where js.job_id = p_job_id
    and (
      js.site_id = v_jooblie_site_id
      or exists (select 1 from public.category_sites cs where cs.site_id = js.site_id)
    );

  insert into public.job_sites (job_id, site_id)
  values (p_job_id, v_jooblie_site_id)
  on conflict (job_id, site_id) do nothing;

  insert into public.job_sites (job_id, site_id)
  values (p_job_id, p_origin_site_id)
  on conflict (job_id, site_id) do nothing;

  insert into public.job_sites (job_id, site_id)
  select p_job_id, cs.site_id
  from public.category_sites cs
  join public.sites s on s.id = cs.site_id and s.is_active = true
  where cs.category_id = p_category_id
  on conflict (job_id, site_id) do nothing;
end;
$$;

revoke all on function private.sync_job_sites(uuid, smallint, smallint) from public, anon, authenticated;

create or replace function private.trg_sync_job_sites()
returns trigger
language plpgsql
security definer
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
after insert or update of category_id, origin_site_id on public.jobs
for each row execute function private.trg_sync_job_sites();

-- If category_sites config changes, existing jobs for that category are re-synced.
create or replace function private.trg_resync_category_jobs()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_category_id smallint;
  v_job record;
begin
  v_category_id := case when tg_op = 'DELETE' then old.category_id else new.category_id end;
  for v_job in
    select id, category_id, origin_site_id
    from public.jobs
    where category_id = v_category_id and deleted_at is null
  loop
    perform private.sync_job_sites(v_job.id, v_job.category_id, v_job.origin_site_id);
  end loop;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.trg_resync_category_jobs() from public, anon, authenticated;

drop trigger if exists trg_category_sites_resync_jobs on public.category_sites;
create trigger trg_category_sites_resync_jobs
after insert or delete on public.category_sites
for each row execute function private.trg_resync_category_jobs();

-- Backfill all current jobs.
do $$
declare
  v_job record;
begin
  for v_job in
    select id, category_id, origin_site_id
    from public.jobs
    where deleted_at is null
  loop
    perform private.sync_job_sites(v_job.id, v_job.category_id, v_job.origin_site_id);
  end loop;
end;
$$;

-- Reapply audience visibility after backfill.
insert into public.job_sites (job_id, site_id)
select job_id, site_id from public.job_audience_sites
on conflict (job_id, site_id) do nothing;

-- -----------------------------------------------------------------------------
-- 4) Privacy-preserving per-day job view de-duplication
-- -----------------------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.job_views
  add column if not exists viewer_hash text;

create unique index if not exists job_views_daily_fingerprint_uidx
  on public.job_views (job_id, site_id, viewer_hash, viewed_on)
  where viewer_hash is not null;

create or replace function public.increment_job_view(
  target_job_id uuid,
  viewer_site_id smallint,
  viewer_ip text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_hash text;
begin
  if viewer_ip is null or btrim(viewer_ip) = '' then
    v_hash := encode(digest('unknown', 'sha256'), 'hex');
  else
    v_hash := encode(digest(viewer_ip, 'sha256'), 'hex');
  end if;

  insert into public.job_views (job_id, viewer_id, viewed_on, site_id, viewer_hash)
  values (target_job_id, null, current_date, viewer_site_id, v_hash)
  on conflict (job_id, site_id, viewer_hash, viewed_on)
    where viewer_hash is not null
  do nothing;
end;
$$;

revoke all on function public.increment_job_view(uuid, smallint, text) from public, anon, authenticated;
grant execute on function public.increment_job_view(uuid, smallint, text) to service_role;

-- -----------------------------------------------------------------------------
-- 5) Operational security event log used by rate-limit/auth middleware
-- -----------------------------------------------------------------------------
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  event_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  request_id text null,
  client_ip text null,
  server_ip text null,
  site_id smallint null references public.sites(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_at_idx on public.security_events (created_at desc);
create index if not exists security_events_type_created_idx on public.security_events (event_type, created_at desc);
create index if not exists security_events_severity_created_idx on public.security_events (severity, created_at desc);

alter table public.security_events enable row level security;
revoke all on public.security_events from public, anon, authenticated;
grant all on public.security_events to service_role;

commit;
