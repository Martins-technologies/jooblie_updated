-- Make repeat submissions for the same normalized email + phone update one
-- lead atomically. Existing duplicate records are preserved for manual review.
begin;

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
  v_employer_sharing boolean := coalesce((p_payload->>'employer_sharing_consent')::boolean, false);
  v_marketing boolean := coalesce((p_payload->>'marketing_consent')::boolean, false);
begin
  if v_email = '' or v_phone = '' then
    raise exception using errcode = '22023', message = 'REGISTRATION_CONTACT_REQUIRED';
  end if;

  -- Serialize simultaneous posts with the same identity key before checking.
  perform pg_advisory_xact_lock(hashtextextended(v_email || chr(31) || v_phone, 0));

  select r.id
    into v_id
    from public.mississauga_registrations as r
   where r.email = v_email
     and r.phone_e164 = v_phone
   order by r.created_at desc, r.id desc
   limit 1
   for update;

  if v_id is not null then
    update public.mississauga_registrations as r
       set full_name = p_payload->>'full_name',
           current_city = p_payload->>'current_city',
           employment_goal = p_payload->>'employment_goal',
           preferred_industry = nullif(p_payload->>'preferred_industry', ''),
           privacy_acknowledged = true,
           privacy_acknowledged_at = v_now,
           employer_sharing_consent = v_employer_sharing,
           employer_sharing_consent_at = case when v_employer_sharing then v_now else null end,
           marketing_consent = v_marketing,
           marketing_consent_at = case when v_marketing then v_now else null end,
           consent_version = coalesce(nullif(p_payload->>'consent_version', ''), 'mississauga-registration-v1'),
           source_context = coalesce(p_payload->'source_context', '{}'::jsonb),
           updated_at = v_now
     where r.id = v_id;
    v_duplicate := true;
  else
    insert into public.mississauga_registrations (
      full_name, email, phone_e164, current_city, employment_goal, preferred_industry,
      privacy_acknowledged, privacy_acknowledged_at,
      employer_sharing_consent, employer_sharing_consent_at,
      marketing_consent, marketing_consent_at, consent_version, source_context
    ) values (
      p_payload->>'full_name', v_email, v_phone, p_payload->>'current_city',
      p_payload->>'employment_goal', nullif(p_payload->>'preferred_industry', ''),
      true, v_now,
      v_employer_sharing, case when v_employer_sharing then v_now else null end,
      v_marketing, case when v_marketing then v_now else null end,
      coalesce(nullif(p_payload->>'consent_version', ''), 'mississauga-registration-v1'),
      coalesce(p_payload->'source_context', '{}'::jsonb)
    ) returning id into v_id;
  end if;

  return query select v_id, v_duplicate;
end;
$$;

revoke all on function public.upsert_mississauga_registration(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_mississauga_registration(jsonb) to service_role;

commit;
