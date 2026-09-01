import { serviceDb } from '../config/supabase.js';
import { ApiError, asyncHandler, parsePagination } from '../utils/http.js';
import { writeAuditLog } from '../utils/audit.js';

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
    metadata: { role: data.role },
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
