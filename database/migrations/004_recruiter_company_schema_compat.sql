-- Recruiter company bootstrap compatibility migration.
-- Run this after 003_recruiter_company_binding.sql. Idempotent.
begin;

-- The application needs these company fields for recruiter onboarding and job ownership.
alter table public.companies
  add column if not exists registration_number text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists verification_document_path text,
  add column if not exists logo_path text,
  add column if not exists description text,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists status text not null default 'active',
  add column if not exists deleted_at timestamptz;

create index if not exists companies_created_by_idx on public.companies(created_by);
create index if not exists companies_registration_number_idx on public.companies(registration_number)
  where registration_number is not null;

-- Prevent blank registration values while allowing legacy rows with nulls.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_registration_number_not_blank'
  ) then
    alter table public.companies
      add constraint companies_registration_number_not_blank
      check (registration_number is null or length(trim(registration_number)) >= 2);
  end if;
end $$;

-- Make the signup operation work with the canonical company_members ownership model.
-- A recruiter must be represented as an owner member for their bound company.
create unique index if not exists company_members_one_owner_per_user_idx
  on public.company_members(user_id) where role = 'owner';

commit;
