import { ApiError } from './http.js';

export async function changeApplicationStatus(db, { applicationId, expectedStatus, status, allowConflict = false }) {
  const { data, error } = await db.from('applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .eq('status', expectedStatus)
    .is('deleted_at', null)
    .select('id,status,updated_at')
    .maybeSingle();
  if (error) {
    throw new ApiError(error.code === '42501' ? 403 : 400, 'Application status could not be updated.', 'APPLICATION_UPDATE_FAILED');
  }
  if (!data && !allowConflict) {
    throw new ApiError(409, 'This application changed. Refresh the candidate list before trying again.', 'APPLICATION_CHANGED');
  }
  return data;
}
