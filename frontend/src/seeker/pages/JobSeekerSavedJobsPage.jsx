import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardTable from '../../shared/components/DashboardTable';
import SkeletonContent from '../../shared/components/Skeleton';
import {StatusBadge, WorkspaceEmpty} from '../../shared/components/WorkspaceCards';
import {formatDate} from '../../shared/lib/format';
import {jobLocation} from '../../shared/lib/dashboardPresentation';
import { ArrowUpRight, RefreshCw, Trash2, Bookmark, BriefcaseBusiness, Building2, Check, MapPin, Search } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import useAccountHistory from '../../shared/hooks/useAccountHistory';
import HistoryPagination from '../../shared/components/HistoryPagination';

export default function JobSeekerSavedJobsPage() {
  const { items: savedJobs, loading, error: loadError, page, pageSize, total, setPage, reload } = useAccountHistory('/job-seeker/saved-jobs');
  const [savingJobs, setSavingJobs] = useState(new Set());
  const [error, setError] = useState('');

  const toggleSaveJob = async (jobId) => {
    const id = String(jobId);
    if (savingJobs.has(id)) return;
    setSavingJobs(c => new Set(c).add(id));
    setError('');
    try {
      // Kyunke yeh page hi 'Saved Jobs' ka hai, to toggle ka matlab Delete hi hoga yahan
      await apiRequest(`/job-seeker/jobs/${jobId}/save`, { method: 'DELETE', auth: true });
      reload();
    } catch (requestError) { setError(requestError.message || 'Saved job could not be removed.'); }
    finally { setSavingJobs(c => { const next = new Set(c); next.delete(id); return next; }); }
  };

  return <DashboardLayout title="Saved jobs" subtitle="Opportunities you have bookmarked to review later."><section className="workspace-panel dashboard-table-panel"><div className="table-section-heading"><h2>Bookmarked roles</h2><button type="button" className="admin-icon" aria-label="Refresh saved jobs" disabled={loading} onClick={reload}><RefreshCw size={15}/></button></div>
    {error&&<div className="error-banner" role="alert">{error}</div>}{loadError&&<div className="error-banner" role="alert">{loadError} <button type="button" onClick={reload}>Try again</button></div>}
    {loading?<SkeletonContent variant="table" columns={['Job','Company','Saved','Status','Actions'].map(label=>({label}))} rows={10} label="Loading saved jobs…"/>:savedJobs.length?<DashboardTable label="Saved jobs" columns={[{label:'Job',width:'32%'},{label:'Company',width:'23%'},{label:'Saved',width:'17%'},{label:'Status',width:'14%'},{label:'Actions',width:'14%'}]}>{savedJobs.map(saved=>{const job=saved.jobs || saved.job || {},id=saved.job_id || job.id;return <tr key={id || saved.created_at}><td>{job.id?<Link className="table-primary" to={`/dashboard/job-seeker/jobs/${id}`}><strong>{job.title || 'Job unavailable'}</strong></Link>:<strong>Job no longer available</strong>}<small>{job.id?jobLocation(job):'This listing is unavailable.'}</small></td><td>{job.companies?.name || job.company_name || '—'}</td><td>{formatDate(saved.created_at) || '—'}</td><td><StatusBadge status={job.status || 'unavailable'}/></td><td><div className="table-cell-actions">{job.id&&<Link className="table-action" to={`/dashboard/job-seeker/jobs/${id}`} aria-label={`View ${job.title || 'job'}`}><ArrowUpRight size={15}/></Link>}<button type="button" className="table-action" aria-label={`Remove ${job.title || 'job'} from saved jobs`} title="Remove bookmark" disabled={!id || savingJobs.has(String(id))} onClick={()=>toggleSaveJob(id)}><Bookmark size={14}/></button></div></td></tr>;})}</DashboardTable>:!loadError&&<WorkspaceEmpty to="/dashboard/job-seeker/jobs" action="Find jobs">You haven’t saved any jobs yet.</WorkspaceEmpty>}
    <HistoryPagination page={page} pageSize={pageSize} total={total} loading={loading} onPageChange={setPage}/>
  </section></DashboardLayout>;
}
