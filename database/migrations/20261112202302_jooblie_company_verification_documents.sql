insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-verification-documents', 'company-verification-documents', false, 1572864,
  array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Only the backend can access the verification bucket, even if another
-- storage policy permits general access to objects.
create policy company_verification_documents_backend_only
on storage.objects as restrictive for all to anon, authenticated
using (bucket_id <> 'company-verification-documents')
with check (bucket_id <> 'company-verification-documents');

create table public.company_verification_documents (
  company_id uuid primary key references public.companies(id) on delete cascade,
  business_path text not null,
  address_path text not null
);

alter table public.company_verification_documents enable row level security;
revoke all on public.company_verification_documents from public, anon, authenticated;
grant select on public.company_verification_documents to service_role;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  requested_role text;
  resolved_role public.user_role;
  resolved_site_id smallint;
  intent private.jooblie_signup_intents;
  new_company_id uuid;
  accepted boolean;
  accepted_at timestamptz := pg_catalog.now();
begin
  if new.raw_user_meta_data ? 'jooblie_signup_intent' then
    delete from private.jooblie_signup_intents
    where id = (new.raw_user_meta_data->>'jooblie_signup_intent')::uuid
      and email = lower(trim(new.email)) and expires_at > pg_catalog.now()
    returning * into intent;
    if not found then
      raise exception 'Registration request expired or invalid' using errcode = '22023';
    end if;
    resolved_role := (intent.payload->>'role')::public.user_role;
    accepted := resolved_role = 'job_seeker' and coalesce((intent.payload->>'terms_accepted')::boolean,false);
    insert into public.profiles
      (id,role,email,signup_site_id,full_name,terms_accepted_at,terms_version,
       privacy_acknowledged_at,privacy_version,consent_text_snapshot)
    values
      (new.id,resolved_role,new.email,intent.site_id,trim(intent.payload->>'name'),
       case when accepted then accepted_at end,
       case when accepted then intent.payload->>'terms_version' end,
       case when accepted then accepted_at end,
       case when accepted then intent.payload->>'terms_version' end,
       case when accepted then jsonb_build_object('required_acceptance',intent.payload->>'consent_copy') else '{}'::jsonb end);
    if resolved_role = 'recruiter' then
      insert into public.companies(name,website,registration_number,created_by)
      values(trim(intent.payload->>'company_name'),nullif(trim(intent.payload->>'company_website'),''),
        nullif(trim(intent.payload->>'company_registration_number'),''),new.id)
      returning id into new_company_id;
      -- The existing company trigger creates ownership.
      if not exists (select 1 from public.company_members m where m.company_id=new_company_id and m.user_id=new.id and m.role='owner') then
        raise exception 'Company ownership could not be initialized' using errcode = '23514';
      end if;
      if intent.payload ? 'business_document_path' or intent.payload ? 'address_document_path' then
        insert into public.company_verification_documents(company_id, business_path, address_path)
        values (new_company_id, intent.payload->>'business_document_path', intent.payload->>'address_document_path');
      end if;
      update public.profiles set recruiter_company_id=new_company_id where id=new.id;
    end if;
    return new;
  end if;

  requested_role := new.raw_user_meta_data->>'role';
  if requested_role in ('job_seeker','recruiter') then
    resolved_role := requested_role::public.user_role;
  else
    resolved_role := 'job_seeker';
  end if;
  select site.id into resolved_site_id from public.sites site
  where site.slug = coalesce(new.raw_user_meta_data->>'site',new.raw_user_meta_data->>'signup_site_slug');
  insert into public.profiles(id,role,email,signup_site_id)
  values(new.id,resolved_role,new.email,coalesce(resolved_site_id,1));
  return new;
end;
$$;
