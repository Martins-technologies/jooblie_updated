-- Forward-only security repair for the existing Jooblie schema. No data rows are changed.
begin;
set local lock_timeout = '5s';

-- Remove table- and column-level write grants before restoring supported profile edits.
revoke insert, update, delete, truncate, trigger on public.profiles from public, anon, authenticated;
revoke update (id, role, status, email, recruiter_company_id, signup_site_id,
  terms_accepted_at, terms_version, privacy_acknowledged_at, privacy_version,
  consent_text_snapshot, created_at, updated_at) on public.profiles from public, anon, authenticated;
grant update (full_name, phone, headline, location_province, location_city, skills,
  default_resume_path, experience, education) on public.profiles to authenticated;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists profiles_active_actor_update on public.profiles;
create policy profiles_active_actor_update on public.profiles as restrictive
  for update to authenticated using (not public.is_suspended())
  with check (not public.is_suspended());

-- Suspended administrators must not retain privileges through direct table reads.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'
  );
$$;

-- Current frontends read the public directory through the API. Keep safe direct
-- column access for compatible clients and preserve the existing scoped RLS rules.
drop policy if exists "Anyone can view companies" on public.companies;
drop policy if exists "Authenticated users can create companies" on public.companies;
drop policy if exists "Authenticated users can update companies" on public.companies;
revoke select, insert, delete, truncate, trigger on public.companies from public, anon, authenticated;
revoke select (registration_number, verification_document_path, rejection_reason,
  verified_by, created_by) on public.companies from public, anon, authenticated;
grant select (id, name, website, logo_path, description, verification_status,
  status, created_at, updated_at, deleted_at) on public.companies to anon, authenticated;
drop policy if exists companies_active_actor_update on public.companies;
create policy companies_active_actor_update on public.companies as restrictive
  for update to authenticated using (not public.is_suspended())
  with check (not public.is_suspended());

-- Preserve application status updates supported by the existing role policies,
-- while preventing reassignment of ownership, jobs, and submitted documents.
revoke update, truncate, trigger on public.applications from public, anon, authenticated;
revoke update (id, job_id, applicant_id, resume_path, cover_letter, applied_via_site_id,
  created_at, deleted_at) on public.applications from public, anon, authenticated;
grant update (status, status_updated_at, updated_at) on public.applications to authenticated;

-- Existing SECURITY DEFINER trigger callers retain access as their owner.
revoke execute on function public.emit_notification(uuid, public.notification_type, smallint, text, uuid, jsonb)
  from public, anon, authenticated;
revoke execute on function public.log_activity(text, text, uuid, smallint, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.emit_notification(uuid, public.notification_type, smallint, text, uuid, jsonb) to service_role;
grant execute on function public.log_activity(text, text, uuid, smallint, uuid, jsonb) to service_role;
drop policy if exists "Enable insert for authenticated and anon users" on public.security_events;
revoke insert, update, delete, truncate, trigger on public.security_events from public, anon, authenticated;

-- Permissive policies are ORed. Removing the older rules makes the newer
-- referenced-object checks effective while retaining unreferenced-file edits.
drop policy if exists resumes_update_own on storage.objects;
drop policy if exists resumes_delete_own on storage.objects;
drop policy if exists resumes_insert_own on storage.objects;
commit;
