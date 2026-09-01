import { serviceDb } from '../config/supabase.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { writeAuditLog } from '../utils/audit.js';

const audienceSlugs = new Set(['aboriginal', 'newcomers']);
const editableJobFields = [
  'title',
  'company_id',
  'category_id',
  'province',
  'city',
  'is_remote',
  'salary_min',
  'salary_max',
  'salary_currency',
  'salary_period',
  'employment_type',
  'skills',
  'description',
];

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

async function siteById(siteId) {
  const { data, error } = await serviceDb
    .from('sites')
    .select('id,slug,name,site_type,sector_id,is_active')
    .eq('id', siteId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    throw new ApiError(400, 'The job source site is not configured.', 'SOURCE_SITE_INVALID');
  }

  return data;
}

async function assertSourceSiteCompatibility(site, categoryId) {
  if (!site || site.site_type === 'aggregator' || site.site_type === 'audience') return;

  const { data: mappings, error: mappingError } = await serviceDb
    .from('category_sites')
    .select('category_id')
    .eq('site_id', site.id);

  if (mappingError) {
    throw new ApiError(500, 'Portal category configuration could not be checked.', 'SITE_CATEGORY_CHECK_FAILED');
  }

  if ((mappings || []).length > 0) {
    const allowed = mappings.some((row) => Number(row.category_id) === Number(categoryId));
    if (!allowed) {
      throw new ApiError(
        400,
        'The selected category does not belong to this specialist portal.',
        'SITE_CATEGORY_MISMATCH',
      );
    }
    return;
  }

  if (site.sector_id != null) {
    const { data: category } = await serviceDb
      .from('categories')
      .select('id,sector_id')
      .eq('id', categoryId)
      .eq('is_active', true)
      .maybeSingle();

    if (!category || Number(category.sector_id) !== Number(site.sector_id)) {
      throw new ApiError(
        400,
        'The selected category does not belong to this specialist portal.',
        'SITE_CATEGORY_MISMATCH',
      );
    }
  }
}

async function resolveAudienceSiteIds(slugs = [], sourceSite = null) {
  const requested = new Set((slugs || []).filter((slug) => audienceSlugs.has(slug)));
  if (sourceSite && audienceSlugs.has(sourceSite.slug)) requested.add(sourceSite.slug);

  if (!requested.size) return [];

  const { data, error } = await serviceDb
    .from('sites')
    .select('id,slug')
    .in('slug', [...requested])
    .eq('is_active', true);

  if (error) throw new ApiError(500, 'Audience portals could not be resolved.', 'AUDIENCE_SITE_FAILED');

  const found = new Set((data || []).map((row) => row.slug));
  const missing = [...requested].filter((slug) => !found.has(slug));
  if (missing.length) {
    throw new ApiError(400, `Audience portal is not configured: ${missing.join(', ')}`, 'AUDIENCE_SITE_INVALID');
  }

  return (data || []).map((row) => row.id);
}

async function replaceAudienceMappings(jobId, slugs, sourceSite) {
  const ids = await resolveAudienceSiteIds(slugs, sourceSite);

  const { error: deleteError } = await serviceDb
    .from('job_audience_sites')
    .delete()
    .eq('job_id', jobId);

  if (deleteError) {
    throw new ApiError(500, 'Job audience settings could not be updated.', 'AUDIENCE_UPDATE_FAILED');
  }

  if (ids.length) {
    const { error: insertError } = await serviceDb
      .from('job_audience_sites')
      .insert(ids.map((siteId) => ({ job_id: jobId, site_id: siteId })));

    if (insertError) {
      throw new ApiError(500, 'Job audience settings could not be updated.', 'AUDIENCE_UPDATE_FAILED');
    }
  }
}

function pickJobPayload(body) {
  return Object.fromEntries(
    editableJobFields
      .filter((key) => Object.prototype.hasOwnProperty.call(body, key))
      .map((key) => [key, body[key] === '' ? null : body[key]]),
  );
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
      .select('id,title,status,company_id,category_id,province,city,is_remote,employment_type,salary_min,salary_max,salary_currency,salary_period,created_at,published_at')
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
  await assertCompanyAccess(req.user.id, req.body.company_id);
  await assertSourceSiteCompatibility(req.site, req.body.category_id);

  const payload = {
    ...pickJobPayload(req.body),
    created_by: req.user.id,
    origin_site_id: req.site.id,
    status: 'pending_review',
  };

  const { data, error } = await serviceDb
    .from('jobs')
    .insert(payload)
    .select('id,title,status,company_id,category_id,origin_site_id,created_at')
    .single();

  if (error) {
    throw new ApiError(400, 'The job could not be submitted.', 'JOB_CREATE_FAILED', error.message);
  }

  try {
    await replaceAudienceMappings(data.id, req.body.audience_sites || [], req.site);
  } catch (error) {
    await serviceDb.from('jobs').delete().eq('id', data.id);
    throw error;
  }

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
  const { data: existing, error: existingError } = await serviceDb
    .from('jobs')
    .select('id,company_id,category_id,origin_site_id,status')
    .eq('id', req.params.jobId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingError || !existing) throw new ApiError(404, 'Job not found.', 'JOB_NOT_FOUND');

  await assertCompanyAccess(req.user.id, existing.company_id);

  if (req.body.company_id && req.body.company_id !== existing.company_id) {
    await assertCompanyAccess(req.user.id, req.body.company_id);
  }

  const sourceSite = await siteById(existing.origin_site_id);
  const nextCategoryId = req.body.category_id ?? existing.category_id;
  await assertSourceSiteCompatibility(sourceSite, nextCategoryId);

  const payload = pickJobPayload(req.body);
  const contentChanged = Object.keys(payload).length > 0;

  if (req.body.status) {
    payload.status = req.body.status;
    if (req.body.status === 'pending_review') payload.published_at = null;
  } else if (contentChanged && existing.status === 'active') {
    // Editing an approved listing sends it back to moderation rather than silently
    // changing content that is already public.
    payload.status = 'pending_review';
    payload.published_at = null;
  }

  payload.updated_at = new Date().toISOString();

  const { data, error } = await serviceDb
    .from('jobs')
    .update(payload)
    .eq('id', existing.id)
    .select('id,title,status,company_id,category_id,origin_site_id,updated_at')
    .single();

  if (error) throw new ApiError(400, 'The job could not be updated.', 'JOB_UPDATE_FAILED', error.message);

  if (Object.prototype.hasOwnProperty.call(req.body, 'audience_sites')) {
    await replaceAudienceMappings(existing.id, req.body.audience_sites || [], sourceSite);
  }

  await writeAuditLog(req, {
    action: 'job.update',
    entityType: 'job',
    entityId: data.id,
    companyId: data.company_id,
    metadata: { status: data.status },
  });

  res.json({ job: data });
});

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
        .select('id,full_name,headline,location_city,location_province,skills,default_resume_path')
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

export const updateApplication = asyncHandler(async (req, res) => {
  const { data: application } = await serviceDb
    .from('applications')
    .select('id,job_id')
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

  const now = new Date().toISOString();
  const { data, error } = await serviceDb
    .from('applications')
    .update({
      status: req.body.status,
      status_updated_at: now,
      updated_at: now,
    })
    .eq('id', application.id)
    .select('id,status,status_updated_at,updated_at')
    .single();

  if (error) throw new ApiError(400, 'Application status could not be updated.', 'APPLICATION_UPDATE_FAILED');

  await writeAuditLog(req, {
    action: 'application.status.update',
    entityType: 'application',
    entityId: application.id,
    companyId: job.company_id,
    metadata: { status: req.body.status },
  });

  res.json({ application: data });
});
