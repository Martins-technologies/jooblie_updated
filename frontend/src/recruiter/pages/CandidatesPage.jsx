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

  return (
    <DashboardLayout title="Candidates" subtitle="Review applications, open verified resumes, and move candidates through hiring stages.">
      <div className="dashboard-panel" style={{ padding: '2rem' }}>
        {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidate or job title..." style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '170px' }}>
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
          </select>
        </div>

        {loading ? <LoadingState label="Loading candidates..." /> : filteredApps.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredApps.map(app => (
              <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <strong style={{ display: 'block', fontSize: '1.1rem' }}>{app.profiles?.full_name || 'Candidate'}</strong>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>Applied for: {app.jobs?.title || 'Job'} on {formatDate(app.created_at)}</span>
                  {app.profiles?.headline && <div style={{ color: '#374151', marginTop: '0.35rem', fontSize: '0.9rem' }}>{app.profiles.headline}</div>}
                </div>
                <button type="button" className="button button--secondary" disabled={!app.resume_path || working === `resume:${app.id}`} onClick={() => viewResume(app.id)} title={app.resume_path ? 'Open secure temporary resume link' : 'No resume attached'}>
                  <FileText size={15} /> {working === `resume:${app.id}` ? 'Opening...' : 'View Resume'}
                </button>
                <select disabled={working === app.id} value={app.status} onChange={e => updateStatus(app.id, e.target.value)} style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                  {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                  {app.status === 'withdrawn' && <option value="withdrawn">withdrawn</option>}
                </select>
              </div>
            ))}
          </div>
        ) : <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No candidates found.</p>}
      </div>
    </DashboardLayout>
  );
}
