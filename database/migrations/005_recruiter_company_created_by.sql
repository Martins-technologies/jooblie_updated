-- Recruiter company creation compatibility fix.
-- Existing deployments may already have companies.created_by as NOT NULL.
-- Both signup and manual company creation now always populate it from auth user id.
-- This migration only documents/guards the expected column and index.
begin;

alter table public.companies
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists companies_created_by_idx on public.companies(created_by);

commit;
