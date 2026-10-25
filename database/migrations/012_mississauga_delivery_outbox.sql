-- Prepared only: apply after review. No historical leads are emailed/backfilled.
begin;

create table public.mississauga_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  sequence bigint generated always as identity unique,
  registration_id uuid not null references public.mississauga_registrations(id) on delete cascade,
  kind text not null check (kind in ('crm', 'receipt')),
  status text not null default 'pending' check (status in ('pending','processing','delivered','dead','superseded')),
  -- Only receipt recipient and first name are snapshotted for stable retries.
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  locked_until timestamptz,
  lock_token uuid,
  last_error_code text,
  provider_id text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create unique index mississauga_one_receipt on public.mississauga_delivery_jobs(registration_id) where kind = 'receipt';
create index mississauga_delivery_due on public.mississauga_delivery_jobs(kind, available_at) where status in ('pending','processing');
alter table public.mississauga_delivery_jobs enable row level security;
revoke all on public.mississauga_delivery_jobs from public, anon, authenticated;
grant all on public.mississauga_delivery_jobs to service_role;

create function public.enqueue_mississauga_deliveries() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Consent/contact updates supersede unsent CRM work. Running deliveries finish
  -- before the latest revision can be claimed for this registration.
  update public.mississauga_delivery_jobs set status = 'superseded'
   where registration_id = new.id and kind = 'crm' and status in ('pending','dead');
  insert into public.mississauga_delivery_jobs(registration_id, kind) values(new.id, 'crm');
  if tg_op = 'INSERT' then
    insert into public.mississauga_delivery_jobs(registration_id, kind, payload)
    values(new.id, 'receipt', jsonb_build_object('email', new.email, 'first_name', split_part(btrim(new.full_name), ' ', 1)));
  end if;
  return new;
end;
$$;
create trigger mississauga_enqueue_delivery after insert or update of
  full_name, email, phone_e164, current_city, employment_goal, preferred_industry,
  employer_sharing_consent, marketing_consent, consent_version, source_context
on public.mississauga_registrations for each row execute function public.enqueue_mississauga_deliveries();

create function public.claim_mississauga_deliveries(p_kinds text[], p_limit integer default 5)
returns setof public.mississauga_delivery_jobs
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Crashed workers must not create an unbounded delivery loop.
  update public.mississauga_delivery_jobs set status = 'dead', locked_until = null,
    lock_token = null, last_error_code = 'WORKER_LEASE_EXHAUSTED'
   where kind = any(p_kinds) and attempts >= 8 and status = 'processing' and locked_until < now();
  return query
  with candidates as (
    select j.id from public.mississauga_delivery_jobs j
    where j.kind = any(p_kinds) and (
      (j.status = 'pending' and j.available_at <= now()) or
      (j.status = 'processing' and j.locked_until < now())
    ) and not exists (
      select 1 from public.mississauga_delivery_jobs other
      where other.registration_id = j.registration_id and other.kind = j.kind
        and other.id <> j.id and other.status = 'processing'
    )
    order by j.created_at, j.id for update skip locked limit greatest(1, least(p_limit, 10))
  )
  update public.mississauga_delivery_jobs j
     set status = 'processing', attempts = attempts + 1, locked_until = now() + interval '5 minutes',
         first_attempt_at = coalesce(first_attempt_at, now()), lock_token = gen_random_uuid()
   from candidates c where j.id = c.id returning j.*;
end;
$$;

create function public.finish_mississauga_delivery(p_id uuid, p_token uuid, p_success boolean, p_code text default null, p_provider_id text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare job public.mississauga_delivery_jobs; obsolete boolean;
begin
  select * into job from public.mississauga_delivery_jobs where id = p_id and lock_token = p_token and status = 'processing' for update;
  if not found then return false; end if;
  select exists(select 1 from public.mississauga_delivery_jobs j where j.registration_id = job.registration_id and j.kind = 'crm' and j.sequence > job.sequence and j.status = 'pending') into obsolete;
  update public.mississauga_delivery_jobs set
    status = case when p_success then 'delivered' when job.kind = 'crm' and obsolete then 'superseded'
      when job.attempts >= 8 or p_code = 'RECEIPT_REVIEW_REQUIRED' then 'dead' else 'pending' end,
    available_at = now() + make_interval(secs => least(21600, (60 * power(2, least(job.attempts, 9)))::integer)),
    locked_until = null, lock_token = null,
    last_error_code = case when p_success then null else left(coalesce(p_code, 'DELIVERY_FAILED'), 80) end,
    provider_id = case when p_success then left(p_provider_id, 200) else provider_id end,
    delivered_at = case when p_success then now() else null end
   where id = p_id;
  return true;
end;
$$;

revoke all on function public.enqueue_mississauga_deliveries() from public, anon, authenticated;
revoke all on function public.claim_mississauga_deliveries(text[],integer) from public, anon, authenticated;
revoke all on function public.finish_mississauga_delivery(uuid,uuid,boolean,text,text) from public, anon, authenticated;
grant execute on function public.claim_mississauga_deliveries(text[],integer) to service_role;
grant execute on function public.finish_mississauga_delivery(uuid,uuid,boolean,text,text) to service_role;
commit;
