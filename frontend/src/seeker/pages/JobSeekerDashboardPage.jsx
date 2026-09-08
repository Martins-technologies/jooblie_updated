import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BriefcaseBusiness, Building2, Check, Clock, FileText, MapPin, Search, Trophy, X, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';

const EMPTY_DASHBOARD = { metrics: { applications: 0, savedJobs: 0, shortlisted: 0, offers: 0 }, applications: [], savedJobs: [] };

export default function JobSeekerDashboardPage() {
  const [dashboardState, setDashboardState] = useState({ loading: true, error: '', data: EMPTY_DASHBOARD });
  const [jobsState, setJobsState] = useState({ loading: true, jobs: [] });
  const [recommendedState, setRecommendedState] = useState({ loading: true, jobs: [] });
  const [savingJobs, setSavingJobs] = useState(new Set());

  const savedIds = useMemo(() => new Set((dashboardState.data.savedJobs || []).map((item) => String(item.job_id || item.jobs?.id))), [dashboardState.data.savedJobs]);

  const loadDashboard = useCallback(async () => {
    try {
      const result = await apiRequest('/job-seeker/dashboard', { auth: true });
      setDashboardState({ loading: false, error: '', data: { ...EMPTY_DASHBOARD, ...result, metrics: { ...EMPTY_DASHBOARD.metrics, ...(result?.metrics || {}) }, applications: result?.applications || [], savedJobs: result?.savedJobs || result?.saved_jobs || [] } });
    } catch (error) {
      setDashboardState(c => ({ ...c, loading: false, error: error.message || 'Could not load dashboard.' }));
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const result = await apiRequest(`/public/jobs?page=1&limit=5`);
      const jobs = result.jobs || result.items || result.results || (Array.isArray(result) ? result : []);
      setJobsState({ loading: false, jobs });
    } catch { setJobsState({ loading: false, jobs: [] }); }
  }, []);

  const loadRecommended = useCallback(async () => {
    try {
      const result = await apiRequest('/job-seeker/recommended-jobs?limit=6', { auth: true });
      const jobs = result.jobs || result.items || result.recommendedJobs || result.recommended_jobs || [];
      setRecommendedState({ loading: false, jobs: jobs.slice(0, 6) });
    } catch { setRecommendedState({ loading: false, jobs: [] }); }
  }, []);

  useEffect(() => { loadDashboard(); loadJobs(); loadRecommended(); }, [loadDashboard, loadJobs, loadRecommended]);

  const toggleSaveJob = async (jobId) => {
    const id = String(jobId);
    if (savingJobs.has(id)) return;
    setSavingJobs(c => new Set(c).add(id));
    try {
      if (savedIds.has(id)) { await apiRequest(`/job-seeker/jobs/${jobId}/save`, { method: 'DELETE', auth: true }); } 
      else { await apiRequest(`/job-seeker/jobs/${jobId}/save`, { method: 'POST', auth: true }); }
      await loadDashboard();
    } catch (error) {
      setDashboardState(c => ({ ...c, error: error.message }));
    } finally {
      setSavingJobs(c => { const next = new Set(c); next.delete(id); return next; });
    }
  };

  const data = dashboardState.data;
  const recommendationJobs = recommendedState.jobs.length ? recommendedState.jobs : jobsState.jobs.slice(0, 6);

  return (
    <DashboardLayout title="Dashboard Overview" subtitle="Your job search progress at a glance.">
      <style>{premiumCSS}</style>
      
      {dashboardState.error && <div className="banner banner-error"><X size={18}/> {dashboardState.error}</div>}

      <div className="dash-stack">
        <div className="dash-metrics">
          <Metric icon={BriefcaseBusiness} label="Applications" value={data.metrics.applications} colorClass="blue" />
          <Metric icon={Bookmark} label="Saved Jobs" value={data.metrics.savedJobs} colorClass="purple" />
          <Metric icon={CheckCircle2} label="Shortlisted" value={data.metrics.shortlisted} colorClass="purple" />
          <Metric icon={Trophy} label="Offers" value={data.metrics.offers} colorClass="green" />
        </div>

        <section className="dash-panel">
          <Heading title="Recommended Jobs" text="Curated opportunities matching your profile." />
          {recommendedState.loading ? <Empty text="Loading recommendations..." /> : recommendationJobs.length ? (
            <div className="dash-job-grid">
              {recommendationJobs.map((job) => <DashboardJobCard key={job.id} job={job} saved={savedIds.has(String(job.id))} onSave={toggleSaveJob} />)}
            </div>
          ) : <Empty text="No recommendations available right now." />}
        </section>

        <section className="dash-panel">
          <Heading title="Latest Openings" text="Recently published roles on Jooblie." action={<Link to="/dashboard/job-seeker/jobs" className="dash-link">View all jobs</Link>} />
          {jobsState.loading ? <Empty text="Loading latest jobs..." /> : jobsState.jobs.length ? (
            <div>
              {jobsState.jobs.slice(0, 5).map((job) => <JobRow key={job.id} job={job} saved={savedIds.has(String(job.id))} onSave={toggleSaveJob} />)}
            </div>
          ) : <Empty text="No recent jobs found." />}
        </section>

        <section className="dash-panel">
          <Heading title="Recent Applications" text="Status of your recently submitted profiles." action={<Link to="/dashboard/job-seeker/applications" className="dash-link">View all</Link>} />
          {data.applications.length ? (
            <div>
              {data.applications.slice(0, 4).map((app) => <ApplicationRow key={app.id} application={app} />)}
            </div>
          ) : <Empty text="You haven't applied to any jobs yet." />}
        </section>
      </div>
    </DashboardLayout>
  );
}

/* --- REUSABLE COMPONENTS & CSS --- */
const premiumCSS = `
  .dash-stack { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }
  .dash-panel { background: #ffffff; border: 1px solid #e8e8e8; border-radius: 12px; padding: 24px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02); }
  .dash-heading { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
  .dash-heading h2 { margin: 0; color: #111827; font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 8px;}
  .dash-heading p { margin: 4px 0 0; color: #6b7280; font-size: 0.9rem; }
  .dash-link { color: #2557a7; font-weight: 600; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
  .dash-link:hover { color: #164081; text-decoration: underline; }
  .dash-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .metric-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; display: flex; align-items: center; gap: 18px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03); transition: all 0.3s ease; }
  .metric-card:hover { border-color: #d1d5db; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); transform: translateY(-4px); }
  .metric-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .metric-icon.blue { background: #f0f4ff; color: #2557a7; }
  .metric-icon.purple { background: #f5f3ff; color: #6d28d9; }
  .metric-icon.green { background: #f0fdf4; color: #15803d; }
  .metric-content { display: flex; flex-direction: column; }
  .metric-content strong { font-size: 1.75rem; font-weight: 800; color: #111827; line-height: 1; margin-bottom: 6px; }
  .metric-content span { color: #6b7280; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }
  .dash-job-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .dash-job-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 12px; padding: 20px; transition: all 0.2s; display: flex; flex-direction: column; }
  .dash-job-card:hover { border-color: #2557a7; box-shadow: 0 4px 12px rgba(37, 87, 167, 0.08); }
  .dash-job-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .dash-logo-box { width: 44px; height: 44px; background: #f9fafb; border: 1px solid #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
  .save-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid #e8e8e8; display: flex; align-items: center; justify-content: center; background: #fff; color: #6b7280; cursor: pointer; transition: all 0.2s; }
  .save-btn:hover { background: #f3f4f6; color: #111827; }
  .save-btn.saved { background: #eef2f9; color: #2557a7; border-color: #dce5f2; }
  .dash-job-card h3 { margin: 0 0 4px 0; font-size: 1.05rem; font-weight: 700; line-height: 1.3; }
  .dash-job-card h3 a { color: #111827; text-decoration: none; }
  .dash-job-card h3 a:hover { color: #2557a7; text-decoration: underline; }
  .dash-company-name { color: #4b5563; font-size: 0.9rem; font-weight: 500; }
  .dash-job-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .meta-badge { display: inline-flex; align-items: center; gap: 4px; background: #f3f4f6; color: #4b5563; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
  .dash-list-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 0; border-bottom: 1px solid #f0f0f0; transition: background 0.2s; }
  .dash-list-row:last-child { border-bottom: none; padding-bottom: 0; }
  .row-left { display: flex; align-items: center; gap: 16px; flex-grow: 1; }
  .row-info h3 { margin: 0 0 4px 0; font-size: 1rem; font-weight: 600; }
  .row-info h3 a { color: #111827; text-decoration: none; }
  .row-info h3 a:hover { color: #2557a7; text-decoration: underline; }
  .row-info p { margin: 0; color: #6b7280; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
  .status-pill { padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 4px; }
  .status-pill.submitted { background: #eef2f9; color: #2557a7; }
  .status-pill.reviewing { background: #fff7ed; color: #ea580c; }
  .status-pill.interview { background: #f3e8ff; color: #7c3aed; }
  .status-pill.accepted { background: #ecfdf5; color: #059669; }
  .status-pill.rejected { background: #fef2f2; color: #e11d48; }
  .dash-empty { min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed #e5e7eb; border-radius: 12px; color: #6b7280; font-size: 0.95rem; background: #f9fafb; }
  .banner { padding: 12px 16px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
  .banner-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  @media (max-width: 1024px) { .dash-metrics { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { .dash-metrics { grid-template-columns: 1fr; } }
`;

function Heading({ title, text, action }) { return <div className="dash-heading"><div><h2>{title}</h2>{text && <p>{text}</p>}</div>{action}</div>; }
function Metric({ icon: Icon, label, value, colorClass }) { return <div className="metric-card"><div className={`metric-icon ${colorClass}`}><Icon size={24} /></div><div className="metric-content"><strong>{value || 0}</strong><span>{label}</span></div></div>; }
function DashboardJobCard({ job, saved, onSave }) { return <article className="dash-job-card"><div className="dash-job-card-top"><div className="dash-logo-box"><Building2 size={20} /></div><button type="button" className={`save-btn ${saved ? 'saved' : ''}`} onClick={() => onSave(job.id)}>{saved ? <Check size={16} /> : <Bookmark size={16} />}</button></div><h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3><span className="dash-company-name">{getCompanyName(job)}</span><div className="dash-job-meta"><span className="meta-badge"><MapPin size={12} /> {getLocation(job)}</span><span className="meta-badge"><BriefcaseBusiness size={12} /> {formatType(job.employment_type)}</span></div></article>; }
function JobRow({ job, saved, onSave }) { return <article className="dash-list-row"><div className="row-left"><div className="dash-logo-box" style={{ width: '40px', height: '40px' }}><Building2 size={18} /></div><div className="row-info"><h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3><p>{getCompanyName(job)} • {getLocation(job)}</p></div></div><button type="button" className={`save-btn ${saved ? 'saved' : ''}`} onClick={() => onSave(job.id)}>{saved ? <Check size={16} /> : <Bookmark size={16} />}</button></article>; }
function ApplicationRow({ application }) { const job = application.jobs || application.job || {}; const statusRaw = String(application.status || 'submitted').toLowerCase(); let pillClass = 'submitted'; if (statusRaw.includes('review')) pillClass = 'reviewing'; if (statusRaw.includes('interview')) pillClass = 'interview'; if (statusRaw.includes('accept') || statusRaw.includes('hired')) pillClass = 'accepted'; if (statusRaw.includes('reject') || statusRaw.includes('decline')) pillClass = 'rejected'; return <div className="dash-list-row"><div className="row-left"><div className="dash-logo-box" style={{ width: '40px', height: '40px', background: '#f3f4f6', color: '#6b7280' }}><FileText size={18} /></div><div className="row-info"><h3><Link to={`/jobs/${application.job_id || job.id}`}>{job.title || 'Job Application'}</Link></h3><p>{getCompanyName(job)} <Clock size={12} style={{marginLeft: '6px'}}/> Applied recently</p></div></div><span className={`status-pill ${pillClass}`}>{statusRaw.replace('_', ' ')}</span></div>; }
function Empty({ text }) { return <div className="dash-empty"><Search size={32} style={{ marginBottom: '12px', color: '#d1d5db' }}/> {text}</div>; }
function getCompanyName(job) { return job?.companies?.name || job?.company?.name || job?.company_name || 'Employer'; }
function getLocation(job) { if (job?.is_remote && !job.city && !job.province) return 'Remote'; return [job?.city, job?.province].filter(Boolean).join(', ') || 'Remote / Unspecified'; }
function formatType(value) { if (!value) return 'Job'; return String(value).replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()); }