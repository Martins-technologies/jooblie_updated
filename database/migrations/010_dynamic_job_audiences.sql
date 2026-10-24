-- Let recruiters target any active configured portal from the shared job form.
-- Jooblie and the job's origin portal remain automatic destinations.
begin;

create or replace function private.validate_job_audience_site()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op = 'UPDATE' and old.job_id is distinct from new.job_id then
    perform 1 from public.jobs where id in (old.job_id, new.job_id) order by id for update;
  else
    perform 1 from public.jobs where id = case when tg_op = 'DELETE' then old.job_id else new.job_id end for update;
  end if;
  if tg_op <> 'DELETE' and not exists (
    select 1 from public.sites s
    join public.jobs j on j.id = new.job_id
    where s.id = new.site_id and s.is_active
      and s.slug <> 'jooblie' and s.id <> j.origin_site_id
  ) then
    raise exception using errcode = '22023', message = 'AUDIENCE_SITE_INVALID';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.validate_job_audience_site() from public, anon, authenticated;
create or replace function public.save_portal_job(
  p_actor_id uuid,
  p_job_id uuid,
  p_site_id smallint,
  p_payload jsonb,
  p_audience_slugs text[] default null,
  p_is_admin boolean default false
)
returns setof public.jobs language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor public.profiles%rowtype;
  v_job public.jobs%rowtype;
  v_next public.jobs%rowtype;
  v_source public.sites%rowtype;
  v_company uuid;
  v_company_count integer;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_status text;
  v_audience_ids smallint[];
begin
  p_is_admin := coalesce(p_is_admin, false);
  if jsonb_typeof(v_payload) <> 'object' or exists (
    select 1 from jsonb_object_keys(v_payload) k
    where k not in ('title','category_id','province','city','is_remote',
      'workplace_type','experience_level','salary_min','salary_max','salary_currency',
      'salary_period','employment_type','skills','description','status','removed_reason')
  ) then
    raise exception using errcode = '22023', message = 'JOB_PAYLOAD_INVALID';
  end if;
  select * into v_actor from public.profiles where id = p_actor_id;
  if not found or v_actor.status::text <> 'active' then
    raise exception using errcode = '42501', message = 'ACTOR_INACTIVE';
  end if;
  if (p_is_admin and v_actor.role::text <> 'admin') or
     (not p_is_admin and v_actor.role::text not in ('recruiter','admin')) then
    raise exception using errcode = '42501', message = 'JOB_FORBIDDEN';
  end if;
  if not p_is_admin and v_payload ? 'removed_reason' then
    raise exception using errcode = '42501', message = 'JOB_FORBIDDEN';
  end if;

  if p_job_id is null then
    if p_is_admin then
      raise exception using errcode = '42501', message = 'JOB_FORBIDDEN';
    end if;
    v_company := v_actor.recruiter_company_id;
    if v_company is null then
      select count(*), (array_agg(company_id))[1] into v_company_count, v_company
      from public.company_members where user_id = p_actor_id;
      if v_company_count <> 1 then
        raise exception using errcode = '42501', message = 'COMPANY_FORBIDDEN';
      end if;
    end if;
    v_job.workplace_type := 'onsite';
    v_job.experience_level := 'mid_level';
    v_job.is_remote := false;
    v_job.salary_currency := 'CAD';
    v_job.skills := '{}'::text[];
    v_job.status := 'active';
    v_job.published_at := now();
    v_job.origin_site_id := p_site_id;
    v_job.company_id := v_company;
    v_job.created_by := p_actor_id;
  else
    select * into v_job from public.jobs where id = p_job_id and deleted_at is null for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'JOB_NOT_FOUND';
    end if;
    v_company := v_job.company_id;
  end if;

  if not p_is_admin and not exists (
    select 1 from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.user_id = p_actor_id and cm.company_id = v_company
      and c.status::text = 'active' and c.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'COMPANY_FORBIDDEN';
  end if;
  if (not p_is_admin and p_site_id is null) or (p_site_id is not null and not exists (select 1 from public.sites where id = p_site_id and is_active)) then
    raise exception using errcode = '22023', message = 'SOURCE_SITE_INVALID';
  end if;
  select * into v_source from public.sites where id = v_job.origin_site_id;
  if not found or (p_job_id is null and not v_source.is_active) then
    raise exception using errcode = '22023', message = 'SOURCE_SITE_INVALID';
  end if;
  if p_job_id is null and not exists (select 1 from public.sites where slug = 'jooblie' and is_active) then
    raise exception using errcode = '22023', message = 'SOURCE_SITE_INVALID';
  end if;

  begin
    v_next := jsonb_populate_record(v_job, v_payload);
  exception when invalid_text_representation or numeric_value_out_of_range or datatype_mismatch then
    raise exception using errcode = '22023', message = 'JOB_PAYLOAD_INVALID';
  end;
  if v_next.title is null or length(btrim(v_next.title)) not between 3 and 180
     or v_next.description is null or length(btrim(v_next.description)) not between 20 and 30000
     or v_next.employment_type is null or v_next.workplace_type is null
     or v_next.experience_level is null or v_next.skills is null
     or v_next.status is null or v_next.salary_currency is null
     or length(btrim(v_next.salary_currency::text)) <> 3
     or v_next.workplace_type not in ('onsite','hybrid','remote')
     or v_next.experience_level not in ('entry_level','mid_level','senior','executive') then
    raise exception using errcode = '22023', message = 'JOB_PAYLOAD_INVALID';
  end if;
  -- Historical category/config changes must not block closing or moderation.
  -- Validate active category and origin compatibility when selecting a category.
  if p_job_id is null or v_next.category_id is distinct from v_job.category_id then
    if not exists (select 1 from public.categories where id = v_next.category_id and is_active) then
      raise exception using errcode = '22023', message = 'SITE_CATEGORY_MISMATCH';
    end if;
    if v_source.site_type::text not in ('aggregator','audience') then
      if exists (select 1 from public.category_sites where site_id = v_source.id) then
        if not exists (select 1 from public.category_sites where site_id = v_source.id and category_id = v_next.category_id) then
          raise exception using errcode = '22023', message = 'SITE_CATEGORY_MISMATCH';
        end if;
      elsif v_source.sector_id is null or not exists (
        select 1 from public.categories where id = v_next.category_id and sector_id = v_source.sector_id
      ) then
        raise exception using errcode = '22023', message = 'SITE_CATEGORY_MISMATCH';
      end if;
    end if;
  end if;
  if v_next.salary_min < 0 or v_next.salary_max < 0 or
    (v_next.salary_min is not null and v_next.salary_max is not null and v_next.salary_max < v_next.salary_min) then
    raise exception using errcode = '23514', message = 'SALARY_RANGE_INVALID';
  end if;
  if v_payload ? 'is_remote' and not (v_payload ? 'workplace_type') then
    if v_next.is_remote is null then
      raise exception using errcode = '22023', message = 'JOB_PAYLOAD_INVALID';
    end if;
    v_next.workplace_type := case when v_next.is_remote then 'remote' else 'onsite' end;
  end if;
  v_next.is_remote := v_next.workplace_type = 'remote';
  if v_next.is_remote then v_next.city := null; v_next.province := null; end if;
  v_next.title := btrim(v_next.title);
  v_next.salary_currency := upper(v_next.salary_currency);

  v_status := v_next.status::text;
  if not p_is_admin and v_status not in ('active','closed') then
    raise exception using errcode = '42501', message = 'JOB_FORBIDDEN';
  end if;
  if p_job_id is null then
    v_next.status := 'active';
    v_next.published_at := now();
  elsif v_status = 'active' then
    if v_job.status::text <> 'active' or v_job.published_at is null then v_next.published_at := now(); end if;
    v_next.removed_reason := null;
  elsif v_status = 'pending_review' then
    v_next.published_at := null;
    v_next.removed_reason := null;
  elsif v_status = 'removed' then
    v_next.removed_reason := coalesce(nullif(btrim(v_next.removed_reason), ''), 'Removed by administrator');
  end if;

  -- Resolve the entire audience BEFORE any write; unknown/inactive portals fail
  -- atomically. The function call is one PostgreSQL transaction with the job write.
  if p_audience_slugs is not null then
    if exists (
      select 1 from unnest(p_audience_slugs) as requested(slug)
      where requested.slug is null
        or requested.slug !~ '^[a-z0-9][a-z0-9-]{0,79}$'
        or not exists (
          select 1 from public.sites s
          where s.slug = requested.slug and s.is_active
            and s.slug <> 'jooblie' and s.id <> v_job.origin_site_id
        )
    ) then
      raise exception using errcode = '22023', message = 'AUDIENCE_SITE_INVALID';
    end if;
    select coalesce(array_agg(distinct id), '{}'::smallint[]) into v_audience_ids
      from public.sites
      where slug = any(p_audience_slugs) and is_active
        and slug <> 'jooblie' and id <> v_job.origin_site_id;
  end if;

  if p_job_id is null then
    insert into public.jobs(company_id,origin_site_id,created_by,category_id,title,description,
      province,city,is_remote,salary_min,salary_max,salary_currency,salary_period,
      employment_type,workplace_type,experience_level,skills,status,published_at)
    values(v_company,v_job.origin_site_id,p_actor_id,v_next.category_id,v_next.title,v_next.description,
      v_next.province,v_next.city,v_next.is_remote,v_next.salary_min,v_next.salary_max,
      v_next.salary_currency,v_next.salary_period,v_next.employment_type,v_next.workplace_type,
      v_next.experience_level,v_next.skills,'active',v_next.published_at)
    returning * into v_job;
    -- Existing projects may have a BEFORE INSERT trigger deriving pending_review
    -- for unverified companies. Preserve the API's active-publishing policy in
    -- this same transaction, using the existing permitted pending->active path.
    if v_job.status::text <> 'active' then
      update public.jobs set status='active',published_at=coalesce(v_job.published_at,now()),updated_at=now()
        where id=v_job.id returning * into v_job;
    end if;
  else
    update public.jobs set category_id=v_next.category_id,title=v_next.title,description=v_next.description,
      province=v_next.province,city=v_next.city,is_remote=v_next.is_remote,
      salary_min=v_next.salary_min,salary_max=v_next.salary_max,salary_currency=v_next.salary_currency,
      salary_period=v_next.salary_period,employment_type=v_next.employment_type,
      workplace_type=v_next.workplace_type,experience_level=v_next.experience_level,skills=v_next.skills,
      status=v_next.status,published_at=v_next.published_at,removed_reason=v_next.removed_reason,updated_at=now()
    where id=v_job.id returning * into v_job;
  end if;
  if p_audience_slugs is not null then
    delete from public.job_audience_sites where job_id=v_job.id and not (site_id=any(v_audience_ids));
    insert into public.job_audience_sites(job_id,site_id)
      select v_job.id,unnest(v_audience_ids) on conflict (job_id,site_id) do nothing;
  end if;
  perform private.sync_job_sites(v_job.id,v_job.category_id,v_job.origin_site_id);
  return next v_job;
end;
$$;
revoke all on function public.save_portal_job(uuid,uuid,smallint,jsonb,text[],boolean) from public, anon, authenticated;
grant execute on function public.save_portal_job(uuid,uuid,smallint,jsonb,text[],boolean) to service_role;
commit;