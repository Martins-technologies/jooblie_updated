create function public.admin_delete_company(p_actor_id uuid, p_company_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deletion_time timestamptz := now();
  jobs_removed integer;
begin
  perform 1 from public.profiles
    where id = p_actor_id and role = 'admin' and status = 'active'
    for share;
  if not found then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;

  update public.companies set deleted_at = deletion_time
    where id = p_company_id and deleted_at is null;
  if not found then
    if exists (select 1 from public.companies where id = p_company_id) then
      return jsonb_build_object('deleted', false, 'jobs_removed', 0);
    end if;
    raise exception 'Company not found' using errcode = 'P0002';
  end if;

  update public.jobs set deleted_at = deletion_time
    where company_id = p_company_id and deleted_at is null;
  get diagnostics jobs_removed = row_count;
  return jsonb_build_object('deleted', true, 'jobs_removed', jobs_removed);
end;
$$;

revoke all on function public.admin_delete_company(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_company(uuid, uuid) to service_role;

create function private.require_live_company_for_job()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.deleted_at is null and old.company_id is not distinct from new.company_id then
      return new;
    end if;
  end if;
  perform 1 from public.companies
    where id = new.company_id and deleted_at is null
    for share;
  if not found then
    raise exception 'A job requires an active company record' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.require_live_company_for_job() from public, anon, authenticated;
create trigger require_live_company_for_job
before insert or update of company_id, deleted_at on public.jobs
for each row execute function private.require_live_company_for_job();
