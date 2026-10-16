import { supabase, isBackendConfigured } from './supabase';
import { apiRequest } from './api';
import { showErrorToast } from './toast';
import { normalizeCategory, normalizeCompany, normalizeJob } from './normalizers';

function normalizeDataset(payload = {}) {
  const companies = (payload.companies || []).map(normalizeCompany);
  const categories = (payload.categories || []).map(normalizeCategory);

  const companyMap = new Map(
    companies.filter((item) => item.id != null).map((item) => [String(item.id), item]),
  );
  const categoryMap = new Map(
    categories.filter((item) => item.id != null).map((item) => [String(item.id), item]),
  );

  const jobs = (payload.jobs || [])
    .map((job) => normalizeJob(job, companyMap, categoryMap))
    .filter((job) => job.id != null);

  return {
    jobs,
    companies,
    categories,
    site: payload.site || null,
    configured: true,
    errors: [],
  };
}

export async function getPublicDataset() {
  try {
    const payload = await apiRequest('/public/dataset');
    return normalizeDataset(payload);
  } catch (error) {
    return {
      jobs: [],
      companies: [],
      categories: [],
      configured: false,
      errors: [error],
    };
  }
}


export async function searchJobs({ page = 1, limit = 10, filters = {} } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });

  try {
    const payload = await apiRequest(`/public/jobs?${params.toString()}`);
    return {
      jobs: (payload.items || []).map((job) => normalizeJob(job)),
      pagination: payload.pagination || { page, limit, total: 0, pages: 0 },
      configured: true,
      error: null,
    };
  } catch (error) {
    return {
      jobs: [],
      pagination: { page, limit, total: 0, pages: 0 },
      configured: false,
      error,
    };
  }
}

export async function getLatestJobs(limit = 6) {
  const dataset = await getPublicDataset();
  const unique = new Map();

  dataset.jobs
    .filter((job) => job.isActive)
    .forEach((job) => {
      if (!unique.has(String(job.id))) unique.set(String(job.id), job);
    });

  return {
    ...dataset,
    jobs: Array.from(unique.values()).slice(0, limit),
  };
}

export async function getJobById(jobId) {
  try {
    const payload = await apiRequest(`/public/jobs/${encodeURIComponent(jobId)}`);
    const job = normalizeJob(payload.job || {});
    return { job, configured: true, error: null };
  } catch (error) {
    return { job: null, configured: true, error };
  }
}

export async function getCompanyById(companyId) {
  try {
    const payload = await apiRequest(`/public/companies/${encodeURIComponent(companyId)}`);
    const company = normalizeCompany(payload.company || {});
    const companyMap = new Map(company.id ? [[String(company.id), company]] : []);
    const jobs = (payload.jobs || []).map((job) => normalizeJob(job, companyMap, new Map()));
    return { company, jobs, configured: true, error: null };
  } catch (error) {
    return { company: null, jobs: [], configured: true, error };
  }
}

export async function createJob(payload) {
  try {
    const result = await apiRequest('/recruiter/jobs', {
      method: 'POST',
      auth: true,
      body: payload,
    });
    return { data: result.job, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getRecruiterCompanies() {
  try {
    const result = await apiRequest('/recruiter/companies', { auth: true });
    return { data: result.items || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function signIn(email, password) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase authentication is not configured.'),
    };
  }

  try {
    const result = await apiRequest('/auth/sign-in', {
      method: 'POST',
      body: { email, password },
    });

    const { data, error } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function signUp(email, password, metadata = {}) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase authentication is not configured.'),
    };
  }

  try {
    const result = await apiRequest('/auth/sign-up', {
      method: 'POST',
      body: {
        email,
        password,
        name: metadata.name || '',
        role: metadata.role === 'recruiter' ? 'recruiter' : 'job_seeker',
        company_name: metadata.company_name || undefined,
        company_website: metadata.company_website || undefined,
        company_registration_number: metadata.company_registration_number || undefined,
      },
    });

    if (result.session) {
      const { data, error } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
      return { data, error, confirmationRequired: false };
    }

    return {
      data: { user: result.user, session: null },
      error: null,
      confirmationRequired: Boolean(result.confirmationRequired),
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut() {
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    showErrorToast(error, 'Sign out failed. Please try again.');
    throw error;
  }
}

export { isBackendConfigured };
