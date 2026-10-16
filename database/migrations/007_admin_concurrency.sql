-- Apply after 006. Service-only transactional guards for administration.
-- No table, RLS policy, job visibility rule or existing trigger is replaced.
begin;

create or replace function public.admin_update_portal_job(
  p_actor_id uuid, p_job_id uuid, p_expected_updated_at timestamptz, p_payload jsonb
) returns setof public.jobs language plpgsql security definer
set search_path = pg_catalog, public, private as $$
declare v_current public.jobs%rowtype;
begin
  if not exists(select 1 from public.profiles where id=p_actor_id and role::text='admin' and status::text='active') then
    raise exception using errcode='42501',message='ADMIN_REQUIRED';
  end if;
  select * into v_current from public.jobs where id=p_job_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002',message='JOB_NOT_FOUND'; end if;
  if p_expected_updated_at is null then raise exception using errcode='22023',message='JOB_VERSION_REQUIRED'; end if;
  if v_current.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode='40001',message='JOB_VERSION_CONFLICT';
  end if;
  -- The row lock remains held while the existing publishing function validates,
  -- updates the job and synchronizes portal mappings in this same transaction.
  return query select * from public.save_portal_job(p_actor_id,p_job_id,null::smallint,p_payload,null::text[],true);
end;
$$;
revoke all on function public.admin_update_portal_job(uuid,uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.admin_update_portal_job(uuid,uuid,timestamptz,jsonb) to service_role;

create or replace function public.admin_change_user_role(
  p_actor_id uuid, p_user_id uuid, p_role public.user_role, p_previous_role public.user_role
) returns setof public.profiles language plpgsql security definer
set search_path = pg_catalog, public as $$
declare v_actor public.profiles%rowtype; v_target public.profiles%rowtype;
begin
  -- Serialize API role mutations, so two administrators cannot both pass a
  -- last-administrator check against the same old count.
  perform pg_advisory_xact_lock(746021,711);
  select * into v_actor from public.profiles where id=p_actor_id for update;
  if not found or v_actor.role::text<>'admin' or v_actor.status::text<>'active' then
    raise exception using errcode='42501',message='ADMIN_REQUIRED';
  end if;
  select * into v_target from public.profiles where id=p_user_id for update;
  if not found then raise exception using errcode='P0002',message='USER_NOT_FOUND'; end if;
  if p_role is null then raise exception using errcode='22023',message='ROLE_REQUIRED'; end if;
  if v_target.role=p_role then return next v_target; return; end if;
  if p_previous_role is null or v_target.role is distinct from p_previous_role then
    raise exception using errcode='40001',message='ROLE_VERSION_CONFLICT';
  end if;
  if p_actor_id=p_user_id and p_role::text<>'admin' then
    raise exception using errcode='23514',message='SELF_ROLE_CHANGE_BLOCKED';
  end if;
  if v_target.role::text='admin' and v_target.status::text='active' and p_role::text<>'admin' and
    (select count(*) from public.profiles where role::text='admin' and status::text='active')<=1 then
    raise exception using errcode='23514',message='LAST_ADMIN_DEMOTION_BLOCKED';
  end if;
  update public.profiles set role=p_role where id=p_user_id returning * into v_target;
  return next v_target;
end;
$$;
revoke all on function public.admin_change_user_role(uuid,uuid,public.user_role,public.user_role) from public,anon,authenticated;
grant execute on function public.admin_change_user_role(uuid,uuid,public.user_role,public.user_role) to service_role;

create index if not exists notifications_owner_created_idx on public.notifications(user_id,created_at desc,id);
create index if not exists notifications_owner_unread_idx on public.notifications(user_id) where read_at is null;
commit;
