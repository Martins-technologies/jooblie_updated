import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BriefcaseBusiness, Eye,
  UserRoundCheck, Users
} from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import Reveal from '../../shared/components/Reveal';
import { useAuth } from '../../shared/context/AuthContext';
import { apiRequest } from '../../shared/lib/api';
import { timeAgo } from '../../shared/lib/format';
import { LoadingState } from '../../shared/components/StatusMessage';

export default function RecruiterDashboardPage() {
  const { profile } = useAuth();
  const [state, setState] = useState({ 
    loading: true, 
    data: { metrics: {}, pipeline: {}, companies: [], jobs: [], recentApplications: [] } 
  });

  const load = useCallback(async () => {
    try {
      const data = await apiRequest('/recruiter/dashboard', { auth: true });
      setState({ loading: false, data });
    } catch (error) {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { data } = state;
  const companyJobs = data.jobs || [];
  const apps = data.recentApplications || [];
  const metrics = data.metrics || {};
  const pipeline = data.pipeline || {};

  const greetingName = (profile?.full_name || 'there').split(' ')[0];

  return (
    <DashboardLayout 
      title={`Welcome back, ${greetingName}`} 
      subtitle="Here is what's happening with your job listings today."
    >
      {/* Pulse Animation CSS - Ensures loaders animate smoothly */}
      <style>
        {`
          @keyframes pulse-soft {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .skeleton-box {
            animation: pulse-soft 1.5s ease-in-out infinite;
            background-color: #e5e7eb;
            border-radius: 4px;
          }
        `}
      </style>

      <div className="recruiter-dashboard" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {state.loading ? (
          <LoadingState label="Preparing your recruiter dashboard..." />
        ) : (
        <>
        
        {/* KPI CARDS */}
        <Reveal className="dashboard-metrics-grid"
          stagger 
          style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}
        >
          <KpiCard icon={BriefcaseBusiness} label="Total Jobs" value={metrics.jobs} tone="blue" loading={false} />
          <KpiCard icon={BriefcaseBusiness} label="Active Jobs" value={metrics.activeJobs} tone="blue" loading={state.loading} />
          <KpiCard icon={Users} label="Total Applicants" value={metrics.applications} tone="violet" loading={state.loading} />
          <KpiCard icon={Eye} label="Total Job Views" value={metrics.views} tone="cyan" loading={state.loading} />
          <KpiCard icon={UserRoundCheck} label="Successful Hires" value={pipeline.hired || 0} tone="green" loading={state.loading} />
        </Reveal>

        <div className="dashboard-split-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* LEFT COLUMN */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* RECENT JOBS WIDGET */}
            <Reveal className="dashboard-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div><h2 style={{ fontSize: '1.25rem', margin:0, color: '#111827' }}>Recent Job Postings</h2></div>
                <Link to="/my-jobs" style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View all <ArrowRight size={16} />
                </Link>
              </div>
              
              {state.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : companyJobs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {companyJobs.slice(0, 3).map((job) => (
                    <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                      <Link to={`/my-jobs`} style={{ fontWeight: 'bold', color: '#111827', textDecoration: 'none', fontSize: '1.05rem' }}>{job.title}</Link>
                      <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '999px', backgroundColor: job.status === 'active' ? '#dcfce7' : '#f3f4f6', color: job.status === 'active' ? '#166534' : '#4b5563', textTransform: 'capitalize', fontWeight: 'bold' }}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280', margin: 0, padding: '1rem 0' }}>No jobs posted yet.</p>
              )}
            </Reveal>

            {/* RECENT APPLICANTS WIDGET */}
            <Reveal className="dashboard-panel" delay={70} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div><h2 style={{ fontSize: '1.25rem', margin:0, color: '#111827' }}>Recent Applicants</h2></div>
                <Link to="/candidates" style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View all <ArrowRight size={16} />
                </Link>
              </div>

              {state.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : apps.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {apps.slice(0, 3).map((app) => (
                    <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                      <strong style={{ color: '#111827' }}>{app.profiles?.full_name || 'Candidate'}</strong>
                      <span style={{ color:'#6b7280', fontSize:'0.85rem' }}>Applied {timeAgo(app.created_at)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280', margin: 0, padding: '1rem 0' }}>No recent applications.</p>
              )}
            </Reveal>
          </main>

          {/* RIGHT COLUMN */}
          <aside style={{ height: '100%' }}>
            
            {/* HIRING FUNNEL WIDGET */}
            <Reveal className="dashboard-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#111827' }}>Candidate Pipeline</h2>
                <BarChart3 size={18} style={{ color:'#6b7280' }}/>
              </div>
              
              {state.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-evenly', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton-box" style={{ width: '40%', height: '20px' }}></div>
                    <div className="skeleton-box" style={{ width: '20px', height: '20px', borderRadius: '50%' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton-box" style={{ width: '60%', height: '20px' }}></div>
                    <div className="skeleton-box" style={{ width: '20px', height: '20px', borderRadius: '50%' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton-box" style={{ width: '50%', height: '20px' }}></div>
                    <div className="skeleton-box" style={{ width: '20px', height: '20px', borderRadius: '50%' }}></div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-evenly' }}>
                  {[['submitted', 'New applicants'], ['shortlisted', 'Shortlisted'], ['interviewing', 'Interviewing'], ['hired', 'Hired']].map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', padding: '0.75rem 0', borderBottom: '1px dashed #f3f4f6' }}>
                      <span style={{ color: '#4b5563' }}>{label}</span>
                      <strong style={{ color: '#111827', backgroundColor: '#f3f4f6', padding: '4px 12px', borderRadius: '999px' }}>
                        {pipeline[key] || 0}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
              
            </Reveal>
            
          </aside>
        </div>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}

// ---------------- SUB COMPONENTS ----------------

// Industrial Standard KPI Card Skeleton
function KpiCard({ icon: Icon, label, value, tone, loading }) {
  if (loading) {
    return (
      <article style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div className="skeleton-box" style={{ width: '42px', height: '42px', borderRadius: '8px', marginBottom: '1.2rem' }}></div>
        <div className="skeleton-box" style={{ width: '50%', height: '32px', marginBottom: '0.5rem' }}></div>
        <div className="skeleton-box" style={{ width: '80%', height: '14px' }}></div>
      </article>
    );
  }
  
  const colors = { 
    blue: { bg: '#eff6ff', text: '#3b82f6' }, 
    violet: { bg: '#f5f3ff', text: '#8b5cf6' }, 
    cyan: { bg: '#ecfeff', text: '#06b6d4' }, 
    green: { bg: '#f0fdf4', text: '#22c55e' } 
  };
  
  const currentColors = colors[tone] || colors.blue;

  return (
    <article style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: currentColors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem' }}>
        <Icon size={20} color={currentColors.text} />
      </div>
      <h3 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: '#111827' }}>
        {Number(value || 0).toLocaleString()}
      </h3>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>{label}</p>
    </article>
  );
}

// Industrial Standard List Skeleton for Jobs & Candidates
function SkeletonRow() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '60%' }}>
        <div className="skeleton-box" style={{ height: '16px', width: '80%' }}></div>
        <div className="skeleton-box" style={{ height: '12px', width: '40%' }}></div>
      </div>
      <div className="skeleton-box" style={{ height: '24px', width: '60px', borderRadius: '999px' }}></div>
    </div>
  );
}
