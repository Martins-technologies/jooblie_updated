import { serviceDb } from '../config/supabase.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { writeAuditLog } from '../utils/audit.js';
import { savePortalJob } from '../utils/portalJobs.js';
import { changeApplicationStatus } from '../utils/applicationStatus.js';

async function recruiterCompanyIds(userId) {
  const { data, error } = await serviceDb
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId);

  if (error) {
    throw new ApiError(500, 'Company permissions could not be loaded.', 'COMPANY_ACCESS_FAILED');
  }

  return [...new Set((data || []).map((row) => row.company_id))];
}

async function assertCompanyAccess(userId, companyId) {
  const ids = await recruiterCompanyIds(userId);
  if (!ids.includes(companyId)) {
    throw new ApiError(403, 'You cannot manage jobs for this company.', 'COMPANY_FORBIDDEN');
  }
}

const companySelectFields = 'id,name,website,registration_number,verification_document_path,logo_path,description,verification_status,status,created_at';

const editableCompanyFields = [
  'name',
  'website',
  'registration_number',
  'verification_document_path',
  'logo_path',
  'description',
];

function pickCompanyPayload(body) {
  return Object.fromEntries(
    editableCompanyFields
      .filter((key) => Object.prototype.hasOwnProperty.call(body, key))
      .map((key) => [key, body[key] === '' ? null : body[key]]),
  );
}

function mapCompanyUpdateError(error) {
  if (error?.code === '23505' || String(error?.message || '').includes('companies_lower_name_live_idx')) {
    throw new ApiError(
      409,
      'That company name is already registered. Please use the existing company or choose a different name.',
      'COMPANY_NAME_TAKEN',
    );
  }

  throw new ApiError(400, 'The company could not be updated.', 'COMPANY_UPDATE_FAILED', error?.message);
}


async function loadApplicationStats(jobIds) {
  if (!jobIds.length) return [];

  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await serviceDb
      .from('applications')
      .select('job_id,status')
      .in('job_id', jobIds)
      .is('deleted_at', null)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new ApiError(500, 'Application statistics could not be loaded.', 'APPLICATION_STATS_FAILED');
    }

    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function loadViewStats(jobIds) {
  if (!jobIds.length) return [];

  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await serviceDb
      .from('job_views')
      .select('job_id')
      .in('job_id', jobIds)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new ApiError(500, 'Job view statistics could not be loaded.', 'VIEW_STATS_FAILED');
    }

    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export const listCompanies = asyncHandler(async (req, res) => {
  const ids = await recruiterCompanyIds(req.user.id);
  if (!ids.length) return res.json({ items: [] });

  const { data, error } = await serviceDb
    .from('companies')
    .select('id,name,website,registration_number,verification_document_path,logo_path,description,verification_status,status,created_at')
    .in('id', ids)
    .is('deleted_at', null)
    .order('name');

  if (error) throw new ApiError(500, 'Your companies could not be loaded.', 'COMPANIES_FAILED');
  res.json({ items: data || [] });
});

export const createCompany = asyncHandler(async (req, res) => {
  const payload = {
    name: req.body.name,
    website: req.body.website,
    registration_number: req.body.registration_number,
    verification_document_path: req.body.verification_document_path || null,
    logo_path: req.body.logo_path || null,
    description: req.body.description || null,
    created_by: req.user.id,
  };

  const { data: company, error } = await serviceDb
    .from('companies')
    .insert(payload)
    .select('id,name,website,registration_number,verification_document_path,logo_path,description,verification_status,status,created_at')
    .single();

  if (error) {
    throw new ApiError(400, 'The company could not be created.', 'COMPANY_CREATE_FAILED', error.message);
  }

  const { error: memberError } = await serviceDb
    .from('company_members')
    .insert({
      company_id: company.id,
      user_id: req.user.id,
      role: 'owner',
    });

  if (memberError) {
    await serviceDb.from('companies').delete().eq('id', company.id);
    throw new ApiError(400, 'Company ownership could not be created.', 'COMPANY_MEMBER_FAILED');
  }

  await writeAuditLog(req, {
    action: 'company.create',
    entityType: 'company',
    entityId: company.id,
    companyId: company.id,
  });

  res.status(201).json({ company });
});

export const updateCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  const { data: existing, error: existingError } = await serviceDb
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingError || !existing) {
    throw new ApiError(404, 'Company not found.', 'COMPANY_NOT_FOUND');
  }

  await assertCompanyAccess(req.user.id, companyId);

  const payload = pickCompanyPayload(req.body);

  if (!Object.keys(payload).length) {
    const { data: company, error } = await serviceDb
      .from('companies')
      .select(companySelectFields)
      .eq('id', companyId)
      .single();

    if (error) mapCompanyUpdateError(error);
    return res.json({ company });
  }

  const { data: company, error } = await serviceDb
    .from('companies')
    .update(payload)
    .eq('id', companyId)
    .select(companySelectFields)
    .single();

  if (error) mapCompanyUpdateError(error);

  await writeAuditLog(req, {
    action: 'company.update',
    entityType: 'company',
    entityId: company.id,
    companyId: company.id,
    metadata: { fields: Object.keys(payload) },
  });

  res.json({ company });
});

export const dashboard = asyncHandler(async (req, res) => {
  const companyIds = await recruiterCompanyIds(req.user.id);

  if (!companyIds.length) {
    return res.json({
      metrics: { companies: 0, jobs: 0, activeJobs: 0, applications: 0, views: 0 },
      pipeline: {
        submitted: 0,
        viewed: 0,
        shortlisted: 0,
        interviewing: 0,
        offered: 0,
        hired: 0,
        rejected: 0,
        withdrawn: 0,
      },
      companies: [],
      jobs: [],
      recentApplications: [],
    });
  }

  const [companiesRes, jobsRes, activeJobsRes] = await Promise.all([
    serviceDb
      .from('companies')
      .select('id,name,website,logo_path,verification_status,status')
      .in('id', companyIds)
      .is('deleted_at', null),
    serviceDb
      .from('jobs')
      .select('id,title,status,company_id,category_id,province,city,is_remote,employment_type,workplace_type,experience_level,salary_min,salary_max,salary_currency,salary_period,created_at,published_at')
      .in('company_id', companyIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100),
    serviceDb
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .in('company_id', companyIds)
      .is('deleted_at', null)
      .eq('status', 'active'),
  ]);

  const firstError = [companiesRes, jobsRes, activeJobsRes].find((result) => result.error)?.error;
  if (firstError) throw new ApiError(500, 'Recruiter dashboard could not be loaded.', 'DASHBOARD_LOAD_FAILED');

  const jobs = jobsRes.data || [];
  const jobIds = jobs.map((job) => job.id);
  const categoryIds = [...new Set(jobs.map((job) => job.category_id).filter(Boolean))];

  const [recentAppsRes, applicationStats, viewRows, categoriesRes] = await Promise.all([
    jobIds.length
      ? serviceDb
        .from('applications')
        .select('id,job_id,applicant_id,status,created_at,updated_at', { count: 'exact' })
        .in('job_id', jobIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(30)
      : Promise.resolve({ data: [], error: null, count: 0 }),
    loadApplicationStats(jobIds),
    loadViewStats(jobIds),
    categoryIds.length
      ? serviceDb.from('categories').select('id,name,slug').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const secondError = [recentAppsRes, categoriesRes].find((result) => result.error)?.error;
  if (secondError) throw new ApiError(500, 'Recruiter dashboard could not be loaded.', 'DASHBOARD_LOAD_FAILED');

  const recentApplicationsRaw = recentAppsRes.data || [];
  const applicantIds = [...new Set(recentApplicationsRaw.map((item) => item.applicant_id).filter(Boolean))];
  const { data: applicants = [], error: applicantError } = applicantIds.length
    ? await serviceDb
      .from('profiles')
      .select('id,full_name,headline,location_city,location_province')
      .in('id', applicantIds)
    : { data: [], error: null };

  if (applicantError) throw new ApiError(500, 'Candidate profiles could not be loaded.', 'APPLICANTS_FAILED');

  const companyMap = new Map((companiesRes.data || []).map((item) => [item.id, item]));
  const categoryMap = new Map((categoriesRes.data || []).map((item) => [Number(item.id), item]));
  const applicantMap = new Map((applicants || []).map((item) => [item.id, item]));
  const jobMap = new Map(jobs.map((job) => [job.id, job]));
  const viewCounts = new Map();
  const applicationCounts = new Map();
  const applicationStatusCounts = new Map();
  const pipeline = {
    submitted: 0,
    viewed: 0,
    shortlisted: 0,
    interviewing: 0,
    offered: 0,
    hired: 0,
    rejected: 0,
    withdrawn: 0,
  };

  viewRows.forEach((row) => {
    viewCounts.set(row.job_id, (viewCounts.get(row.job_id) || 0) + 1);
  });

  applicationStats.forEach((row) => {
    applicationCounts.set(row.job_id, (applicationCounts.get(row.job_id) || 0) + 1);

    const byStatus = applicationStatusCounts.get(row.job_id) || {};
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    applicationStatusCounts.set(row.job_id, byStatus);

    if (Object.prototype.hasOwnProperty.call(pipeline, row.status)) {
      pipeline[row.status] += 1;
    }
  });

  const jobsWithRelations = jobs.map((job) => ({
    ...job,
    companies: companyMap.get(job.company_id) || null,
    categories: categoryMap.get(Number(job.category_id)) || null,
    views_count: viewCounts.get(job.id) || 0,
    applications_count: applicationCounts.get(job.id) || 0,
    application_status_counts: applicationStatusCounts.get(job.id) || {},
  }));

  const recentApplications = recentApplicationsRaw.map((application) => ({
    ...application,
    profiles: applicantMap.get(application.applicant_id) || null,
    jobs: (() => {
      const job = jobMap.get(application.job_id);
      return job ? { id: job.id, title: job.title, company_id: job.company_id } : null;
    })(),
  }));

  res.json({
    metrics: {
      companies: companyIds.length,
      jobs: jobs.length,
      activeJobs: activeJobsRes.count || 0,
      applications: recentAppsRes.count || applicationStats.length,
      views: viewRows.length,
    },
    pipeline,
    companies: companiesRes.data || [],
    jobs: jobsWithRelations,
    recentApplications,
  });
});

export const createJob = asyncHandler(async (req, res) => {
  const data = await savePortalJob(serviceDb, {
    actorId: req.user.id,
    siteId: req.site.id,
    body: req.body,
  });

  await writeAuditLog(req, {
    action: 'job.create',
    entityType: 'job',
    entityId: data.id,
    companyId: data.company_id,
    metadata: {
      origin_site: req.site.slug,
      category_id: data.category_id,
      audience_sites: req.body.audience_sites || [],
    },
  });

  res.status(201).json({ job: data });
});

export const updateJob = asyncHandler(async (req, res) => {
  const data = await savePortalJob(serviceDb, {
    actorId: req.user.id,
    jobId: req.params.jobId,
    siteId: req.site.id,
    body: req.body,
  });

  await writeAuditLog(req, {
    action: 'job.update',
    entityType: 'job',
    entityId: data.id,
    companyId: data.company_id,
    metadata: { status: data.status },
  });

  res.json({ job: data });
});

const recruiterAllowedTransitions = {
  submitted: new Set(['submitted', 'viewed', 'shortlisted', 'rejected']),
  viewed: new Set(['viewed', 'shortlisted', 'interviewing', 'rejected']),
  shortlisted: new Set(['shortlisted', 'interviewing', 'rejected']),
  interviewing: new Set(['interviewing', 'offered', 'rejected']),
  offered: new Set(['offered', 'hired', 'rejected']),
  hired: new Set(['hired']),
  rejected: new Set(['rejected']),
  withdrawn: new Set(['withdrawn']),
};

export const listApplications = asyncHandler(async (req, res) => {
  const { data: job } = await serviceDb
    .from('jobs')
    .select('id,company_id')
    .eq('id', req.params.jobId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!job) throw new ApiError(404, 'Job not found.', 'JOB_NOT_FOUND');
  await assertCompanyAccess(req.user.id, job.company_id);

  const { data, error } = await serviceDb
    .from('applications')
    .select('id,status,cover_letter,resume_path,created_at,updated_at,applicant_id')
    .eq('job_id', job.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new ApiError(500, 'Applications could not be loaded.', 'APPLICATIONS_FAILED');

  const applicantIds = [...new Set((data || []).map((item) => item.applicant_id))];
  const { data: profiles = [] } = applicantIds.length
    ? await serviceDb
        .from('profiles')
        .select('id,full_name,headline,location_city,location_province,skills,default_resume_path,experience,education')
        .in('id', applicantIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  res.json({
    items: (data || []).map((application) => ({
      ...application,
      profiles: profileMap.get(application.applicant_id) || null,
    })),
  });
});

export const listAllApplications = asyncHandler(async (req, res) => {
  const companyIds = await recruiterCompanyIds(req.user.id);
  if (!companyIds.length) return res.json({ items: [], page: 1, pageSize: 25, total: 0 });

  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 25));
  const from = (page - 1) * pageSize;
  let query = serviceDb.from('applications').select('id,status,cover_letter,resume_path,created_at,updated_at,applicant_id,job_id,jobs!inner(id,title,company_id)', { count: 'exact' })
    .in('jobs.company_id', companyIds).is('deleted_at', null).order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  if (req.query.status && req.query.status !== 'all') query = query.eq('status', req.query.status);
  const { data, error, count } = await query;
  if (error) throw new ApiError(500, 'Candidates could not be loaded.', 'CANDIDATES_FAILED', error.message);
  const applicantIds = [...new Set((data || []).map((item) => item.applicant_id))];
  const { data: profiles = [] } = applicantIds.length ? await serviceDb.from('profiles').select('id,full_name,headline,location_city,location_province,skills,experience,education,default_resume_path').in('id', applicantIds) : { data: [] };
  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  res.json({ items: (data || []).map((application) => ({ ...application, profiles: profileMap.get(application.applicant_id) || null })), page, pageSize, total: count || 0 });
});

// 🔥 YAHAN FIX HAI: getApplicationResumeUrl updated to use req.db for update
export const getApplicationResumeUrl = asyncHandler(async (req, res) => {
  const { data: application } = await serviceDb
    .from('applications')
    .select('id,resume_path,job_id,status') 
    .eq('id', req.params.applicationId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!application?.resume_path) throw new ApiError(404, 'Resume not found.', 'RESUME_NOT_FOUND');

  const { data: job } = await serviceDb
    .from('jobs')
    .select('company_id')
    .eq('id', application.job_id)
    .maybeSingle();

  if (!job) throw new ApiError(404, 'Application job not found.', 'APPLICATION_NOT_FOUND');
  
  await assertCompanyAccess(req.user.id, job.company_id);

  const { data: signed, error } = await serviceDb.storage
    .from('resumes')
    .createSignedUrl(application.resume_path, 300);

  if (error || !signed?.signedUrl) throw new ApiError(404, 'Resume is not available.', 'RESUME_URL_FAILED');

  await writeAuditLog(req, { 
    action: 'application.resume.view', 
    entityType: 'application', 
    entityId: application.id, 
    companyId: job.company_id 
  });

  // Automatically mark as viewed if it was just submitted
  if (application.status === 'submitted') {
    await changeApplicationStatus(req.db, {
      applicationId: application.id,
      expectedStatus: 'submitted',
      status: 'viewed',
      allowConflict: true,
    });
  }

  res.json({ url: signed.signedUrl, expiresIn: 300 });
});

// 🔥 YAHAN BHI FIX HAI: updateApplication updated to use req.db
export const updateApplication = asyncHandler(async (req, res) => {
  const { data: application } = await serviceDb
    .from('applications')
    .select('id,job_id,status')
    .eq('id', req.params.applicationId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!application) throw new ApiError(404, 'Application not found.', 'APPLICATION_NOT_FOUND');

  const { data: job } = await serviceDb
    .from('jobs')
    .select('company_id')
    .eq('id', application.job_id)
    .maybeSingle();

  if (!job) throw new ApiError(404, 'Application job not found.', 'APPLICATION_NOT_FOUND');
  await assertCompanyAccess(req.user.id, job.company_id);

  const allowed = recruiterAllowedTransitions[application.status] || new Set();
  if (!allowed.has(req.body.status)) {
    throw new ApiError(409, `Application cannot move from ${application.status} to ${req.body.status}.`, 'INVALID_APPLICATION_TRANSITION');
  }

  const data = await changeApplicationStatus(req.db, {
    applicationId: application.id,
    expectedStatus: application.status,
    status: req.body.status,
  });

  await writeAuditLog(req, {
    action: 'application.status.update',
    entityType: 'application',
    entityId: application.id,
    companyId: job.company_id,
    metadata: { status: req.body.status },
  });

  res.json({ application: data });
});
