import { serviceDb } from '../config/supabase.js';
import { ApiError, asyncHandler, parsePagination } from '../utils/http.js';

const publicJobSelect = `
  id,title,description,province,city,is_remote,
  salary_min,salary_max,salary_currency,salary_period,
  employment_type,skills,status,published_at,created_at,updated_at,expires_at,
  company_id,category_id,origin_site_id,
  companies:company_id(id,name,website,logo_path,description,verification_status,status),
  categories:category_id(id,name,slug,sector_id)
`;

function cleanSearch(value) {
  return String(value || '')
    .trim()
    .replace(/[%(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

function normalizeEmploymentType(value) {
  const normalized = cleanSearch(value).toLowerCase().replace(/[\s-]+/g, '_');
  const allowed = new Set(['full_time', 'part_time', 'contract', 'temporary', 'internship', 'seasonal']);
  return allowed.has(normalized) ? normalized : '';
}

async function categoryIdsForSlug(slug) {
  if (!slug) return [];
  const normalized = String(slug).trim().toLowerCase();

  const focusQueries = {
    'it-software': { sector_id: 2 },
    'office-admin': { sector_id: 1 },
    restaurant: { slugs: ['hospitality-guest-services', 'food-beverage'] },
    agriculture: { slugs: ['agriculture-farming'] },
    trucking: { slugs: ['driving-delivery', 'logistics-warehousing'] },
  };

  const focus = focusQueries[normalized];
  if (focus?.sector_id) {
    const { data } = await serviceDb
      .from('categories')
      .select('id')
      .eq('sector_id', focus.sector_id)
      .eq('is_active', true);
    return (data || []).map((row) => row.id);
  }

  if (focus?.slugs) {
    const { data } = await serviceDb
      .from('categories')
      .select('id')
      .in('slug', focus.slugs)
      .eq('is_active', true);
    return (data || []).map((row) => row.id);
  }

  const { data } = await serviceDb
    .from('categories')
    .select('id')
    .eq('slug', normalized)
    .eq('is_active', true)
    .maybeSingle();
  return data?.id ? [data.id] : [];
}

async function categoriesForSite(site) {
  if (!site || site.site_type === 'aggregator' || site.site_type === 'audience') {
    const { data, error } = await serviceDb
      .from('categories')
      .select('id,sector_id,name,slug,sort_order,is_active')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  }

  const { data: mappings, error: mappingError } = await serviceDb
    .from('category_sites')
    .select('category_id')
    .eq('site_id', site.id);

  if (mappingError) throw mappingError;
  const ids = (mappings || []).map((row) => row.category_id);

  let query = serviceDb
    .from('categories')
    .select('id,sector_id,name,slug,sort_order,is_active')
    .eq('is_active', true)
    .order('sort_order');

  if (ids.length) query = query.in('id', ids);
  else if (site.sector_id != null) query = query.eq('sector_id', site.sector_id);
  else return [];

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function applyForeignJobFilters(query, req) {
  const q = cleanSearch(req.query.q);
  const location = cleanSearch(req.query.location);
  const employmentType = normalizeEmploymentType(req.query.type || req.query.jobType);
  const workplace = cleanSearch(req.query.workplace || req.query.workplaceType).toLowerCase();

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%,province.ilike.%${q}%`,
      { referencedTable: 'jobs' },
    );
  }

  if (location) {
    if (location.toLowerCase() === 'remote') {
      query = query.eq('jobs.is_remote', true);
    } else {
      query = query.or(`city.ilike.%${location}%,province.ilike.%${location}%`, { referencedTable: 'jobs' });
    }
  }

  if (employmentType) query = query.eq('jobs.employment_type', employmentType);

  if (workplace === 'remote') query = query.eq('jobs.is_remote', true);
  if (workplace === 'on-site' || workplace === 'onsite' || workplace === 'on_site') {
    query = query.eq('jobs.is_remote', false);
  }

  const salary = String(req.query.salary || '');
  if (salary === '150000+') {
    query = query.gte('jobs.salary_min', 150000);
  } else if (/^\d+-\d+$/.test(salary)) {
    const [min, max] = salary.split('-').map(Number);
    query = query.gte('jobs.salary_min', min).lte('jobs.salary_min', max);
  }

  const days = Number(req.query.date || 0);
  if (Number.isFinite(days) && days > 0 && days <= 3650) {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    query = query.gte('jobs.created_at', cutoff);
  }

  return query;
}

function publicJobBase(siteId, { count = undefined } = {}) {
  return serviceDb
    .from('job_sites')
    .select(`job_id,jobs!inner(${publicJobSelect})`, count ? { count } : undefined)
    .eq('site_id', siteId)
    .eq('jobs.status', 'active')
    .is('jobs.deleted_at', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`, { referencedTable: 'jobs' });
}

export const getDataset = asyncHandler(async (req, res) => {
  const [categoriesResult, companiesRes, jobsRes] = await Promise.all([
    categoriesForSite(req.site).then((data) => ({ data, error: null })).catch((error) => ({ data: [], error })),
    serviceDb
      .from('companies')
      .select('id,name,website,logo_path,description,verification_status,status')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('name')
      .limit(500),
    publicJobBase(req.site.id)
      .order('published_at', { referencedTable: 'jobs', ascending: false, nullsFirst: false })
      .limit(500),
  ]);

  const error = categoriesResult.error || companiesRes.error || jobsRes.error;
  if (error) throw new ApiError(500, 'Public data could not be loaded.', 'PUBLIC_DATA_FAILED');

  res.json({
    site: req.site,
    jobs: (jobsRes.data || []).map((row) => row.jobs).filter(Boolean),
    categories: categoriesResult.data || [],
    companies: companiesRes.data || [],
    configured: true,
    errors: [],
  });
});

export const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, from, to } = parsePagination(req.query, {
    defaultLimit: 10,
    maxLimit: 60,
  });

  let query = publicJobBase(req.site.id, { count: 'exact' });

  if (req.query.category) {
    const categoryIds = await categoryIdsForSlug(req.query.category);
    if (!categoryIds.length) {
      return res.json({
        items: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }
    query = query.in('jobs.category_id', categoryIds);
  }

  query = applyForeignJobFilters(query, req);
  query = query
    .order('published_at', { referencedTable: 'jobs', ascending: false, nullsFirst: false })
    .order('created_at', { referencedTable: 'jobs', ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new ApiError(500, 'Jobs could not be loaded.', 'PUBLIC_JOBS_FAILED', error.message);
  }

  res.json({
    items: (data || []).map((row) => row.jobs).filter(Boolean),
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  });
});

export const getJob = asyncHandler(async (req, res) => {
  const { data: mapping, error: mappingError } = await serviceDb
    .from('job_sites')
    .select('job_id')
    .eq('site_id', req.site.id)
    .eq('job_id', req.params.jobId)
    .maybeSingle();

  if (mappingError || !mapping) {
    throw new ApiError(404, 'This job is not available on this site.', 'JOB_NOT_FOUND');
  }

  const { data, error } = await serviceDb
    .from('jobs')
    .select(publicJobSelect)
    .eq('id', req.params.jobId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data || (data.expires_at && new Date(data.expires_at) <= new Date())) {
    throw new ApiError(404, 'The job could not be found.', 'JOB_NOT_FOUND');
  }

  serviceDb.rpc('increment_job_view', {
    target_job_id: data.id,
    viewer_site_id: req.site.id,
    viewer_ip: req.clientIp,
  }).then(() => null).catch(() => null);

  res.json({ job: data });
});

export const listCompanies = asyncHandler(async (_req, res) => {
  const { data, error } = await serviceDb
    .from('companies')
    .select('id,name,website,logo_path,description,verification_status,status,created_at')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('name');

  if (error) {
    throw new ApiError(500, 'Companies could not be loaded.', 'COMPANIES_FAILED');
  }

  res.json({ items: data || [] });
});

export const getCompany = asyncHandler(async (req, res) => {
  const { data: company, error } = await serviceDb
    .from('companies')
    .select('id,name,website,logo_path,description,verification_status,status,created_at')
    .eq('id', req.params.companyId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !company) {
    throw new ApiError(404, 'Company not found.', 'COMPANY_NOT_FOUND');
  }

  const jobsRes = await publicJobBase(req.site.id)
    .eq('jobs.company_id', company.id)
    .order('published_at', { referencedTable: 'jobs', ascending: false });

  if (jobsRes.error) throw new ApiError(500, 'Company jobs could not be loaded.', 'COMPANY_JOBS_FAILED');

  res.json({
    company,
    jobs: (jobsRes.data || []).map((row) => row.jobs).filter(Boolean),
  });
});

export const listCategories = asyncHandler(async (req, res) => {
  try {
    const items = await categoriesForSite(req.site);
    res.json({ items });
  } catch (error) {
    throw new ApiError(500, 'Categories could not be loaded.', 'CATEGORIES_FAILED', error.message);
  }
});
