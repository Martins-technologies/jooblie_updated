import DashboardTable, {TablePagination} from '../../shared/components/DashboardTable';
import {StatusBadge} from '../../shared/components/WorkspaceCards';
import Select from '../../shared/components/Select';
import { useCallback, useEffect, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { formatDate } from '../../shared/lib/format';
import { LoadingState } from '../../shared/components/StatusMessage';

const STATUS_OPTIONS = ['submitted', 'viewed', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected'];

export default function CandidatesPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null);
  const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(20);
  useEffect(()=>setPage(1),[search,statusFilter,pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/recruiter/applications?page=1&pageSize=100&status=${encodeURIComponent(statusFilter)}`, { auth: true });
      setApplications(data.items || []);
    } catch (err) { setError(err.message || 'Candidates could not be loaded.'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    setWorking(id);
    try {
      await apiRequest(`/recruiter/applications/${id}`, { method: 'PATCH', auth: true, body: { status } });
      await load();
    } catch (err) { setError(err.message || 'Status update failed.'); }
    finally { setWorking(null); }
  };

  const viewResume = async (id) => {
    setWorking(`resume:${id}`);
    setError('');
    try {
      const result = await apiRequest(`/recruiter/applications/${id}/resume-url`, { auth: true });
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) { setError(err.message || 'Resume could not be opened.'); }
    finally { setWorking(null); }
  };

  const filteredApps = applications.filter(app => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return app.profiles?.full_name?.toLowerCase().includes(q) || app.jobs?.title?.toLowerCase().includes(q);
  });

  const visiblePage=Math.min(page,Math.max(1,Math.ceil(filteredApps.length/pageSize)));
  return <DashboardLayout title="Candidates" subtitle="Review applications, open verified resumes, and move candidates through hiring stages."><section className="workspace-panel dashboard-table-panel">
    {error&&<div className="error-banner" role="alert">{error}</div>}
    <div className="dashboard-table-toolbar"><label className="dashboard-table-search"><Search size={16}/><input aria-label="Search loaded candidates" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search candidate or job title…"/></label><Select aria-label="Filter candidate status" value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All statuses</option>{STATUS_OPTIONS.map(status=><option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</Select></div>
    {loading?<LoadingState variant="table" columns={['Candidate','Job','Applied','Status','Resume'].map(label=>({label}))} rows={pageSize} label="Loading candidates…"/>:filteredApps.length?<><DashboardTable className="dashboard-data-table--candidates" label="Candidates" columns={[{label:'Candidate',width:'26%'},{label:'Job',width:'25%'},{label:'Applied',width:'15%'},{label:'Status',width:'20%'},{label:'Actions',width:'14%'}]}>{filteredApps.slice((visiblePage-1)*pageSize,visiblePage*pageSize).map(app=><tr key={app.id}><td><strong className="table-primary">{app.profiles?.full_name || 'Candidate'}</strong><small>{app.profiles?.headline || 'Application received'}</small></td><td>{app.jobs?.title || 'Job unavailable'}</td><td>{formatDate(app.created_at) || '—'}</td><td><div className="table-cell-actions" style={{justifyContent:'flex-start'}}><Select aria-label={`Application status for ${app.profiles?.full_name || 'candidate'}`} disabled={working===app.id} value={app.status} onChange={event=>updateStatus(app.id,event.target.value)}>{STATUS_OPTIONS.map(status=><option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}{app.status==='withdrawn'&&<option value="withdrawn">withdrawn</option>}</Select></div></td><td><button type="button" className="table-action" disabled={!app.resume_path || working===`resume:${app.id}`} onClick={()=>viewResume(app.id)} title={app.resume_path?'Open secure temporary resume link':'No resume attached'}><FileText size={14}/>{working===`resume:${app.id}`?'Opening…':'Resume'}</button></td></tr>)}</DashboardTable><TablePagination page={visiblePage} pageSize={pageSize} total={filteredApps.length} noun="loaded candidates" onPageChange={setPage} onPageSizeChange={setPageSize}/></>:<div className="admin-state"><Search size={24}/><strong>No candidates found</strong><p>Try another search or status filter.</p></div>}
  </section></DashboardLayout>;
}
