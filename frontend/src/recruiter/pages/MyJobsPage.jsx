import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, MapPin, Briefcase, Filter, Eye, Users, Clock3, MoreHorizontal, Building2 } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { timeAgo } from '../../shared/lib/format';

export default function MyJobsPage() {
  const [state, setState] = useState({ loading: true, error: '', jobs: [] });
  const [jobSearch, setJobSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workplaceFilter, setWorkplaceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [jobsLimit, setJobsLimit] = useState(10);
  const [workingJob, setWorkingJob] = useState(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await apiRequest('/recruiter/dashboard', { auth: true });
      setState({ loading: false, error: '', jobs: data.jobs || [] });
    } catch (error) {
      setState({ loading: false, error: error.message, jobs: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateJobStatus = async (jobId, status) => {
    setWorkingJob(jobId);
    try {
      await apiRequest(`/recruiter/jobs/${jobId}`, { method: 'PATCH', auth: true, body: { status } });
      await load();
    } catch (error) {
      console.error(error);
    } finally {
      setWorkingJob(null);
    }
  };

  const visibleJobs = useMemo(() => {
    const needle = jobSearch.trim().toLowerCase();
    return state.jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (workplaceFilter !== 'all' && job.workplace_type !== workplaceFilter) {
          if (workplaceFilter === 'remote' && !job.is_remote && job.workplace_type !== 'remote') return false;
          if (workplaceFilter !== 'remote' && job.workplace_type !== workplaceFilter) return false;
      }
      if (typeFilter !== 'all' && job.employment_type !== typeFilter) return false;
      if (!needle) return true;
      return [job.title, job.companies?.name, job.categories?.name, job.city, job.province]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [state.jobs, statusFilter, workplaceFilter, typeFilter, jobSearch]);

  return (
    <DashboardLayout 
      title="My Jobs" 
      subtitle="Manage, filter, and track performance of all your listings."
      actions={<Link to="/post-job" className="button button--primary"><Plus size={16}/> Create Job</Link>}
    >
      <div className="dashboard-panel" style={{ padding: '2rem' }}>
        
        {/* ADVANCED FILTER BAR */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input 
              value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} 
              placeholder="Search by title, city, or province..." 
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>
          <div style={{ flex: '1 1 150px' }}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="all">All Statuses</option><option value="active">Active</option><option value="pending_review">Pending Review</option><option value="closed">Closed</option>
              </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
              <select value={workplaceFilter} onChange={(e) => setWorkplaceFilter(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="all">Any Workplace</option><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option>
              </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="all">Any Job Type</option><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option>
              </select>
          </div>
        </div>

        {/* JOBS LIST */}
        {state.loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading jobs...</div>
        ) : visibleJobs.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {visibleJobs.slice(0, jobsLimit).map((job) => (
               <JobPerformanceRow key={job.id} job={job} working={workingJob === job.id} onStatusChange={(s) => updateJobStatus(job.id, s)} />
            ))}
            {visibleJobs.length > jobsLimit && (
              <button className="button button--secondary" onClick={() => setJobsLimit(l => l + 10)} style={{ width: '100%', marginTop: '1rem' }}>
                  Load more jobs ({visibleJobs.length - jobsLimit} remaining)
              </button>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>No jobs match your current filters.</div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Reusable Row Component
function JobPerformanceRow({ job, working, onStatusChange }) {
  const location = job.is_remote || job.workplace_type === 'remote' ? 'Remote' : [job.city, job.province].filter(Boolean).join(', ') || 'Location not specified';
  const formattedType = job.employment_type ? job.employment_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Full Time';
  
  return (
    <article className="recruiter-job-row" style={{ opacity: working ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <div className="recruiter-job-row__main" style={{ flex: 2 }}>
        <div className="recruiter-job-row__titleline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{job.title}</span>
          <span className={`status-pill status-pill--${job.status}`}>{job.status}</span>
        </div>
        <div className="recruiter-job-row__meta" style={{ display: 'flex', gap: '1rem', color: '#6b7280', fontSize: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> {location}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={13} /> {formattedType}</span>
        </div>
      </div>
      
      <div className="recruiter-job-row__performance" style={{ flex: 1, display: 'flex', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Views</span><strong>{Number(job.views_count || 0)}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Applied</span><strong>{Number(job.applications_count || 0)}</strong>
        </div>
      </div>

      <div className="recruiter-job-row__manage" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <select value={job.status} disabled={working} onChange={(e) => onStatusChange(e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
          <option value="active">Active</option>
          <option value="pending_review">Submit for review</option>
          <option value="closed">Close job</option>
        </select>
        <Link className="button button--secondary" to={`/jobs/${job.id}`}>View</Link>
      </div>
    </article>
  );
}