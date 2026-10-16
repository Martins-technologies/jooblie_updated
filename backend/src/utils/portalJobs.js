import { ApiError } from './http.js';

const editableFields = [
  'title', 'category_id', 'province', 'city', 'is_remote', 'salary_min',
  'salary_max', 'salary_currency', 'salary_period', 'employment_type',
  'workplace_type', 'experience_level', 'skills', 'description', 'status',
];

export function jobPayload(body, { admin = false } = {}) {
  const allowed = admin ? [...editableFields, 'removed_reason'] : editableFields;
  const payload = Object.fromEntries(allowed
    .filter((key) => Object.prototype.hasOwnProperty.call(body, key))
    .map((key) => [key, body[key] === '' ? null : body[key]]));
  if (Object.prototype.hasOwnProperty.call(payload, 'workplace_type')) {
    payload.is_remote = payload.workplace_type === 'remote';
    if (payload.is_remote) {
      payload.city = null;
      payload.province = null;
    }
  }
  return payload;
}

export async function savePortalJob(db, { actorId, jobId = null, siteId = null, body, admin = false }) {
  const { data, error } = await db.rpc('save_portal_job', {
    p_actor_id: actorId,
    p_job_id: jobId,
    p_site_id: siteId,
    p_payload: jobPayload(body, { admin }),
    p_audience_slugs: Object.prototype.hasOwnProperty.call(body, 'audience_sites')
      ? body.audience_sites : (jobId ? null : []),
    p_is_admin: admin,
  }).single();
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new ApiError(503, 'Job publishing is being upgraded. Please try again after the database migration is applied.', 'JOB_MIGRATION_REQUIRED');
    }
    const status = error.code === '42501' ? 403
      : error.code === 'P0002' ? 404
        : error.code === '23505' ? 409 : 400;
    throw new ApiError(status, error.message || 'The job could not be saved.', 'JOB_SAVE_FAILED');
  }
  if (!data) throw new ApiError(404, 'Job not found.', 'JOB_NOT_FOUND');
  return data;
}
