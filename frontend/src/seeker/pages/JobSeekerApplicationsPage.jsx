import { Link } from 'react-router-dom';
import { ArrowUpRight, RefreshCw, Radio } from 'lucide-react';
import { useEffect } from 'react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import DashboardTable from '../../shared/components/DashboardTable';
import SkeletonContent from '../../shared/components/Skeleton';
import { StatusBadge, WorkspaceEmpty } from '../../shared/components/WorkspaceCards';
import useAccountHistory from '../../shared/hooks/useAccountHistory';
import HistoryPagination from '../../shared/components/HistoryPagination';
import { formatDate } from '../../shared/lib/format';
import { supabase } from '../../shared/lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';

export default function JobSeekerApplicationsPage() {
  const auth = useAuth();
  const { items: applications, loading, error, page, pageSize, total, setPage, reload } = useAccountHistory('/job-seeker/applications');

  // 🔥 Real-time application status updates
  useEffect(() => {
    const targetUserId = auth.user?.id;
    if (!targetUserId || !supabase) return;

    const channel = supabase
      .channel(`seeker-apps-history-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `applicant_id=eq.${targetUserId}`,
        },
        () => {
          reload();
        }
      )
      .subscribe();

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        reload();
      }
    }, 8000);

    const handleFocus = () => reload();
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [auth.user?.id, reload]);

  return (
    <DashboardLayout title="My Applications" subtitle="Track the real-time status of roles you have applied for.">
      <section className="workspace-panel dashboard-table-panel">
        <div className="table-section-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2>Application History</h2>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px' }}>
              <Radio size={12} className="animate-pulse" /> Live
            </span>
          </div>
          <button type="button" className="admin-icon" aria-label="Refresh applications" disabled={loading} onClick={reload}>
            <RefreshCw size={15} />
          </button>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            {error} <button type="button" onClick={reload}>Try again</button>
          </div>
        )}

        {loading ? (
          <SkeletonContent variant="table" columns={['Job', 'Company', 'Applied', 'Status', 'Actions'].map(label => ({ label }))} rows={10} label="Loading applications…" />
        ) : applications.length ? (
          <DashboardTable
            label="Application history"
            columns={[
              { label: 'Job', width: '37%' },
              { label: 'Company', width: '23%' },
              { label: 'Applied', width: '16%' },
              { label: 'Status', width: '14%' },
              { label: 'Actions', width: '10%' },
            ]}
          >
            {applications.map(application => {
              const job = application.jobs || application.job || {};
              const id = application.job_id || job.id;
              return (
                <tr key={application.id}>
                  <td>
                    {id ? (
                      <Link className="table-primary" to={`/dashboard/job-seeker/jobs/${id}`}>
                        <strong>{job.title || 'Job unavailable'}</strong>
                      </Link>
                    ) : (
                      <strong>Job unavailable</strong>
                    )}
                  </td>
                  <td>{job.companies?.name || job.company_name || 'Employer unavailable'}</td>
                  <td>{formatDate(application.created_at) || '—'}</td>
                  <td>
                    <StatusBadge status={application.status || 'unknown'} />
                  </td>
                  <td>
                    {id && (
                      <Link className="table-action" to={`/dashboard/job-seeker/jobs/${id}`} aria-label={`View ${job.title || 'job'}`}>
                        <ArrowUpRight size={15} />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </DashboardTable>
        ) : (
          !error && <WorkspaceEmpty to="/dashboard/job-seeker/jobs" action="Find jobs">You haven’t submitted any applications yet.</WorkspaceEmpty>
        )}

        <HistoryPagination page={page} pageSize={pageSize} total={total} loading={loading} onPageChange={setPage} />
      </section>
    </DashboardLayout>
  );
}
