import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, BriefcaseBusiness, Users, Activity, Globe2, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';

const pretty = (value) => String(value || '').replaceAll('_', ' ');

export default function AdminPortalDetailPage() {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = useCallback(async () => {
    setState((x) => ({ ...x, loading: true, error: '' }));
    try {
      const data = await apiRequest(`/admin/portals/${encodeURIComponent(slug)}`, { auth: true });
      setState({ loading: false, error: '', data });
    } catch (error) {
      setState({ loading: false, error: error.message, data: null });
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  const portal = state.data?.portal;
  const metrics = state.data?.metrics || {};

  return (
    <DashboardLayout title={portal ? portal.name : 'Portal'} subtitle={portal ? `Operational data and activity for ${portal.slug}.` : 'Loading portal data...'} actions={portal?.domain ? <a className="button button--secondary" href={portal.domain} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open Portal</a> : null}>
      <div style={{ marginBottom: 16 }}><Link to="/admin/activity" className="button button--secondary"><ArrowLeft size={16} /> Back to System & Activity</Link></div>
      {state.error && <div className="error-banner">{state.error}</div>}
      {state.loading ? <div className="dashboard-panel" style={{ padding: 32 }}>Loading portal data…</div> : portal && (
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14 }}>
            <Metric icon={Globe2} label="Portal Status" value={portal.is_active ? 'Active' : 'Offline'} />
            <Metric icon={BriefcaseBusiness} label="Jobs" value={metrics.jobs} />
            <Metric icon={BriefcaseBusiness} label="Active Jobs" value={metrics.activeJobs} />
            <Metric icon={Users} label="Registered Users" value={metrics.users} />
          </div>

          <section className="dashboard-panel" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 14 }}>
              <div><h2 style={{ margin: 0 }}>{portal.name}</h2><p style={{ margin: '6px 0 0', color: '#6b7280' }}>{portal.domain || 'No public domain configured'} · {pretty(portal.site_type)}</p></div>
              <button className="button button--secondary" type="button" onClick={load}><RefreshCw size={16} /> Refresh</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Job','Company','Status','Created'].map((x)=><th key={x} style={{ textAlign:'left', padding:'10px 8px', borderBottom:'1px solid #e5e7eb' }}>{x}</th>)}</tr></thead>
                <tbody>{(state.data.jobs || []).map((job) => <tr key={job.id}>
                  <td style={{ padding:'11px 8px', borderBottom:'1px solid #f3f4f6' }}><Link to={`/jobs/${job.id}`}>{job.title}</Link></td>
                  <td style={{ padding:'11px 8px', borderBottom:'1px solid #f3f4f6' }}>{job.companies?.name || '—'}</td>
                  <td style={{ padding:'11px 8px', borderBottom:'1px solid #f3f4f6' }}>{pretty(job.status)}</td>
                  <td style={{ padding:'11px 8px', borderBottom:'1px solid #f3f4f6' }}>{job.created_at ? new Date(job.created_at).toLocaleString() : '—'}</td>
                </tr>)}</tbody>
              </table>
              {!state.data.jobs?.length && <p style={{ color:'#6b7280', paddingTop: 14 }}>No jobs are mapped to this portal yet.</p>}
            </div>
          </section>

          <section className="dashboard-panel" style={{ padding: 22 }}>
            <h2 style={{ marginTop: 0, display:'flex', gap:8, alignItems:'center' }}><Activity size={19} /> Recent Portal Activity</h2>
            {(state.data.activity || []).map((entry) => <div key={entry.id} style={{ padding:'12px 0', borderBottom:'1px solid #f3f4f6', display:'grid', gridTemplateColumns:'1fr auto', gap:12 }}><div><strong>{pretty(entry.action)}</strong><div style={{ color:'#6b7280', fontSize:13 }}>{entry.entity_type} · {entry.entity_id || '—'}</div></div><time style={{ color:'#6b7280', fontSize:13 }}>{entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}</time></div>)}
            {!state.data.activity?.length && <p style={{ color:'#6b7280' }}>No activity recorded for this portal yet.</p>}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
function Metric({ icon: Icon, label, value }) { return <div className="dashboard-panel" style={{ padding: 18 }}><Icon size={18} /><div style={{ fontSize: 25, fontWeight: 700, marginTop: 7 }}>{Number.isFinite(Number(value)) ? Number(value).toLocaleString() : value}</div><div style={{ color:'#6b7280', fontSize:13 }}>{label}</div></div>; }
