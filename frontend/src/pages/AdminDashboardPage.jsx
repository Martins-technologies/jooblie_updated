import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, BriefcaseBusiness, Globe2, Users, ArrowRight, UserCog } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Reveal from '../components/Reveal';
import { apiRequest } from '../lib/api';

const empty = { metrics: { users: 0, companies: 0, jobs: 0, applications: 0, sites: 0 } };

export default function AdminDashboardPage() {
  const [state, setState] = useState({ loading: true, error: '', data: empty });

  const load = useCallback(async () => {
    try {
      const data = await apiRequest('/admin/dashboard', { auth: true });
      setState({ loading: false, error: '', data });
    } catch (error) {
      setState({ loading: false, error: error.message, data: empty });
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const metrics = state.data.metrics || empty.metrics;

  return (
    <DashboardLayout title="Admin Command Center" subtitle="High-level overview of Jooblie platform performance and active metrics.">
      <style>
        {`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          .skeleton { animation: pulse 1.5s ease-in-out infinite; background-color: #f3f4f6; border-radius: 12px; }`}
      </style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {state.error && <div className="error-banner">{state.error}</div>}

        {/* METRICS GRID - Exact 4 columns */}
        <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <MetricCard icon={Users} label="Total Users" value={metrics.users} tone="blue" loading={state.loading} />
          <MetricCard icon={BriefcaseBusiness} label="Total Jobs" value={metrics.jobs} tone="cyan" loading={state.loading} />
          <MetricCard icon={Building2} label="Companies" value={metrics.companies} tone="green" loading={state.loading} />
          <MetricCard icon={Globe2} label="Connected Portals" value={metrics.sites} tone="orange" loading={state.loading} />
        </Reveal>

        {/* QUICK ACTIONS PANEL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* USER MANAGEMENT */}
          <Reveal className="dashboard-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCog size={20} color="#2563eb" /> User Management
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', flex: 1 }}>Review registered accounts, modify access roles, and manage job seekers and recruiters across the platform.</p>
            <Link to="/admin/users" className="button button--primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: 'fit-content' }}>
              Manage Users <ArrowRight size={16} />
            </Link>
          </Reveal>

          {/* JOB MANAGEMENT */}
          <Reveal className="dashboard-panel" delay={100} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BriefcaseBusiness size={20} color="#059669" /> Job Management
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', flex: 1 }}>View, filter, edit, or close all active job listings posted by recruiters on the platform.</p>
            <Link to="/my-jobs" className="button button--secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: 'fit-content' }}>
              Manage Jobs <ArrowRight size={16} />
            </Link>
          </Reveal>

        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ icon: Icon, label, value, tone, loading }) {
  if (loading) return <div className="skeleton" style={{ height: '130px', border: '1px solid #e5e7eb' }}></div>;
  const colors = { blue: { bg: '#eff6ff', text: '#3b82f6' }, cyan: { bg: '#ecfeff', text: '#06b6d4' }, green: { bg: '#f0fdf4', text: '#22c55e' }, orange: { bg: '#fff7ed', text: '#f97316' } };
  const currentColors = colors[tone] || colors.blue;
  return (
    <article style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: currentColors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem' }}>
        <Icon size={20} color={currentColors.text} />
      </div>
      <h3 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: '#111827' }}>{Number(value || 0).toLocaleString()}</h3>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>{label}</p>
    </article>
  );
}