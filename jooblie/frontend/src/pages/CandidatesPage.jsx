import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';
import { formatDate } from '../lib/format';

export default function CandidatesPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    try {
      const data = await apiRequest('/recruiter/dashboard', { auth: true });
      setApplications(data.recentApplications || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await apiRequest(`/recruiter/applications/${id}`, { method: 'PATCH', auth: true, body: { status } });
    load();
  };

  const filteredApps = applications.filter(app => {
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (!search) return true;
    return app.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) || app.jobs?.title?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <DashboardLayout title="Candidates" subtitle="Review and update candidate statuses.">
      <div className="dashboard-panel" style={{ padding: '2rem' }}>
        
        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidate or job title..." style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '150px' }}>
            <option value="all">All Statuses</option><option value="submitted">New</option><option value="shortlisted">Shortlisted</option><option value="interviewing">Interviewing</option><option value="hired">Hired</option>
          </select>
        </div>

        {/* List */}
        {loading ? <p>Loading candidates...</p> : filteredApps.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredApps.map(app => (
              <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '1.1rem' }}>{app.profiles?.full_name || 'Candidate'}</strong>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>Applied for: {app.jobs?.title} on {formatDate(app.created_at)}</span>
                </div>
                <select value={app.status} onChange={e => updateStatus(app.id, e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                  <option value="submitted">New</option><option value="viewed">Reviewed</option><option value="shortlisted">Shortlisted</option>
                  <option value="interviewing">Interviewing</option><option value="hired">Hired</option><option value="rejected">Rejected</option>
                </select>
              </div>
            ))}
          </div>
        ) : <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No candidates found.</p>}
      </div>
    </DashboardLayout>
  );
}