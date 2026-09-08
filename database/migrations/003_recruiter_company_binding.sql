-- Bind each recruiter account to the company created during recruiter signup.
begin;

alter table public.profiles
  add column if not exists recruiter_company_id uuid null references public.companies(id) on delete set null;

create index if not exists profiles_recruiter_company_idx
  on public.profiles(recruiter_company_id)
  where recruiter_company_id is not null;

-- Job-board metadata used by the professional posting form.
alter table public.jobs add column if not exists workplace_type text not null default 'onsite';
alter table public.jobs add column if not exists experience_level text not null default 'mid_level';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_workplace_type_chk') then
    alter table public.jobs add constraint jobs_workplace_type_chk check (workplace_type in ('onsite','hybrid','remote'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'jobs_experience_level_chk') then
    alter table public.jobs add constraint jobs_experience_level_chk check (experience_level in ('entry_level','mid_level','senior','executive'));
  end if;
end $$;

-- A recruiter can own exactly one signup company. Existing multi-company memberships remain
-- supported for legacy accounts, but new job creation is bound to recruiter_company_id.
comment on column public.profiles.recruiter_company_id is
  'Primary company bound to a recruiter account at signup; job postings cannot change company ownership.';

commit;
