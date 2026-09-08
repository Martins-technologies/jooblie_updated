import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BriefcaseBusiness, Building2, Check, MapPin, Search } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';

export default function JobSeekerSavedJobsPage() {
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState([]);
  const [savingJobs, setSavingJobs] = useState(new Set());
  const [error, setError] = useState('');

  const loadSavedJobs = useCallback(async () => {
    try {
      const result = await apiRequest('/job-seeker/dashboard', { auth: true });
      setSavedJobs(result?.savedJobs || result?.saved_jobs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSavedJobs(); }, [loadSavedJobs]);

  const toggleSaveJob = async (jobId) => {
    const id = String(jobId);
    if (savingJobs.has(id)) return;
    setSavingJobs(c => new Set(c).add(id));
    setError('');
    try {
      // Kyunke yeh page hi 'Saved Jobs' ka hai, to toggle ka matlab Delete hi hoga yahan
      await apiRequest(`/job-seeker/jobs/${jobId}/save`, { method: 'DELETE', auth: true });
      await loadSavedJobs();
    } catch (requestError) { setError(requestError.message || 'Saved job could not be removed.'); }
    finally { setSavingJobs(c => { const next = new Set(c); next.delete(id); return next; }); }
  };

  return (
    <DashboardLayout title="Saved Jobs" subtitle="Opportunities you have bookmarked to review later.">
      <style>{premiumCSS}</style>
      <div className="dash-stack">
        {error && <div className="error-banner">{error}</div>}
        <section className="dash-panel">
          <div className="dash-heading">
            <h2>Bookmarked Roles</h2>
          </div>
          
          {/* 🔥 Circular Animation yahan add ki gayi hai */}
          {loading ? <LoadingSpinner /> : savedJobs.length ? (
            <div className="dash-job-grid">
              {savedJobs.map((saved) => {
                const job = saved.jobs || saved.job;
                if (!job) return null;
                // Yahan list me hamesha 'saved=true' jayega kyunke yeh saved array se aa raha hai
                return <DashboardJobCard key={saved.job_id || job.id} job={job} saved={true} onSave={toggleSaveJob} />;
              })}
            </div>
          ) : <Empty text="You haven't saved any jobs yet." icon={<Bookmark size={32} />} />}
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
  
  /* Job Cards Premium CSS */
  .dash-job-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
  .dash-job-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; transition: all 0.2s ease; display: flex; flex-direction: column; }
  .dash-job-card:hover { border-color: #2557a7; box-shadow: 0 4px 12px rgba(37, 87, 167, 0.08); transform: translateY(-1px); }
  
  .dash-job-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .dash-logo-box { width: 44px; height: 44px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
  
  .save-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: center; background: #fff; color: #9ca3af; cursor: pointer; transition: all 0.2s; }
  .save-btn:hover { background: #f9fafb; color: #4b5563; }
  .save-btn.saved { background: #eff6ff; color: #2557a7; border-color: #bfdbfe; }
  
  .dash-job-card h3 { margin: 0 0 4px 0; font-size: 1.05rem; font-weight: 700; line-height: 1.3; }
  .dash-job-card h3 a { color: #111827; text-decoration: none; transition: color 0.2s; }
  .dash-job-card h3 a:hover { color: #2557a7; text-decoration: underline; }
  
  .dash-company-name { color: #6b7280; font-size: 0.875rem; font-weight: 500; }
  .dash-job-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .meta-badge { display: inline-flex; align-items: center; gap: 4px; background: #f3f4f6; color: #4b5563; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
  
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
`;

// 🔥 Naya Spinner Component
function LoadingSpinner() {
  return (
    <div className="job-spinner-container">
      <div className="circular-spinner"></div>
      <span style={{ color: '#4b5563', fontSize: '0.95rem', fontWeight: '500' }}>Loading saved jobs...</span>
    </div>
  );
}

function DashboardJobCard({ job, saved, onSave }) { 
  return (
    <article className="dash-job-card">
      <div className="dash-job-card-top">
        <div className="dash-logo-box"><Building2 size={20} /></div>
        <button type="button" className={`save-btn ${saved ? 'saved' : ''}`} onClick={() => onSave(job.id)} title={saved ? "Unsave Job" : "Save Job"}>
          {saved ? <Check size={16} /> : <Bookmark size={16} />}
        </button>
      </div>
      {/* 🔥 YAHAN FIX HAI: Link ab /dashboard/job-seeker/jobs/... par ja raha hai */}
      <h3><Link to={`/dashboard/job-seeker/jobs/${job.id}`}>{job.title}</Link></h3>
      <span className="dash-company-name">{job?.companies?.name || job?.company_name || 'Employer'}</span>
      <div className="dash-job-meta">
        <span className="meta-badge"><MapPin size={12} /> {job?.is_remote && !job.city ? 'Remote' : [job?.city, job?.province].filter(Boolean).join(', ') || 'Remote'}</span>
        <span className="meta-badge"><BriefcaseBusiness size={12} /> {String(job?.employment_type || 'Job').replace('_', ' ')}</span>
      </div>
    </article>
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
