-- These changes preserve the old Auth trigger path and add atomic API-managed signup.
begin;
set local lock_timeout = '5s';
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.jooblie_signup_intents (
  id uuid primary key,
  email text not null,
  site_id smallint not null references public.sites(id),
  payload jsonb not null,
  expires_at timestamptz not null default (now() + interval '10 minutes')
);
alter table private.jooblie_signup_intents enable row level security;
revoke all on private.jooblie_signup_intents from public, anon, authenticated;

create or replace function public.prepare_jooblie_signup(p_id uuid, p_site_id smallint, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(p_payload->>'role','') not in ('job_seeker','recruiter')
     or nullif(trim(p_payload->>'email'),'') is null
     or nullif(trim(p_payload->>'name'),'') is null
     or not exists (select 1 from public.sites where id=p_site_id and is_active)
     or (p_payload->>'role' = 'recruiter' and nullif(trim(p_payload->>'company_name'),'') is null)
  then
    raise exception 'Invalid registration details' using errcode = '22023';
  end if;
  delete from private.jooblie_signup_intents where expires_at <= pg_catalog.now();
  insert into private.jooblie_signup_intents(id,email,site_id,payload)
  values(p_id,lower(trim(p_payload->>'email')),p_site_id,p_payload);
end;
$$;
revoke execute on function public.prepare_jooblie_signup(uuid,smallint,jsonb) from public, anon, authenticated;
grant execute on function public.prepare_jooblie_signup(uuid,smallint,jsonb) to service_role;

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

-- Keep the advertised PDF and DOCX support and the current UI's 10 MiB limit.
alter table public.resume_documents drop constraint if exists resume_documents_content_type_check;
alter table public.resume_documents add constraint resume_documents_content_type_check
  check (content_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
alter table public.resume_documents drop constraint if exists resume_documents_size_bytes_check;
alter table public.resume_documents add constraint resume_documents_size_bytes_check
  check (size_bytes > 0 and size_bytes <= 10485760);
update storage.buckets set file_size_limit=10485760, allowed_mime_types=array[
  'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] where id='resumes' and not public;

create or replace function public.upsert_mississauga_registration(p_payload jsonb)
returns table (registration_id uuid, duplicate boolean)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_email text := lower(btrim(coalesce(p_payload->>'email', '')));
  v_phone text := btrim(coalesce(p_payload->>'phone_e164', ''));
  v_id uuid;
  v_duplicate boolean := false;
  v_now timestamptz := now();
  v_terms boolean := coalesce((p_payload->>'terms_accepted')::boolean, false);
  v_employer_sharing boolean := coalesce((p_payload->>'employer_sharing_consent')::boolean, false);
  v_sms boolean := coalesce((p_payload->>'sms_marketing_consent')::boolean, false);
  v_email_marketing boolean := coalesce((p_payload->>'email_marketing_consent')::boolean, false);
begin
  if v_email = '' or v_phone = '' then raise exception using errcode = '22023', message = 'REGISTRATION_CONTACT_REQUIRED'; end if;
  if not v_terms then raise exception using errcode = '22023', message = 'TERMS_ACCEPTANCE_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_email || chr(31) || v_phone, 0));
  select r.id into v_id from public.mississauga_registrations as r where r.email = v_email and r.phone_e164 = v_phone order by r.created_at desc, r.id desc limit 1 for update;
  if v_id is not null then
    -- Public repeat submissions cannot change details or consent.
    return query select v_id, true;
    return;
  else
    insert into public.mississauga_registrations (
      full_name, email, phone_e164, current_city, employment_goal, preferred_industry,
      privacy_acknowledged, privacy_acknowledged_at, employer_sharing_consent, employer_sharing_consent_at,
      marketing_consent, marketing_consent_at, consent_version, source_context, terms_accepted, terms_accepted_at,
      sms_marketing_consent, sms_marketing_consent_at, email_marketing_consent, email_marketing_consent_at, consent_text_snapshot
    ) values (
      p_payload->>'full_name', v_email, v_phone, p_payload->>'current_city', p_payload->>'employment_goal', nullif(p_payload->>'preferred_industry', ''),
      true, v_now, v_employer_sharing, case when v_employer_sharing then v_now else null end, false, null,
      coalesce(nullif(p_payload->>'consent_version', ''), 'mississauga-registration-2026-10-30-v1'), coalesce(p_payload->'source_context', '{}'::jsonb),
      true, v_now, v_sms, case when v_sms then v_now else null end, v_email_marketing, case when v_email_marketing then v_now else null end,
      coalesce(p_payload->'consent_text_snapshot', '{}'::jsonb)
    ) returning id into v_id;
  end if;
  return query select v_id, v_duplicate;
end;
$$;
revoke execute on function public.upsert_mississauga_registration(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_mississauga_registration(jsonb) to service_role;
commit;
