import { Link } from 'react-router-dom';
import { Clock, FileText, Search } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import useAccountHistory from '../../shared/hooks/useAccountHistory';
import HistoryPagination from '../../shared/components/HistoryPagination';

export default function JobSeekerApplicationsPage() {
  const { items: applications, loading, error, page, pageSize, total, setPage, reload } = useAccountHistory('/job-seeker/applications');

  return (
    <DashboardLayout title="My Applications" subtitle="Track the status of roles you have applied for.">
      <style>{premiumCSS}</style>
      <div className="dash-stack">
        {error && <div className="error-banner" role="alert">{error} <button onClick={reload}>Try again</button></div>}
        <section className="dash-panel">
          <div className="dash-heading">
            <h2>Application History</h2>
          </div>
          
          {/* 🔥 Circular Animation yahan add ki gayi hai */}
          {loading ? <LoadingSpinner /> : applications.length ? (
            <div className="applications-list">
              {applications.map((app) => <ApplicationRow key={app.id} application={app} />)}
            </div>
          ) : !error && <Empty text="You haven't submitted any applications yet." icon={<FileText size={32} />} />}
          <HistoryPagination page={page} pageSize={pageSize} total={total} loading={loading} onPageChange={setPage} />
        </section>
      </div>
    </DashboardLayout>
  );
}

/* --- REUSABLE COMPONENTS & CSS --- */
const premiumCSS = `
  .dash-stack { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }
  
  .dash-panel { 
    background: #ffffff; 
    border: 1px solid #e5e7eb; 
    border-radius: 12px; 
    padding: 28px; 
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1); 
  }
  
  .dash-heading { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; }
  .dash-heading h2 { margin: 0; color: #111827; font-size: 1.25rem; font-weight: 700; letter-spacing: -0.01em; }
  
  .applications-list { display: flex; flex-direction: column; gap: 12px; }

  /* Premium Application Row Hover Effects */
  .dash-list-row { 
    display: flex; align-items: center; justify-content: space-between; gap: 16px; 
    padding: 16px 20px; border: 1px solid #f3f4f6; border-radius: 10px; 
    background: #fff; transition: all 0.2s ease; 
  }
  .dash-list-row:hover { 
    border-color: #dce5f2; 
    box-shadow: 0 4px 12px rgba(37, 87, 167, 0.05); 
    transform: translateY(-1px); 
    background: #fafbfc; 
  }
  
  .row-left { display: flex; align-items: center; gap: 16px; flex-grow: 1; }
  
  .dash-logo-box { 
    width: 48px; height: 48px; background: #ffffff; 
    border: 1px solid #e5e7eb; border-radius: 10px; 
    display: flex; align-items: center; justify-content: center; 
    color: #9ca3af; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  
  .row-info h3 { margin: 0 0 4px 0; font-size: 1.05rem; font-weight: 700; }
  .row-info h3 a { color: #111827; text-decoration: none; transition: color 0.2s; }
  .row-info h3 a:hover { color: #2557a7; text-decoration: underline; }
  .row-info p { margin: 0; color: #6b7280; font-size: 0.875rem; display: flex; align-items: center; gap: 6px; font-weight: 500; }
  
  /* Status Badges with Borders */
  .status-pill { 
    padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; 
    text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; 
    align-items: center; gap: 4px; white-space: nowrap;
  }
  .status-pill.submitted { background: #eef2f9; color: #2557a7; border: 1px solid #dce5f2; }
  .status-pill.viewed { background: #fef9c3; color: #ca8a04; border: 1px solid #fef08a; }
  .status-pill.reviewing { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }
  .status-pill.interview { background: #f3e8ff; color: #7c3aed; border: 1px solid #e9d5ff; }
  .status-pill.accepted { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
  .status-pill.rejected { background: #fef2f2; color: #e11d48; border: 1px solid #ffe4e6; }
  
  .dash-empty { min-height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed #e5e7eb; border-radius: 12px; color: #6b7280; font-size: 0.95rem; background: #fafafa; gap: 12px; }

  /* 🔥 Loading Spinner CSS */
  .job-spinner-container {
    min-height: 250px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: #fafafa;
    border: 1px dashed #e5e7eb;
    border-radius: 12px;
  }
  .circular-spinner {
    width: 42px;
    height: 42px;
    border: 4px solid #eef2f9;
    border-top-color: #2557a7;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 600px) {
    .dash-list-row { flex-direction: column; align-items: flex-start; gap: 12px; }
    .status-pill { align-self: flex-start; }
  }
`;

// 🔥 Naya Spinner Component
function LoadingSpinner() {
  return (
    <div className="job-spinner-container">
      <div className="circular-spinner"></div>
      <span style={{ color: '#4b5563', fontSize: '0.95rem', fontWeight: '500' }}>Loading your applications...</span>
    </div>
  );
}

function ApplicationRow({ application }) {
  const job = application.jobs || application.job || {};
  const statusRaw = String(application.status || 'submitted').toLowerCase();
  
  // Better Status Pill Logic
  let pillClass = 'submitted';
  if (statusRaw === 'viewed') pillClass = 'viewed';
  if (statusRaw.includes('review') || statusRaw === 'shortlisted') pillClass = 'reviewing';
  if (statusRaw.includes('interview')) pillClass = 'interview';
  if (statusRaw.includes('accept') || statusRaw.includes('hired') || statusRaw === 'offered') pillClass = 'accepted';
  if (statusRaw.includes('reject') || statusRaw.includes('decline') || statusRaw === 'withdrawn') pillClass = 'rejected';
  
  return (
    <div className="dash-list-row">
      <div className="row-left">
        <div className="dash-logo-box"><FileText size={20} /></div>
        <div className="row-info">
          {/* 🔥 YAHAN FIX HAI: Link ab /dashboard/job-seeker/jobs/... par ja raha hai */}
          <h3><Link to={`/dashboard/job-seeker/jobs/${application.job_id || job.id}`}>{job.title || 'Job Application'}</Link></h3>
          <p>{job?.companies?.name || job?.company_name || 'Employer'} <Clock size={14} style={{marginLeft: '8px'}}/> Applied recently</p>
        </div>
      </div>
      <span className={`status-pill ${pillClass}`}>{statusRaw.replace('_', ' ')}</span>
    </div>
  );
}

function Empty({ text, icon }) { 
  return (
    <div className="dash-empty">
      <div style={{ color: '#d1d5db' }}>{icon}</div> 
      {text}
    </div>
  ); 
}
