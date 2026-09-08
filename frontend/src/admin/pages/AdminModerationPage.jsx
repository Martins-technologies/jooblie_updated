import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Briefcase, ExternalLink, Loader2 } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { LoadingState } from '../../shared/components/StatusMessage';

export default function AdminJobsPage() {
  const [state, setState] = useState({ loading: true, error: '', jobs: [] });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [portalFilter, setPortalFilter] = useState('all');
  const [workingId, setWorkingId] = useState(null);

  const load = useCallback(async () => {
    try {
      // 🚀 YAHAN DIRECT BACKEND SE SAARI JOBS FETCH HO RAHI HAIN
      const data = await apiRequest('/admin/jobs', { auth: true });
      
      // Agar backend direct array bhej raha hai ya object mein { jobs: [...] } bhej raha hai
      const fetchedJobs = Array.isArray(data) ? data : (data.items || data.jobs || []);
      
      setState({ loading: false, error: '', jobs: fetchedJobs });
    } catch (error) {
      setState({ loading: false, error: error.message, jobs: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateJobStatus = async (jobId, status) => {
    setWorkingId(jobId);
    try {
      // 🚀 BACKEND MEIN JOB KA STATUS UPDATE HO RAHA HAI
      await apiRequest(`/admin/jobs/${jobId}/status`, { 
        method: 'PATCH', 
        auth: true, 
        body: { status } 
      });
      
      // Update hone ke baad backend se fresh data dobara load hoga
      await load(); 
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || 'Job status could not be updated.' }));
    } finally {
      setWorkingId(null);
    }
  };

  // Frontend Filters (Backend se aaye hue data ko search aur filter karne ke liye)
  const filteredJobs = useMemo(() => {
    return state.jobs.filter(job => {
      // Status Filter
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      
      // Portal Filter
      if (portalFilter !== 'all' && job.sites?.slug !== portalFilter) return false;
      
      // Search Filter (Title or Company Name)
      if (search) {
        const query = search.toLowerCase();
        const titleMatch = job.title?.toLowerCase().includes(query);
        const companyMatch = job.companies?.name?.toLowerCase().includes(query);
        if (!titleMatch && !companyMatch) return false;
      }
      
      return true;
    });
  }, [state.jobs, statusFilter, portalFilter, search]);

  return (
    <DashboardLayout title="Platform Job Management" subtitle="View, filter, and manage all jobs posted across the Jooblie network.">
      <div className="dashboard-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
        
        {/* FILTERS & SEARCH BAR */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by job title or company name..." 
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} 
            />
          </div>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '150px' }}>
            <option value="all">All Statuses</option>
            <option value="active">Active (Live)</option>
            <option value="closed">Closed</option>
            <option value="removed">Removed (Banned)</option>
          </select>

          <select value={portalFilter} onChange={e => setPortalFilter(e.target.value)} style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '180px' }}>
            <option value="all">All Portals</option>
            <option value="jooblie">Jooblie (Main)</option>
            <option value="it-jobs">IT Jobline</option>
            <option value="office-jobs">Office Jobline</option>
            <option value="service-care">ServiceCare</option>
            <option value="farmerfreight">FarmerFreight</option>
          </select>
        </div>

        {/* JOBS TABLE */}
        {state.loading ? (
          <LoadingState label="Loading platform jobs..." />
        ) : state.error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
            Error loading jobs: {state.error}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontSize: '0.9rem' }}>
                  <th style={{ padding: '1rem' }}>Job Details</th>
                  <th style={{ padding: '1rem' }}>Company</th>
                  <th style={{ padding: '1rem' }}>Platform</th>
                  <th style={{ padding: '1rem' }}>Posted On</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Admin Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    
                    {/* Job Title & Link */}
                    <td style={{ padding: '1rem' }}>
                      <Link to={`/jobs/${job.id}`} target="_blank" style={{ fontWeight: 'bold', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {job.title} <ExternalLink size={14} />
                      </Link>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                        {job.employment_type?.replace('_', ' ') || 'Full Time'}
                      </span>
                    </td>

                    {/* Company Details Link */}
                    <td style={{ padding: '1rem' }}>
                      <Link to={`/companies/${job.company_id}`} target="_blank" style={{ color: '#111827', textDecoration: 'none', fontWeight: '500' }}>
                        {job.companies?.name || 'Unknown Company'}
                      </Link>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                        {job.city ? `${job.city}, ${job.province}` : 'Remote'}
                      </span>
                    </td>

                    {/* Platform/Portal */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '999px' }}>
                        {job.sites?.slug || 'jooblie'}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                      {job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}
                    </td>

                    {/* Actions (Status Change) */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <select 
                        value={job.status} 
                        disabled={workingId === job.id}
                        onChange={(e) => updateJobStatus(job.id, e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', cursor: 'pointer', backgroundColor: job.status === 'active' ? '#ecfdf5' : job.status === 'removed' ? '#fef2f2' : '#f9fafb', color: job.status === 'active' ? '#059669' : job.status === 'removed' ? '#dc2626' : '#374151', fontWeight: 'bold' }}
                      >
                        <option value="active">Active (Live)</option>
                        <option value="closed">Closed</option>
                        <option value="removed">Remove/Ban</option>
                      </select>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#6b7280' }}>
            <Briefcase size={40} color="#9ca3af" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: 0, color: '#111827' }}>No Jobs Found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
