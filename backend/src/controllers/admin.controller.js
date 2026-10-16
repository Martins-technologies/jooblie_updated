import { adminQuery, pageInfo, optionalCount } from '../utils/adminQuery.js';
import { changeAdminRole, updateAdminJob } from '../utils/adminMutations.js';
import { serviceDb } from '../config/supabase.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { writeAuditLog } from '../utils/audit.js';
import { savePortalJob } from '../utils/portalJobs.js';
import { loadOverviewAnalytics } from '../utils/overviewAnalytics.js';


const adminJobSelect = `
  id,title,description,province,city,is_remote,
  salary_min,salary_max,salary_currency,salary_period,employment_type,skills,
  status,published_at,created_at,updated_at,expires_at,removed_reason,
  company_id,category_id,origin_site_id,
  companies:company_id(id,name,website,logo_path,description,verification_status,status),
  categories:category_id(id,name,slug,sector_id),
  sites:origin_site_id(id,slug,name,domain,site_type,is_active)
`;

function normalizeActivity(row) {
  return {
    ...row,
    request_id: row.data?.request_id || null,
    client_ip: row.data?.client_ip || null,
    server_ip: row.data?.server_ip || null,
    outcome: row.data?.outcome || 'success',
  };
}

export const overviewAnalytics = asyncHandler(async (req,res) => {
  let days=Number(req.query.days||30),range=null;
  if(req.query.start||req.query.end){
    const start=String(req.query.start||''),end=String(req.query.end||'');
    const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
    if(!valid(start)||!valid(end)||start>end||end>new Date().toISOString().slice(0,10))throw new ApiError(400,'Choose valid start and end dates, without future dates.','INVALID_ANALYTICS_PERIOD');
    days=Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1;
    if(days>366)throw new ApiError(400,'Choose a date range of 366 days or fewer.','INVALID_ANALYTICS_PERIOD');
    range={start,end};
  }else if(![7,30,90].includes(days))throw new ApiError(400,'Choose a 7, 30 or 90 day period.','INVALID_ANALYTICS_PERIOD');
  res.json(await loadOverviewAnalytics(serviceDb,days,range));
});

export const dashboard = asyncHandler(async (_req, res) => {
  const count = (table) => serviceDb.from(table).select('id', { count: 'exact', head: true });
  const [users, companies, jobs, applications, pendingJobs, activeJobs, pendingCompanies, pendingApplications, sites, activeSites, recentUsers, recentJobs, queue, audit, security] = await Promise.all([
    count('profiles'), count('companies').is('deleted_at', null), count('jobs').is('deleted_at', null), count('applications').is('deleted_at', null),
    count('jobs').is('deleted_at', null).eq('status', 'pending_review'), count('jobs').is('deleted_at', null).eq('status', 'active'),
    count('companies').is('deleted_at', null).eq('verification_status', 'pending'), count('applications').is('deleted_at', null).eq('status', 'submitted'),
    serviceDb.from('sites').select('id,slug,name,domain,site_type,is_active', { count: 'exact' }).order('name').limit(6),
    count('sites').eq('is_active', true),
    serviceDb.from('profiles').select('id,full_name,email,role,status,created_at').order('created_at', { ascending: false }).limit(5),
    serviceDb.from('jobs').select('id,title,status,created_at,companies:company_id(name),sites:origin_site_id(name)').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    serviceDb.from('jobs').select('id,title,status,created_at,companies:company_id(name)').is('deleted_at', null).eq('status', 'pending_review').order('created_at').limit(5),
    serviceDb.from('activity_log').select('id,action,entity_type,entity_id,created_at,data').order('created_at', { ascending: false }).limit(6),
    serviceDb.from('security_events').select('id,event_type,severity,created_at').order('created_at', { ascending: false }).limit(5),
  ]);
  const results = { users, companies, jobs, applications, pendingJobs, activeJobs, pendingCompanies, pendingApplications };
  res.json({
    metrics: { ...Object.fromEntries(Object.entries(results).map(([key,result]) => [key, optionalCount(result)])), sites: optionalCount(sites), activeSites: optionalCount(activeSites) },
    recentUsers: recentUsers.data || [], recentJobs: recentJobs.data || [], pendingJobs: queue.data || [], sites: sites.data || [], auditLogs: (audit.data || []).map(normalizeActivity), securityEvents: security.data || [],
    unavailable: Object.entries({ ...results, recentUsers, recentJobs, queue, sites, activeSites, audit, security }).filter(([, result]) => result.error).map(([key]) => key),
    generatedAt: new Date().toISOString(),
  });
});

export const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, from, to, search, sort, ascending } = adminQuery(req.query, ['created_at','title','status','updated_at']);
  const selectedFields = req.query.searchOnly === 'true' ? 'id,title,city,province,companies:company_id(name)' : adminJobSelect;
  const jobSelect = req.query.mappedSiteId ? `${selectedFields},job_sites!inner(site_id)` : selectedFields;
  let query = serviceDb.from('jobs').select(jobSelect, { count: 'exact' }).is('deleted_at', null).order(sort, { ascending }).order('id');
  if (req.query.status && req.query.status !== 'all') query = query.eq('status', String(req.query.status).slice(0, 40));
  if (req.query.mappedSiteId && /^\d+$/.test(req.query.mappedSiteId)) query = query.eq('job_sites.site_id', Number(req.query.mappedSiteId));
  if (req.query.siteId && /^\d+$/.test(req.query.siteId)) query = query.eq('origin_site_id', Number(req.query.siteId));
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  if (/^[0-9a-f-]{36}$/i.test(req.query.jobId || '')) query = query.eq('id', req.query.jobId);
  const { data, error, count } = await query.range(from, to);
  if (error) throw new ApiError(500, 'Jobs could not be loaded.', 'ADMIN_JOBS_FAILED');
  res.json({ items: data || [], pagination: pageInfo(page, limit, count) });
});


// Read-only card insights: exact totals and daily creation counts from real jobs.
export const jobInsights = asyncHandler(async (req, res) => {
  const { search } = adminQuery(req.query, ['created_at']);
  const now = new Date(), today = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  const start = new Date(today); start.setUTCDate(start.getUTCDate()-13);
  const week = new Date(today); week.setUTCDate(week.getUTCDate()-6);
  const groups = ['all','active','pending_review','closed'];
  const dates = Array.from({length:7},(_,index)=>{const day=new Date(week);day.setUTCDate(day.getUTCDate()+index);return day.toISOString().slice(0,10);});
  const build = (fields, options={}) => {
    const mapped = /^\d+$/.test(String(req.query.mappedSiteId || ''));
    let query = serviceDb.from('jobs').select(fields+(mapped?',job_sites!inner(site_id)':''),options).is('deleted_at',null);
    if(mapped)query=query.eq('job_sites.site_id',Number(req.query.mappedSiteId));
    if(/^\d+$/.test(String(req.query.siteId || '')))query=query.eq('origin_site_id',Number(req.query.siteId));
    if(search)query=query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    if(/^[0-9a-f-]{36}$/i.test(req.query.jobId || ''))query=query.eq('id',req.query.jobId);
    return query;
  };
  const countResults = await Promise.all(groups.map(status=>{let query=build('id',{count:'exact',head:true});if(status!=='all')query=query.eq('status',status);return query;}));
  const counts=Object.fromEntries(groups.map((status,index)=>[status,optionalCount(countResults[index])]));
  const series=Object.fromEntries(groups.map(status=>[status,Array(7).fill(0)]));
  const recent=Object.fromEntries(groups.map(status=>[status,0])),previous={...recent};
  const seen=new Set();let chartsAvailable=true;
  for(let offset=0;;offset+=1000){
    const result=await build('id,status,created_at').gte('created_at',start.toISOString()).lte('created_at',now.toISOString()).order('created_at').order('id').range(offset,offset+999);
    if(result.error){chartsAvailable=false;break;}
    for(const job of result.data||[]){
      if(seen.has(job.id))continue;seen.add(job.id);
      const day=String(job.created_at).slice(0,10),index=dates.indexOf(day);
      for(const status of groups){
        if(status!=='all'&&job.status!==status)continue;
        if(index>=0){series[status][index]++;recent[status]++;}else previous[status]++;
      }
    }
    if((result.data||[]).length<1000)break;
    if(offset>=99000){chartsAvailable=false;break;}
  }
  res.json({counts,dates,series:chartsAvailable?series:null,recent:chartsAvailable?recent:null,previous:chartsAvailable?previous:null,generatedAt:now.toISOString(),timezone:'UTC'});
});

export const getJob = asyncHandler(async (req, res) => {
  const { data: job, error } = await serviceDb.from('jobs').select(adminJobSelect).eq('id', req.params.jobId).is('deleted_at', null).maybeSingle();
  if (error) throw new ApiError(500, 'Admin job could not be loaded.', 'ADMIN_JOB_FAILED', error.message);
  if (!job) throw new ApiError(404, 'Job not found.', 'JOB_NOT_FOUND');
  const [applicationsRes, viewsRes, sitesRes] = await Promise.all([
    serviceDb.from('applications').select('id,status,created_at,applicant_id', { count: 'exact' }).eq('job_id', job.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(25),
    serviceDb.from('job_views').select('id,viewed_on,site_id', { count: 'exact' }).eq('job_id', job.id).order('viewed_on', { ascending: false }).limit(30),
    serviceDb.from('job_sites').select('site_id,sites:site_id(id,slug,name,domain,site_type,is_active)').eq('job_id', job.id),
  ]);
  if (applicationsRes.error || viewsRes.error || sitesRes.error) throw new ApiError(500, 'Job details could not be loaded.', 'ADMIN_JOB_DETAILS_FAILED');
  res.json({ job, applications: applicationsRes.data || [], views: viewsRes.data || [], portals: (sitesRes.data || []).map((row) => row.sites).filter(Boolean), metrics: { applications: applicationsRes.count || 0, views: viewsRes.count || 0 } });
});

export const updateJob = asyncHandler(async (req, res) => {
  const data = await updateAdminJob(serviceDb, {
    actorId: req.user.id, jobId: req.params.jobId, body: adminJobBody(req.body),
  });
  await writeAuditLog(req, { action: 'admin.job.update', entityType: 'job', entityId: data.id, companyId: data.company_id, metadata: { status: data.status, fields: Object.keys(req.body) } });
  res.json({ job: data });
});

function adminJobBody(body) {
  const next = { ...body };
  if (body.status === 'removed') next.removed_reason = body.moderation_note || 'Removed by administrator';
  if (body.status === 'active' || body.status === 'pending_review') next.removed_reason = null;
  return next;
}

export const deleteJob = asyncHandler(async (req, res) => {
  const now = new Date().toISOString();
  const { data, error } = await serviceDb.from('jobs').update({ deleted_at: now, updated_at: now, status: 'removed', removed_reason: 'Deleted by administrator' }).eq('id', req.params.jobId).is('deleted_at', null).select('id,title,status,deleted_at,removed_reason,company_id').single();
  if (error) throw new ApiError(400, 'Job could not be deleted.', 'ADMIN_JOB_DELETE_FAILED', error.message);
  await writeAuditLog(req, { action: 'admin.job.delete', entityType: 'job', entityId: data.id, companyId: data.company_id, metadata: { reason: data.removed_reason } });
  res.json({ job: data });
});

export const listPortals = asyncHandler(async (req, res) => {
  const { page, limit, from, to, search, sort, ascending } = adminQuery(req.query, ['name','slug','site_type'], 'name');
  const optionsOnly = req.query.optionsOnly === 'true';
  const fields = optionsOnly ? 'id,slug,name,domain,is_active' : 'id,slug,name,domain,site_type,sector_id,is_active,sectors:sector_id(name)';
  let query = serviceDb.from('sites').select(fields, { count: 'exact' }).order(sort, { ascending }).order('id');
  if (search) query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,domain.ilike.%${search}%`);
  if (['true','false'].includes(req.query.active)) query = query.eq('is_active', req.query.active === 'true');
  const { data, error, count } = await query.range(from, to);
  if (error) throw new ApiError(500, 'Portals could not be loaded.', 'PORTALS_FAILED');
  if (optionsOnly) return res.json({ items: data || [], pagination: pageInfo(page, limit, count) });
  const items = await Promise.all((data || []).map(async site => {
    const [jobs, users, activity] = await Promise.all([
      serviceDb.from('job_sites').select('job_id,jobs!inner(id)', { count: 'exact', head: true }).eq('site_id', site.id).is('jobs.deleted_at', null),
      serviceDb.from('profiles').select('id', { count: 'exact', head: true }).eq('signup_site_id', site.id),
      serviceDb.from('activity_log').select('created_at').eq('site_id', site.id).order('created_at', { ascending: false }).limit(1),
    ]);
    return { ...site, metrics: { jobs: optionalCount(jobs), users: optionalCount(users) }, lastActivity: activity.data?.[0]?.created_at || null, activityAvailable: !activity.error };
  }));
  res.json({ items, pagination: pageInfo(page, limit, count) });
});

export const getPortal = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();
  const { data: site, error: siteError } = await serviceDb.from('sites').select('id,slug,name,domain,site_type,sector_id,is_active').eq('slug', slug).maybeSingle();
  if (siteError) throw new ApiError(500, 'Portal could not be loaded.', 'PORTAL_FAILED', siteError.message);
  if (!site) throw new ApiError(404, 'Portal not found.', 'PORTAL_NOT_FOUND');
  const [jobsCount, activeJobsCount, usersCount, jobsRes, activityRes] = await Promise.all([
    serviceDb.from('job_sites').select('job_id,jobs!inner(id)', { count: 'exact', head: true }).eq('site_id', site.id).is('jobs.deleted_at', null),
    serviceDb.from('job_sites').select('job_id,jobs!inner(id)', { count: 'exact', head: true }).eq('site_id', site.id).eq('jobs.status', 'active').is('jobs.deleted_at', null),
    serviceDb.from('profiles').select('id', { count: 'exact', head: true }).eq('signup_site_id', site.id),
    serviceDb.from('job_sites').select('job_id,jobs!inner(id,title,status,created_at,published_at,company_id,companies:company_id(name))').eq('site_id', site.id).is('jobs.deleted_at', null).order('created_at', { referencedTable: 'jobs', ascending: false }).limit(25),
    serviceDb.from('activity_log').select('id,actor_id,action,entity_type,entity_id,site_id,company_id,data,created_at').eq('site_id', site.id).order('created_at', { ascending: false }).limit(30),
  ]);
  if (jobsRes.error || activityRes.error) throw new ApiError(500, 'Portal data could not be loaded.', 'PORTAL_DATA_FAILED');
  res.json({ portal: site, metrics: { jobs: optionalCount(jobsCount), activeJobs: optionalCount(activeJobsCount), users: optionalCount(usersCount) }, jobs: (jobsRes.data || []).map((row) => row.jobs).filter(Boolean), activity: (activityRes.data || []).map(normalizeActivity) });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, from, to, search, sort, ascending } = adminQuery(req.query, ['full_name','email','role','status','created_at'], 'full_name');
  let query = serviceDb.from('profiles').select('id,role,status,email,full_name,phone,headline,location_city,location_province,signup_site_id,created_at', { count: 'exact' }).order(sort, { ascending }).order('id');
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (req.query.role && req.query.role !== 'all') query = query.eq('role', String(req.query.role).slice(0,30));
  if (req.query.status && req.query.status !== 'all') query = query.eq('status', String(req.query.status).slice(0,30));
  const { data, error, count } = await query.range(from, to);
  if (error) throw new ApiError(500, 'Users could not be loaded.', 'USERS_FAILED');
  res.json({ items: data || [], pagination: pageInfo(page, limit, count) });
});

export const listCompanies = asyncHandler(async (req, res) => {
  const { page, limit, from, to, search, sort, ascending } = adminQuery(req.query, ['name','created_at','verification_status','status'], 'created_at');
  const fields = req.query.searchOnly === 'true' ? 'id,name,website' : 'id,name,website,description,status,verification_status,rejection_reason,created_at,verified_at';
  let query = serviceDb.from('companies').select(fields, { count: 'exact' }).is('deleted_at', null).order(sort, { ascending }).order('id');
  if (search) query = query.ilike('name', `%${search}%`);
  if (/^[0-9a-f-]{36}$/i.test(req.query.id || '')) query = query.eq('id', req.query.id);
  if (req.query.verification && req.query.verification !== 'all') query = query.eq('verification_status', String(req.query.verification).slice(0,30));
  const { data, error, count } = await query.range(from, to);
  if (error) throw new ApiError(500, 'Companies could not be loaded.', 'COMPANIES_FAILED');
  res.json({ items: data || [], pagination: pageInfo(page, limit, count) });
});

export const listApplications = asyncHandler(async (req, res) => {
  const { page, limit, from, to, sort, ascending } = adminQuery(req.query, ['created_at','status']);
  let query = serviceDb.from('applications').select('id,status,created_at,jobs:job_id(id,title),profiles:applicant_id(full_name,email)', { count: 'exact' }).is('deleted_at', null).order(sort, { ascending }).order('id');
  if (req.query.status && req.query.status !== 'all') query = query.eq('status', String(req.query.status).slice(0,30));
  const { data, error, count } = await query.range(from, to);
  if (error) throw new ApiError(500, 'Applications could not be loaded.', 'APPLICATIONS_FAILED');
  res.json({ items: data || [], pagination: pageInfo(page, limit, count) });
});

export const changeUserRole = asyncHandler(async (req, res) => {
  if (req.params.userId === req.user.id && req.body.role !== 'admin') {
    throw new ApiError(400, 'You cannot remove your own admin access.', 'SELF_ROLE_CHANGE_BLOCKED');
  }

  // Fetch the target user to verify existence and check their current role
  const { data: targetProfile, error: targetError } = await serviceDb
    .from('profiles')
    .select('id,role,status,email,full_name')
    .eq('id', req.params.userId)
    .maybeSingle();

  if (targetError || !targetProfile) {
    throw new ApiError(404, 'User not found.', 'USER_NOT_FOUND');
  }

  if (targetProfile.role === req.body.role) return res.json({ profile: targetProfile });
  if (req.body.previous_role && req.body.previous_role !== targetProfile.role) throw new ApiError(409, 'This role changed since you opened it. Refresh and try again.', 'STALE_ROLE');

  // Prevent demotion of the last active administrator
  if (targetProfile.role === 'admin' && req.body.role !== 'admin') {
    const { count, error: countError } = await serviceDb
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('status', 'active');

    if (countError) {
      throw new ApiError(500, 'Could not verify administrator count.', 'ADMIN_COUNT_FAILED');
    }

    if ((count || 0) <= 1) {
      throw new ApiError(
        400,
        'Cannot demote the last active administrator. Another active administrator must exist first.',
        'LAST_ADMIN_DEMOTION_BLOCKED',
      );
    }
  }

  const data = await changeAdminRole(serviceDb, { actorId: req.user.id, userId: req.params.userId, role: req.body.role, previousRole: req.body.previous_role || targetProfile.role });

  await writeAuditLog(req, {
    action: 'admin.user.role.update',
    entityType: 'profile',
    entityId: data.id,
    metadata: {
      previousRole: targetProfile.role,
      newRole: data.role,
      email: data.email,
    },
  });

  res.json({ profile: data });
});

export const moderateJob = asyncHandler(async (req, res) => {
  const data = await savePortalJob(serviceDb, {
    actorId: req.user.id,
    jobId: req.params.jobId,
    body: adminJobBody(req.body),
    admin: true,
  });

  await writeAuditLog(req, {
    action: 'admin.job.moderate',
    entityType: 'job',
    entityId: data.id,
    companyId: data.company_id,
    metadata: { status: data.status, reason: data.removed_reason },
  });

  res.json({ job: data });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
    const { page, limit, from, to, search, sort, ascending } = adminQuery(req.query, ['created_at','action','entity_type']);
    let query = serviceDb.from('activity_log').select('id,actor_id,action,entity_type,entity_id,site_id,created_at', { count: 'exact' }).order(sort, { ascending }).order('id');
    if (search) query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%`);
    if (req.query.siteId && /^\d+$/.test(req.query.siteId)) query = query.eq('site_id', Number(req.query.siteId));
    const { data, error, count } = await query.range(from, to);
    if (error) throw new ApiError(500, 'Activity could not be loaded.', 'AUDIT_LOGS_FAILED');
    res.json({ items: data || [], pagination: pageInfo(page, limit, count) });
});
export const listSecurityEvents = asyncHandler(async (req, res) => {
    const { page, limit, from, to, search, sort, ascending } = adminQuery(req.query, ['created_at','severity','event_type']);
    let query = serviceDb.from('security_events').select('id,event_type,severity,created_at,request_id,user_id', { count: 'exact' }).order(sort, { ascending }).order('id');
    if (search) query = query.ilike('event_type', `%${search}%`);
    if (req.query.severity && req.query.severity !== 'all') query = query.eq('severity', String(req.query.severity).slice(0,20));
    const { data, error, count } = await query.range(from, to);
    if (error) throw new ApiError(500, 'Security events could not be loaded.', 'SECURITY_EVENTS_FAILED');
    res.json({ items: data || [], pagination: pageInfo(page, limit, count) });
});
