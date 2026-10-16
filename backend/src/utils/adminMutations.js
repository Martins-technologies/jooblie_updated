import { ApiError } from './http.js';
import { jobPayload } from './portalJobs.js';

function mutationError(error) {
  if (['PGRST202','42883'].includes(error.code)) return new ApiError(503,'Administration is being upgraded. Please try again after the update is complete.','ADMIN_MIGRATION_REQUIRED');
  if (error.code==='40001') return new ApiError(409,'This record changed while you were editing. Refresh it before trying again.','ADMIN_VERSION_CONFLICT');
  if (error.code==='42501') return new ApiError(403,'Your account cannot perform this action.','FORBIDDEN');
  if (error.code==='P0002') return new ApiError(404,'This record is no longer available.','NOT_FOUND');
  if (/LAST_ADMIN_DEMOTION_BLOCKED/.test(error.message)) return new ApiError(400,'Another active administrator is required before this role can be changed.','LAST_ADMIN_DEMOTION_BLOCKED');
  if (/SELF_ROLE_CHANGE_BLOCKED/.test(error.message)) return new ApiError(400,'You cannot remove your own administrator access.','SELF_ROLE_CHANGE_BLOCKED');
  if (/JOB_VERSION_REQUIRED/.test(error.message)) return new ApiError(400,'Reopen this job before saving changes.','JOB_VERSION_REQUIRED');
  return new ApiError(400,'The change could not be saved. Review the details and try again.','ADMIN_UPDATE_FAILED');
}
export async function updateAdminJob(db,{actorId,jobId,body}) {
  const {data,error}=await db.rpc('admin_update_portal_job',{p_actor_id:actorId,p_job_id:jobId,p_expected_updated_at:body.expected_updated_at||null,p_payload:jobPayload(body,{admin:true})}).single();
  if(error)throw mutationError(error);
  if(!data)throw new ApiError(404,'This job is no longer available.','JOB_NOT_FOUND');
  return data;
}
export async function changeAdminRole(db,{actorId,userId,role,previousRole}) {
  const {data,error}=await db.rpc('admin_change_user_role',{p_actor_id:actorId,p_user_id:userId,p_role:role,p_previous_role:previousRole}).single();
  if(error)throw mutationError(error);
  if(!data)throw new ApiError(404,'This account is no longer available.','USER_NOT_FOUND');
  // The function returns the full DB row; only disclose the management fields.
  return Object.fromEntries(['id','role','status','email','full_name'].map(key=>[key,data[key]]));
}
