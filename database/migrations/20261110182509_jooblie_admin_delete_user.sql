create or replace function public.admin_delete_user_account(
  p_actor_id uuid, p_user_id uuid, p_finalize boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.profiles%rowtype;
  files jsonb;
begin
  -- Share the existing role-change lock so permission and target checks use current roles.
  perform pg_catalog.pg_advisory_xact_lock(746021, 711);
  if p_actor_id = p_user_id or not exists (
    select 1 from public.profiles
    where id = p_actor_id and role = 'admin' and status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  select * into target from public.profiles where id = p_user_id for update;
  if not found then
    return jsonb_build_object('deleted', false, 'files', '[]'::jsonb);
  end if;
  if target.role = 'admin' then
    raise exception using errcode = '42501', message = 'ADMIN_ACCOUNT_PROTECTED';
  end if;

  select coalesce(jsonb_agg(name order by name), '[]'::jsonb) into files
  from storage.objects
  where bucket_id = 'resumes'
    and (owner = p_user_id or owner_id = p_user_id::text or split_part(name, '/', 1) = p_user_id::text);

  if exists (
    select 1 from storage.objects
    where bucket_id <> 'resumes' and (owner = p_user_id or owner_id = p_user_id::text)
  ) then
    raise exception using errcode = '55000', message = 'ACCOUNT_OWNS_NON_RESUME_FILES';
  end if;

  if not p_finalize then
    update public.profiles set status = 'deleted' where id = p_user_id and status <> 'deleted';
    return jsonb_build_object('deleted', false, 'files', files);
  end if;

  if files <> '[]'::jsonb or target.status <> 'deleted' then
    raise exception using errcode = '55000', message = 'ACCOUNT_DELETION_NOT_READY';
  end if;

  delete from public.notifications
  where entity_id = p_user_id or entity_id in (
    select id from public.applications where applicant_id = p_user_id
  );
  delete from public.applications where applicant_id = p_user_id;
  delete from public.company_members where user_id = p_user_id;
  update public.companies set created_by = p_actor_id where created_by = p_user_id;
  update public.companies set verified_by = null where verified_by = p_user_id;
  update public.jobs set created_by = p_actor_id where created_by = p_user_id;
  update public.activity_log set actor_id = null where actor_id = p_user_id;

  delete from auth.users where id = p_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'AUTH_ACCOUNT_NOT_FOUND';
  end if;
  return jsonb_build_object('deleted', true, 'files', files);
end;
$$;

revoke all on function public.admin_delete_user_account(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_delete_user_account(uuid, uuid, boolean) to service_role;
