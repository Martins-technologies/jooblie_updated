-- Separate required legal acceptance from optional employer and marketing consent.
-- Existing registrations are preserved and are not backfilled as having accepted new terms.
begin;

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists privacy_version text,
  add column if not exists consent_text_snapshot jsonb not null default '{}'::jsonb;

alter table public.mississauga_registrations
  add column if not exists terms_accepted boolean not null default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists sms_marketing_consent boolean not null default false,
  add column if not exists sms_marketing_consent_at timestamptz,
  add column if not exists email_marketing_consent boolean not null default false,
  add column if not exists email_marketing_consent_at timestamptz,
  add column if not exists consent_text_snapshot jsonb not null default '{}'::jsonb;

alter table public.mississauga_registrations
  add constraint mississauga_terms_timestamps_valid check (
    (terms_accepted and terms_accepted_at is not null)
    or (not terms_accepted and terms_accepted_at is null)
  ),
  add constraint mississauga_sms_consent_timestamps_valid check (
    (sms_marketing_consent and sms_marketing_consent_at is not null)
    or (not sms_marketing_consent and sms_marketing_consent_at is null)
  ),
  add constraint mississauga_email_consent_timestamps_valid check (
    (email_marketing_consent and email_marketing_consent_at is not null)
    or (not email_marketing_consent and email_marketing_consent_at is null)
  );

create or replace function public.upsert_mississauga_registration(p_payload jsonb)
returns table (registration_id uuid, duplicate boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  if v_email = '' or v_phone = '' then
    raise exception using errcode = '22023', message = 'REGISTRATION_CONTACT_REQUIRED';
  end if;
  if not v_terms then
    raise exception using errcode = '22023', message = 'TERMS_ACCEPTANCE_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email || chr(31) || v_phone, 0));

  select r.id into v_id
    from public.mississauga_registrations as r
   where r.email = v_email and r.phone_e164 = v_phone
   order by r.created_at desc, r.id desc
   limit 1 for update;

  if v_id is not null then
    update public.mississauga_registrations as r
       set full_name = p_payload->>'full_name',
           current_city = p_payload->>'current_city',
           employment_goal = p_payload->>'employment_goal',
           preferred_industry = nullif(p_payload->>'preferred_industry', ''),
           terms_accepted = true,
           terms_accepted_at = v_now,
           privacy_acknowledged = true,
           privacy_acknowledged_at = v_now,
           employer_sharing_consent = v_employer_sharing,
           employer_sharing_consent_at = case when v_employer_sharing then v_now else null end,
           sms_marketing_consent = v_sms,
           sms_marketing_consent_at = case when v_sms then v_now else null end,
           email_marketing_consent = v_email_marketing,
           email_marketing_consent_at = case when v_email_marketing then v_now else null end,
           consent_version = coalesce(nullif(p_payload->>'consent_version', ''), 'mississauga-registration-2026-10-30-v1'),
           consent_text_snapshot = coalesce(p_payload->'consent_text_snapshot', '{}'::jsonb),
           source_context = coalesce(p_payload->'source_context', '{}'::jsonb),
           updated_at = v_now
     where r.id = v_id;
    v_duplicate := true;
  else
    insert into public.mississauga_registrations (
      full_name, email, phone_e164, current_city, employment_goal, preferred_industry,
      privacy_acknowledged, privacy_acknowledged_at,
      employer_sharing_consent, employer_sharing_consent_at,
      marketing_consent, marketing_consent_at, consent_version, source_context,
      terms_accepted, terms_accepted_at,
      sms_marketing_consent, sms_marketing_consent_at,
      email_marketing_consent, email_marketing_consent_at, consent_text_snapshot
    ) values (
      p_payload->>'full_name', v_email, v_phone, p_payload->>'current_city',
      p_payload->>'employment_goal', nullif(p_payload->>'preferred_industry', ''),
      true, v_now,
      v_employer_sharing, case when v_employer_sharing then v_now else null end,
      false, null,
      coalesce(nullif(p_payload->>'consent_version', ''), 'mississauga-registration-2026-10-30-v1'),
      coalesce(p_payload->'source_context', '{}'::jsonb),
      true, v_now,
      v_sms, case when v_sms then v_now else null end,
      v_email_marketing, case when v_email_marketing then v_now else null end,
      coalesce(p_payload->'consent_text_snapshot', '{}'::jsonb)
    ) returning id into v_id;
  end if;

  return query select v_id, v_duplicate;
end;
$$;

revoke all on function public.upsert_mississauga_registration(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_mississauga_registration(jsonb) to service_role;

drop trigger if exists mississauga_enqueue_delivery on public.mississauga_registrations;
create trigger mississauga_enqueue_delivery after insert or update of
  full_name, email, phone_e164, current_city, employment_goal, preferred_industry,
  employer_sharing_consent, marketing_consent, consent_version, source_context,
  terms_accepted, terms_accepted_at, sms_marketing_consent, sms_marketing_consent_at,
  email_marketing_consent, email_marketing_consent_at, consent_text_snapshot
on public.mississauga_registrations for each row execute function public.enqueue_mississauga_deliveries();

commit;
