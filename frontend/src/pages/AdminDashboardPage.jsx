import { useCallback, useEffect, useState } from 'react';
import { Building2, BriefcaseBusiness, FileCheck2, Globe2, ShieldAlert, Users } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Reveal from '../components/Reveal';
import { apiRequest } from '../lib/api';

const empty = {
  metrics: { users: 0, companies: 0, jobs: 0, applications: 0, pendingJobs: 0, sites: 0 },
  recentUsers: [],
  recentCompanies: [],
  pendingJobs: [],
  sites: [],
  auditLogs: [],
  securityEvents: [],
};

export default function AdminDashboardPage() {
  const [state, setState] = useState({ loading: true, error: '', data: empty });
  const [workingId, setWorkingId] = useState(null);
  const [workingUser, setWorkingUser] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest('/admin/dashboard', { auth: true });
      setState({ loading: false, error: '', data });
    } catch (error) {
      setState({ loading: false, error: error.message, data: empty });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const moderate = async (jobId, status) => {
    setWorkingId(jobId);
    try {
      const body = { status };
      if (status === 'removed') body.moderation_note = 'Rejected during admin moderation';
      await apiRequest(`/admin/jobs/${jobId}/status`, { method: 'PATCH', auth: true, body });
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    } finally {
      setWorkingId(null);
    }
  };

  const changeRole = async (userId, role) => {
    setWorkingUser(userId);
    try {
      await apiRequest(`/admin/users/${userId}/role`, { method: 'PATCH', auth: true, body: { role } });
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    } finally {
      setWorkingUser(null);
    }
  };

  const { data } = state;

  return (
    <DashboardLayout
      title="Platform administration"
      subtitle="Moderate jobs, review activity, and monitor security across Jooblie and all connected specialist portals."
    >
      {state.error && <div className="error-banner">{state.error}</div>}

      <Reveal className="dashboard-metrics dashboard-metrics--five" stagger>
        <Metric icon={Users} label="Users" value={data.metrics.users} />
        <Metric icon={Building2} label="Companies" value={data.metrics.companies} />
        <Metric icon={BriefcaseBusiness} label="Jobs" value={data.metrics.jobs} />
        <Metric icon={FileCheck2} label="Applications" value={data.metrics.applications} />
        <Metric icon={ShieldAlert} label="Pending Review" value={data.metrics.pendingJobs} />
      </Reveal>

      <Reveal className="dashboard-panel">
        <PanelHeading title="Job moderation queue" text="Only status=active jobs are public. Approval sets published_at; rejection uses the existing removed status." />
        {state.loading ? <DashboardEmpty text="Loading moderation queue..." /> : data.pendingJobs.length ? (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead><tr><th>Job</th><th>Company</th><th>Category</th><th>Origin</th><th>Submitted</th><th className="table-actions">Actions</th></tr></thead>
              <tbody>
                {data.pendingJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.title}</td>
                    <td>{job.companies?.name || 'Company'}</td>
                    <td>{job.categories?.name || 'Category'}</td>
                    <td>{job.sites?.slug || '—'}</td>
                    <td>{job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}</td>
                    <td className="table-actions">
                      <button type="button" className="mini-action mini-action--approve" disabled={workingId === job.id} onClick={() => moderate(job.id, 'active')}>Approve</button>
                      <button type="button" className="mini-action mini-action--danger" disabled={workingId === job.id} onClick={() => moderate(job.id, 'removed')}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <DashboardEmpty text="No pending jobs need review." />}
      </Reveal>

      <Reveal className="dashboard-panel">
        <PanelHeading title="Recent users and roles" text="Role changes are server-side, admin-only, and written to activity_log." />
        {data.recentUsers.length ? (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead><tr><th>User</th><th>Email</th><th>Status</th><th className="table-actions">Role</th></tr></thead>
              <tbody>
                {data.recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name || user.id.slice(0, 8)}</td>
                    <td>{user.email || '—'}</td>
                    <td><span className={`status-pill status-pill--${user.status}`}>{user.status}</span></td>
                    <td className="table-actions">
                      <select
                        className="application-status-select"
                        value={user.role}
                        disabled={workingUser === user.id}
                        onChange={(event) => changeRole(user.id, event.target.value)}
                        aria-label={`Change role for ${user.full_name || 'user'}`}
                      >
                        <option value="job_seeker">Job Seeker</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <DashboardEmpty text="No users found." />}
      </Reveal>

      <Reveal className="dashboard-panel">
        <div className="dashboard-panel__heading">
          <div><h2>Connected portals</h2><p>The database site registry used by X-Site-Slug and job_sites visibility.</p></div>
          <span className="tag"><Globe2 size={14} /> {data.metrics.sites} sites</span>
        </div>
        {data.sites.length ? (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead><tr><th>Site</th><th>Slug</th><th>Type</th><th>Active</th></tr></thead>
              <tbody>
                {data.sites.map((site) => (
                  <tr key={site.id}>
                    <td>{site.name}</td>
                    <td><code>{site.slug}</code></td>
                    <td>{site.site_type}</td>
                    <td>{site.is_active ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <DashboardEmpty text="No sites found." />}
      </Reveal>

      <div className="dashboard-grid dashboard-grid--two">
        <Reveal className="dashboard-panel" direction="left">
          <PanelHeading title="Audit activity" text="Important state changes stored in the existing activity_log table." />
          {data.auditLogs.length ? (
            <div className="dashboard-list dashboard-list--logs">
              {data.auditLogs.slice(0, 12).map((log) => (
                <div className="dashboard-list__row" key={log.id}>
                  <div><strong>{log.action}</strong><span>{log.entity_type || 'system'} · {log.client_ip || 'unknown IP'}</span></div>
                  <small>{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</small>
                </div>
              ))}
            </div>
          ) : <DashboardEmpty text="No audit events yet." />}
        </Reveal>

        <Reveal className="dashboard-panel" direction="right" delay={80}>
          <PanelHeading title="Security events" text="Authentication failures and rate-limit events are stored separately." />
          {data.securityEvents.length ? (
            <div className="dashboard-list dashboard-list--logs">
              {data.securityEvents.slice(0, 12).map((event) => (
                <div className="dashboard-list__row" key={event.id}>
                  <div><strong>{event.event_type}</strong><span>{event.severity} · {event.client_ip || 'unknown IP'}</span></div>
                  <small>{event.created_at ? new Date(event.created_at).toLocaleString() : ''}</small>
                </div>
              ))}
            </div>
          ) : <DashboardEmpty text="No security events recorded." />}
        </Reveal>
      </div>
    </DashboardLayout>
  );
}

function PanelHeading({ title, text }) { return <div className="dashboard-panel__heading"><div><h2>{title}</h2><p>{text}</p></div></div>; }
function Metric({ icon: Icon, label, value }) { return <article className="dashboard-metric"><span className="dashboard-metric__icon"><Icon size={20} /></span><div><strong>{value}</strong><span>{label}</span></div></article>; }
function DashboardEmpty({ text }) { return <div className="dashboard-empty">{text}</div>; }
