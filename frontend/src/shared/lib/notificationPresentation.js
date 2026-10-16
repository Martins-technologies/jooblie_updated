const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (value, max) => typeof value === 'string' ? value.replace(/\s+/g,' ').trim().slice(0,max) : '';
export function notificationContent(notification, role) {
  const data=notification.data || {};
  const title=clean(data.title,100) || String(notification.type || 'Notification').replaceAll('_',' ');
  const message=clean(data.message || data.body,240);
  const id=uuid.test(notification.entity_id || '')?notification.entity_id:null;
  let to=null;
  if(id && notification.entity_type==='job') to=role==='admin'?`/admin/jobs?jobId=${id}`:role==='job_seeker'?`/dashboard/job-seeker/jobs/${id}`:'/my-jobs';
  if(notification.entity_type==='application') to=role==='admin'?'/admin/applications':role==='recruiter'?'/candidates':'/dashboard/job-seeker/applications';
  if(id && notification.entity_type==='company') to=role==='admin'?`/admin/companies?id=${id}`:role==='recruiter'?'/my-company':null;
  return {title,message,to};
}
