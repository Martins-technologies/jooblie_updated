import { ApiError, parsePagination } from './http.js';

export function historyPagination(query = {}) {
  const { page, limit, from, to } = parsePagination(
    { ...query, limit: query.pageSize ?? query.limit },
    { defaultLimit: 25, maxLimit: 100 },
  );
  return { page, pageSize: limit, from, to };
}

export async function loadSeekerHistory(db, { userId, query, kind, jobSelect }) {
  const { page, pageSize, from, to } = historyPagination(query);
  const applications = kind === 'applications';
  const columns = applications
    ? `id,status,created_at,updated_at,job_id,applied_via_site_id,jobs:job_id(${jobSelect})`
    : `created_at,job_id,saved_via_site_id,jobs:job_id(${jobSelect})`;
  let request = db.from(applications ? 'applications' : 'saved_jobs')
    .select(columns, { count: 'exact' })
    .eq(applications ? 'applicant_id' : 'user_id', userId);
  if (applications) request = request.is('deleted_at', null);
  const { data, error, count } = await request
    .order('created_at', { ascending: false })
    .order(applications ? 'id' : 'job_id', { ascending: false })
    .range(from, to);
  if (error) throw new ApiError(500, 'Your saved jobs or applications could not be loaded.', 'HISTORY_LOAD_FAILED');
  return { items: data || [], page, pageSize, total: count || 0 };
}

export async function loadSavedJobStatus(db, userId, rawIds = '') {
  const parts = String(rawIds).split(',').map((value) => value.trim()).filter(Boolean);
  if (parts.length > 100 || parts.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    throw new ApiError(400, 'Provide up to 100 valid job IDs.', 'INVALID_JOB_IDS');
  }
  const ids = [...new Set(parts)];
  if (!ids.length) return { savedJobIds: [] };
  const { data, error } = await db.from('saved_jobs')
    .select('job_id').eq('user_id', userId).in('job_id', ids);
  if (error) throw new ApiError(500, 'Saved job status could not be loaded.', 'SAVED_STATUS_FAILED');
  return { savedJobIds: (data || []).map((row) => row.job_id) };
}
