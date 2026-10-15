import { serviceDb } from '../config/supabase.js';
import { ApiError, asyncHandler, parsePagination } from '../utils/http.js';
import { writeAuditLog } from '../utils/audit.js';


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

export const dashboard = asyncHandler(async (_req, res) => {
  const [
    usersRes,
    companiesRes,
    jobsCountRes,
    appsCountRes,
    pendingCountRes,
    pendingJobsRes,
    sitesRes,
    auditRes,
    securityRes,
  ] = await Promise.all([
    serviceDb
      .from('profiles')
      .select('id,role,status,email,full_name,headline,location_city,location_province,signup_site_id', { count: 'exact' })
      .order('full_name')
      .limit(20),
    serviceDb
      .from('companies')
      .select('id,name,status,verification_status,created_at', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10),
    serviceDb.from('jobs').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    serviceDb.from('applications').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    serviceDb
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'pending_review'),
    serviceDb
      .from('jobs')
      .select('id,title,status,company_id,category_id,origin_site_id,created_at,companies:company_id(name),categories:category_id(name,slug),sites:origin_site_id(name,slug)')
      .is('deleted_at', null)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
      .limit(50),
    serviceDb
      .from('sites')
      .select('id,slug,name,domain,site_type,sector_id,is_active', { count: 'exact' })
      .order('name'),
    serviceDb
      .from('activity_log')
      .select('id,actor_id,action,entity_type,entity_id,site_id,company_id,data,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    serviceDb
      .from('security_events')
      .select('id,user_id,event_type,severity,request_id,client_ip,server_ip,site_id,data,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const required = [usersRes, companiesRes, jobsCountRes, appsCountRes, pendingCountRes, pendingJobsRes, sitesRes, auditRes];
  const firstError = required.find((result) => result.error)?.error;
  if (firstError) throw new ApiError(500, 'Admin dashboard could not be loaded.', 'ADMIN_DASHBOARD_FAILED', firstError.message);

  // security_events is added by the included alignment migration. Keep the dashboard usable
  // during rollout if that migration has not been applied yet.
  const securityEvents = securityRes.error ? [] : (securityRes.data || []);

  res.json({
    metrics: {
      users: usersRes.count || 0,
      companies: companiesRes.count || 0,
      jobs: jobsCountRes.count || 0,
      applications: appsCountRes.count || 0,
      pendingJobs: pendingCountRes.count || 0,
      sites: sitesRes.count || 0,
    },
    recentUsers: usersRes.data || [],
    recentCompanies: companiesRes.data || [],
    pendingJobs: pendingJobsRes.data || [],
    sites: sitesRes.data || [],
    auditLogs: (auditRes.data || []).map(normalizeActivity),
    securityEvents,
  });
});


export const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
  const search = String(req.query.search || req.query.q || '').trim().replace(/[(),]/g, ' ').slice(0, 120);

  let query = serviceDb.from('jobs').select(adminJobSelect, { count: 'exact' }).order('created_at', { ascending: false });
  if (req.query.status && req.query.status !== 'all') query = query.eq('status', String(req.query.status).slice(0, 40));
  if (req.query.siteId) query = query.eq('origin_site_id', Number(req.query.siteId));
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  const { data, error, count } = await query.range(from, to);
  if (error) throw new ApiError(500, 'Admin jobs could not be loaded.', 'ADMIN_JOBS_FAILED', error.message);
  res.json({ items: data || [], pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) } });
});

export const getJob = asyncHandler(async (req, res) => {
  const { data: job, error } = await serviceDb.from('jobs').select(adminJobSelect).eq('id', req.params.jobId).maybeSingle();
  if (error) throw new ApiError(500, 'Admin job could not be loaded.', 'ADMIN_JOB_FAILED', error.message);
  if (!job) throw new ApiError(404, 'Job not found.', 'JOB_NOT_FOUND');
  const [applicationsRes, viewsRes, sitesRes] = await Promise.all([
    serviceDb.from('applications').select('id,status,created_at,profile_id', { count: 'exact' }).eq('job_id', job.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(25),
    serviceDb.from('job_views').select('id,viewed_on,site_id', { count: 'exact' }).eq('job_id', job.id).order('viewed_on', { ascending: false }).limit(30),
    serviceDb.from('job_sites').select('site_id,sites:site_id(id,slug,name,domain,site_type,is_active)').eq('job_id', job.id),
  ]);
  if (applicationsRes.error || viewsRes.error || sitesRes.error) throw new ApiError(500, 'Job details could not be loaded.', 'ADMIN_JOB_DETAILS_FAILED');
  res.json({ job, applications: applicationsRes.data || [], views: viewsRes.data || [], portals: (sitesRes.data || []).map((row) => row.sites).filter(Boolean), metrics: { applications: applicationsRes.count || 0, views: viewsRes.count || 0 } });
});

export const updateJob = asyncHandler(async (req, res) => {
  const { status, moderation_note, ...fields } = req.body;
  const update = { ...fields, updated_at: new Date().toISOString() };
  if (status) update.status = status;
  if (status === 'active') { update.published_at = new Date().toISOString(); update.removed_reason = null; }
  if (status === 'removed') update.removed_reason = moderation_note || 'Removed by administrator';
  if (status === 'pending_review') { update.published_at = null; update.removed_reason = null; }
  const { data, error } = await serviceDb.from('jobs').update(update).eq('id', req.params.jobId).is('deleted_at', null).select(adminJobSelect).single();
  if (error) throw new ApiError(400, 'Job could not be updated.', 'ADMIN_JOB_UPDATE_FAILED', error.message);
  await writeAuditLog(req, { action: 'admin.job.update', entityType: 'job', entityId: data.id, companyId: data.company_id, metadata: { status: data.status, fields: Object.keys(update).filter((key) => key !== 'updated_at') } });
  res.json({ job: data });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const now = new Date().toISOString();
  const { data, error } = await serviceDb.from('jobs').update({ deleted_at: now, updated_at: now, status: 'removed', removed_reason: 'Deleted by administrator' }).eq('id', req.params.jobId).is('deleted_at', null).select('id,title,status,deleted_at,removed_reason,company_id').single();
  if (error) throw new ApiError(400, 'Job could not be deleted.', 'ADMIN_JOB_DELETE_FAILED', error.message);
  await writeAuditLog(req, { action: 'admin.job.delete', entityType: 'job', entityId: data.id, companyId: data.company_id, metadata: { reason: data.removed_reason } });
  res.json({ job: data });
});

export const listPortals = asyncHandler(async (_req, res) => {
  const { data, error } = await serviceDb.from('sites').select('id,slug,name,domain,site_type,sector_id,is_active').order('name');
  if (error) throw new ApiError(500, 'Portals could not be loaded.', 'PORTALS_FAILED', error.message);
  const portals = await Promise.all((data || []).map(async (site) => {
    const [jobsRes, usersRes] = await Promise.all([
      serviceDb.from('job_sites').select('job_id', { count: 'exact', head: true }).eq('site_id', site.id),
      serviceDb.from('profiles').select('id', { count: 'exact', head: true }).eq('signup_site_id', site.id),
    ]);
    return { ...site, metrics: { jobs: jobsRes.count || 0, users: usersRes.count || 0 } };
  }));
  res.json({ items: portals });
});

export const getPortal = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();
  const { data: site, error: siteError } = await serviceDb.from('sites').select('id,slug,name,domain,site_type,sector_id,is_active').eq('slug', slug).maybeSingle();
  if (siteError) throw new ApiError(500, 'Portal could not be loaded.', 'PORTAL_FAILED', siteError.message);
  if (!site) throw new ApiError(404, 'Portal not found.', 'PORTAL_NOT_FOUND');
  const [jobsCount, activeJobsCount, usersCount, jobsRes, activityRes] = await Promise.all([
    serviceDb.from('job_sites').select('job_id', { count: 'exact', head: true }).eq('site_id', site.id),
    serviceDb.from('job_sites').select('job_id,jobs!inner(id)', { count: 'exact', head: true }).eq('site_id', site.id).eq('jobs.status', 'active').is('jobs.deleted_at', null),
    serviceDb.from('profiles').select('id', { count: 'exact', head: true }).eq('signup_site_id', site.id),
    serviceDb.from('job_sites').select('job_id,jobs!inner(id,title,status,created_at,published_at,company_id,companies:company_id(name))').eq('site_id', site.id).order('created_at', { referencedTable: 'jobs', ascending: false }).limit(25),
    serviceDb.from('activity_log').select('id,actor_id,action,entity_type,entity_id,site_id,company_id,data,created_at').eq('site_id', site.id).order('created_at', { ascending: false }).limit(30),
  ]);
  if (jobsRes.error || activityRes.error) throw new ApiError(500, 'Portal data could not be loaded.', 'PORTAL_DATA_FAILED');
  res.json({ portal: site, metrics: { jobs: jobsCount.count || 0, activeJobs: activeJobsCount.count || 0, users: usersCount.count || 0 }, jobs: (jobsRes.data || []).map((row) => row.jobs).filter(Boolean), activity: (activityRes.data || []).map(normalizeActivity) });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
  const { data, error, count } = await serviceDb
    .from('profiles')
    .select('id,role,status,email,full_name,phone,headline,location_city,location_province,signup_site_id', { count: 'exact' })
    .order('full_name')
    .range(from, to);

  if (error) throw new ApiError(500, 'Users could not be loaded.', 'USERS_FAILED');
  res.json({ items: data || [], pagination: { page, limit, total: count || 0 } });
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

  const { data, error } = await serviceDb
    .from('profiles')
    .update({ role: req.body.role })
    .eq('id', req.params.userId)
    .select('id,role,status,email,full_name')
    .single();

  if (error) throw new ApiError(400, 'User role could not be updated.', 'ROLE_UPDATE_FAILED');

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
  const now = new Date().toISOString();
  const update = {
    status: req.body.status,
    updated_at: now,
  };

  if (req.body.status === 'active') {
    update.published_at = now;
    update.removed_reason = null;
  } else if (req.body.status === 'removed') {
    update.removed_reason = req.body.moderation_note || 'Removed by administrator';
  } else if (req.body.status === 'pending_review') {
    update.published_at = null;
    update.removed_reason = null;
  }

  const { data, error } = await serviceDb
    .from('jobs')
    .update(update)
    .eq('id', req.params.jobId)
    .is('deleted_at', null)
    .select('id,title,status,company_id,published_at,removed_reason')
    .single();

  if (error) throw new ApiError(400, 'Job moderation failed.', 'JOB_MODERATION_FAILED');

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
  const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });

  const { data, error, count } = await serviceDb
    .from('activity_log')
    .select('id,actor_id,action,entity_type,entity_id,site_id,company_id,data,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new ApiError(500, 'Audit logs could not be loaded.', 'AUDIT_LOGS_FAILED');
  res.json({ items: (data || []).map(normalizeActivity), pagination: { page, limit, total: count || 0 } });
});

export const listSecurityEvents = asyncHandler(async (req, res) => {
  const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });

  let query = serviceDb
    .from('security_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (req.query.severity) {
    query = query.eq('severity', String(req.query.severity).trim().slice(0, 20));
  }
  if (req.query.eventType) {
    query = query.eq('event_type', String(req.query.eventType).trim().slice(0, 120));
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw new ApiError(500, 'Security events could not be loaded.', 'SECURITY_EVENTS_FAILED');
  res.json({ items: data || [], pagination: { page, limit, total: count || 0 } });
});
