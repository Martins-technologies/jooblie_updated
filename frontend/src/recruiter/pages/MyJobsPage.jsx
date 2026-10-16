import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, MapPin, Briefcase, ArrowRight } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import DashboardTable, { TablePagination, TableStatusTabs } from '../../shared/components/DashboardTable';
import Select from '../../shared/components/Select';
import SkeletonContent from '../../shared/components/Skeleton';
import { PanelHeading, StatusBadge, WorkspaceEmpty } from '../../shared/components/WorkspaceCards';
import { apiRequest } from '../../shared/lib/api';
import { jobLocation, humanize } from '../../shared/lib/dashboardPresentation';

export default function MyJobsPage() {
  const [state, setState] = useState({ loading: true, error: '', jobs: [] });
  const [query, setQuery] = useState(''), [status, setStatus] = useState('all'), [workplace, setWorkplace] = useState('all'), [type, setType] = useState('all');
  const [limit, setLimit] = useState(10), [page,setPage] = useState(1), [working, setWorking] = useState(null); const pending = useRef(new Set());
  const load = useCallback(async signal => {
    try { const data = await apiRequest('/recruiter/dashboard', { auth: true, signal }); if (!signal?.aborted) setState({ loading: false, error: '', jobs: data.jobs || [] }); }
    catch (error) { if (error.name !== 'AbortError') setState(current => ({ ...current, loading: false, error: error.message })); }
  }, []);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
  const updateStatus = async (job, next) => {
    if (next === job.status || pending.current.has(job.id)) return;
    pending.current.add(job.id); setWorking(job.id);
    try { const result = await apiRequest(`/recruiter/jobs/${job.id}`, { method: 'PATCH', auth: true, body: { status: next } }); setState(current => ({ ...current, jobs: current.jobs.map(row => row.id === job.id ? { ...row, ...result.job, status: result.job?.status || next } : row) })); }
    catch (error) { setState(current => ({ ...current, error: error.message })); }
    finally { pending.current.delete(job.id); setWorking(null); }
  };
  const filtered = useMemo(() => state.jobs.filter(job => {
    if (status !== 'all' && job.status !== status) return false;
    const actualWorkplace = job.is_remote ? 'remote' : job.workplace_type || 'onsite';
    if (workplace !== 'all' && actualWorkplace !== workplace) return false;
    if (type !== 'all' && job.employment_type !== type) return false;
    return !query.trim() || [job.title, job.companies?.name, job.city, job.province].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase());
  }), [state.jobs, status, workplace, type, query]);
  useEffect(()=>setPage(1),[query,status,workplace,type,limit]);
  const pages=Math.max(1,Math.ceil(filtered.length/limit));
  const visiblePage=Math.min(page,pages);
  const filter = setter => event => { setter(event.target.value); setLimit(10); };
  return <DashboardLayout title="Your opportunities" subtitle="Every great team starts with the right opportunity. Manage yours here." actions={<Link to="/post-job" className="button button--primary"><Plus size={16} />Post a job</Link>}>
    <section className="workspace-panel dashboard-table-panel">
      {state.error && <div className="error-banner" role="alert">{state.error}</div>}
      <div className="dashboard-table-toolbar"><div className="dashboard-table-search"><Search size={16} /><input value={query} onChange={filter(setQuery)} aria-label="Search your jobs" placeholder="Search title or location..." /></div>

        <Select aria-label="Filter by workplace" value={workplace} onChange={filter(setWorkplace)}><option value="all">Any workplace</option><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></Select>
        <Select aria-label="Filter by employment type" value={type} onChange={filter(setType)}><option value="all">Any job type</option><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="temporary">Temporary</option><option value="internship">Internship</option><option value="seasonal">Seasonal</option></Select>
      </div>
      <TableStatusTabs value={status} onChange={setStatus} items={[['all','All jobs',state.loading?null:state.jobs.length],['active','Active',state.loading?null:state.jobs.filter(job=>job.status==='active').length],['pending_review','Pending review',state.loading?null:state.jobs.filter(job=>job.status==='pending_review').length],['closed','Closed',state.loading?null:state.jobs.filter(job=>job.status==='closed').length]]}/>
      {state.loading ? <SkeletonContent variant="table" columns={['Job','Type','Views','Applicants','Status','Actions'].map(label=>({label}))} rows={limit} label="Loading job listings..."/> : filtered.length ? <><DashboardTable className="dashboard-data-table--managed-jobs" label="Your jobs" columns={[{label:'Job',width:'28%'},{label:'Type',width:'15%'},{label:'Views',width:'9%',align:'right'},{label:'Applicants',width:'10%',align:'right'},{label:'Status',width:'14%'},{label:'Actions',width:'24%'}]}>{filtered.slice((visiblePage-1)*limit,visiblePage*limit).map(job=><tr key={job.id} aria-busy={pending.current.has(job.id)}><td><strong className="table-primary">{job.title}</strong><small className="table-job-location"><MapPin size={11}/>{jobLocation(job)}</small></td><td>{humanize(job.employment_type)}</td><td className="is-numeric">{Number(job.views_count||0).toLocaleString()}</td><td className="is-numeric">{Number(job.applications_count||0).toLocaleString()}</td><td><StatusBadge status={job.status}/></td><td><div className="table-cell-actions"><Select aria-label={`Status for ${job.title}`} value={job.status} disabled={pending.current.has(job.id)} onChange={event=>updateStatus(job,event.target.value)}><option value="active">Active</option><option value="pending_review">Pending review</option><option value="closed">Closed</option>{!['active','pending_review','closed'].includes(job.status)&&<option value={job.status} disabled>{humanize(job.status)}</option>}</Select><Link to={`/jobs/${job.id}`} className="table-action" aria-label={`View ${job.title}`}>View<ArrowRight size={12}/></Link></div></td></tr>)}</DashboardTable><TablePagination page={visiblePage} pageSize={limit} total={filtered.length} noun="jobs" onPageChange={setPage} onPageSizeChange={setLimit}/></>
        : <WorkspaceEmpty to={state.jobs.length ? undefined : '/post-job'} action="Post your first job">{state.jobs.length ? 'No opportunities match these filters. Try a different search.' : 'Your opportunities will appear here once you post a job.'}{state.jobs.length > 0 && <div style={{ marginTop: 12 }}><button type="button" className="text-button" onClick={() => { setQuery(''); setStatus('all'); setWorkplace('all'); setType('all'); }}>Clear filters</button></div>}</WorkspaceEmpty>}
    </section>
  </DashboardLayout>;
}
