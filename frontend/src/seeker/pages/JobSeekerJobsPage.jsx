import SkeletonContent from '../../shared/components/Skeleton';
import Select from '../../shared/components/Select';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bookmark, BriefcaseBusiness, Building2, Check, ChevronLeft, ChevronRight, 
  MapPin, Search, Layers, MonitorSmartphone, CheckCircle2, DollarSign, Clock, ArrowRight, ShieldCheck 
} from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { formatSalary, timeAgo } from '../../shared/lib/format';

const EMPTY_FILTERS = { q: '', location: '', category: '', type: '', workplace: '' };

function normalizeJobsResponse(payload) {
  if (!payload) return { jobs: [], total: 0, page: 1, totalPages: 1 };
  const jobs = payload.jobs || payload.items || payload.results || (Array.isArray(payload) ? payload : []);
  const pagination = payload.pagination || {};
  const total = Number(pagination.total ?? payload.total ?? jobs.length) || 0;
  const page = Number(pagination.page ?? payload.page ?? 1) || 1;
  const limit = Number(pagination.limit ?? payload.limit ?? 8) || 8;
  const totalPages = Math.max(1, Number(pagination.totalPages ?? pagination.total_pages ?? payload.totalPages ?? Math.ceil(total / limit)) || 1);
  return { jobs, total, page, totalPages };
}

export default function JobSeekerJobsPage() {
  const [activeTab, setActiveTab] = useState('available'); // 'available' ya 'applied'
  const [jobsState, setJobsState] = useState({ loading: true, error: '', jobs: [], total: 0, page: 1, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [savedIds, setSavedIds] = useState(new Set());
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [myAppliedJobs, setMyAppliedJobs] = useState([]); // User ki sari applied jobs
  const [savingJobs, setSavingJobs] = useState(new Set());

  const loadSavedAndAppliedJobs = useCallback(async () => {
    try {
      const result = await apiRequest('/job-seeker/dashboard', { auth: true });
      
      // Saved Jobs
      const saved = result?.savedJobs || result?.saved_jobs || [];
      setSavedIds(new Set(saved.map((item) => String(item.job_id || item.jobs?.id))));
      
      // Applied Jobs
      const applications = result?.applications || [];
      setAppliedIds(new Set(applications.map((app) => String(app.job_id || app.jobs?.id))));
      
      // Sari applied jobs ko alag se store kar rahe hain taake tab mein dikha sakein
      const fullAppliedJobs = applications.map(app => {
        const jobData = app.jobs || app.job || {};
        if (!jobData.id && app.job_id) jobData.id = app.job_id;
        return jobData;
      });
      setMyAppliedJobs(fullAppliedJobs);

    } catch (e) { console.error("Could not load saved/applied jobs", e); }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const result = await apiRequest('/public/categories');
      setCategories(result?.categories || result?.items || (Array.isArray(result) ? result : []));
    } catch { setCategories([]); }
  }, []);

  const loadJobs = useCallback(async ({ requestedPage = 1, activeFilters = EMPTY_FILTERS, limit = 8 } = {}) => {
    setJobsState(c => ({ ...c, loading: true, error: '' }));
    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(limit));
      if (activeFilters.q?.trim()) params.set('q', activeFilters.q.trim());
      if (activeFilters.location?.trim()) params.set('location', activeFilters.location.trim());
      if (activeFilters.category) params.set('category', activeFilters.category);
      if (activeFilters.type) params.set('type', activeFilters.type);
      if (activeFilters.workplace) params.set('workplace', activeFilters.workplace);

      const result = await apiRequest(`/public/jobs?${params.toString()}`);
      setJobsState({ loading: false, error: '', ...normalizeJobsResponse(result) });
    } catch (error) {
      setJobsState({ loading: false, error: error.message || 'Could not load jobs.', jobs: [], total: 0, page: 1, totalPages: 1 });
    }
  }, []);

  useEffect(() => {
    loadSavedAndAppliedJobs();
    loadCategories();
    loadJobs({ requestedPage: 1, limit: 8 });
  }, [loadSavedAndAppliedJobs, loadCategories, loadJobs]);

  const applyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters({ ...filters });
    setPage(1);
    loadJobs({ requestedPage: 1, activeFilters: filters, limit: 8 });
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
    loadJobs({ requestedPage: 1, limit: 8 });
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > jobsState.totalPages) return;
    setPage(nextPage);
    loadJobs({ requestedPage: nextPage, activeFilters: appliedFilters, limit: 8 });
  };

  const toggleSaveJob = async (jobId) => {
    const id = String(jobId);
    if (savingJobs.has(id)) return;
    setSavingJobs((current) => new Set(current).add(id));
    try {
      if (savedIds.has(id)) { 
        await apiRequest(`/job-seeker/jobs/${jobId}/save`, { method: 'DELETE', auth: true }); 
      } else { 
        await apiRequest(`/job-seeker/jobs/${jobId}/save`, { method: 'POST', auth: true }); 
      }
      await loadSavedAndAppliedJobs();
    } catch (error) {
      setJobsState((current) => ({ ...current, error: error.message || 'Saved jobs could not be updated.' }));
    }
    finally { setSavingJobs((current) => { const next = new Set(current); next.delete(id); return next; }); }
  };

  // Filter out jobs that the user has already applied for from the available jobs list
  const availableJobs = jobsState.jobs.filter(job => !appliedIds.has(String(job.id)));

  return (
    <DashboardLayout title="Jobs Center" subtitle="Find new roles or track your applications.">
      <style>{premiumCSS}</style>
      <div className="dash-stack">
        
        {/* 🔥 Custom Professional Tabs Header */}
        <div className="dash-tabs-container">
          <div className="dash-tabs">
            <button 
              className={`dash-tab ${activeTab === 'available' ? 'active' : ''}`}
              onClick={() => setActiveTab('available')}
            >
              <BriefcaseBusiness size={18} /> 
              Available Jobs 
              {activeTab === 'available' && <span className="tab-badge">{jobsState.total}</span>}
            </button>
            <button 
              className={`dash-tab ${activeTab === 'applied' ? 'active' : ''}`}
              onClick={() => setActiveTab('applied')}
            >
              <CheckCircle2 size={18} /> 
              Applied Jobs 
              <span className="tab-badge">{myAppliedJobs.length}</span>
            </button>
          </div>
        </div>

        {/* =========================================
            AVAILABLE JOBS SECTION (WITH FILTERS)
        ========================================== */}
        {activeTab === 'available' && (
          <section className="dash-panel">
            
            {/* Filters Form (Only visible in Available Jobs tab) */}
            <form onSubmit={applyFilters} className="pro-filter-form">
              <div className="pro-filter-grid">
                <div className="input-group">
                  <label className="input-label">Keywords</label>
                  <div className="input-wrapper">
                    <Search className="input-icon" size={16} />
                    <input className="pro-input" placeholder="Job title, skill, or company" value={filters.q} onChange={(e) => setFilters(c => ({...c, q: e.target.value}))} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Location</label>
                  <div className="input-wrapper">
                    <MapPin className="input-icon" size={16} />
                    <input className="pro-input" placeholder="City or province" value={filters.location} onChange={(e) => setFilters(c => ({...c, location: e.target.value}))} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <div className="input-wrapper">
                    <Layers className="input-icon" size={16} />
                    <Select className="pro-input" value={filters.category} onChange={(e) => setFilters(c => ({...c, category: e.target.value}))}>
                      <option value="">All Categories</option>
                      {categories.map((c) => <option key={c.id} value={c.slug || c.id}>{c.name}</option>)}
                    </Select>
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Work Setup</label>
                  <div className="input-wrapper">
                    <MonitorSmartphone className="input-icon" size={16} />
                    <Select className="pro-input" value={filters.workplace} onChange={(e) => setFilters(c => ({...c, workplace: e.target.value}))}>
                      <option value="">Any Workplace</option>
                      <option value="remote">Remote</option>
                      <option value="onsite">On-site</option>
                      <option value="hybrid">Hybrid</option>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="pro-filter-actions">
                {(filters.q || filters.location || filters.category || filters.workplace) && (
                  <button type="button" className="btn-secondary" onClick={clearFilters}>
                    Clear All
                  </button>
                )}
                <button type="submit" className="btn-primary">
                  <Search size={16} /> Search Jobs
                </button>
              </div>
            </form>

            <div className="results-divider">
              <span>{jobsState.total} available jobs found</span>
            </div>

            {/* Results Grid */}
            {jobsState.loading ? (
              <SkeletonContent variant="cards" rows={6} label="Loading opportunities…"/>
            ) : availableJobs.length ? (
              <>
                <div className="dash-job-grid">
                  {availableJobs.map((job) => (
                    <DashboardJobCard 
                      key={job.id} 
                      job={job} 
                      saved={savedIds.has(String(job.id))} 
                      onSave={toggleSaveJob} 
                      applied={false} 
                    />
                  ))}
                </div>
                {/* Pagination */}
                {jobsState.totalPages > 1 && (
                  <div className="pagination-bar">
                    <button className="btn-icon" disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft size={18} /></button>
                    <span className="pagination-text">Page {page} of {jobsState.totalPages}</span>
                    <button className="btn-icon" disabled={page >= jobsState.totalPages} onClick={() => changePage(page + 1)}><ChevronRight size={18} /></button>
                  </div>
                )}
              </>
            ) : (
              <Empty text="No available jobs found for the selected filters." icon={<Search size={32} />} />
            )}
          </section>
        )}

        {/* =========================================
            APPLIED JOBS SECTION (NO FILTERS)
        ========================================== */}
        {activeTab === 'applied' && (
          <section className="dash-panel">
            <div className="dash-heading" style={{ marginBottom: '24px', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#111827', margin: 0 }}>Your Applications</h2>
              <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Track all the jobs you have applied for so far.</p>
            </div>
            
            {myAppliedJobs.length > 0 ? (
              <div className="dash-job-grid">
                {myAppliedJobs.map((job) => (
                  <DashboardJobCard 
                    key={job.id} 
                    job={job} 
                    saved={savedIds.has(String(job.id))} 
                    onSave={toggleSaveJob} 
                    applied={true} 
                  />
                ))}
              </div>
            ) : (
              <Empty text="You haven't applied to any jobs yet." icon={<CheckCircle2 size={32} />} />
            )}
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}

/* --- STYLES --- */
const premiumCSS = `
  .dash-stack { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }
  
  /* 🔥 Tabs UI CSS */
  .dash-tabs-container {
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 8px;
  }
  .dash-tabs {
    display: flex;
    gap: 32px;
  }
  .dash-tab {
    background: none;
    border: none;
    padding: 0 0 16px 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: #6b7280;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 3px solid transparent;
    transition: all 0.2s ease;
    margin-bottom: -1px;
  }
  .dash-tab:hover {
    color: #111827;
  }
  .dash-tab.active {
    color: #2557a7;
    border-bottom-color: #2557a7;
  }
  .tab-badge {
    background: #f1f5f9;
    color: #475569;
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 12px;
    margin-left: 4px;
    transition: all 0.2s;
  }
  .dash-tab.active .tab-badge {
    background: #eef2f9;
    color: #2557a7;
  }

  .dash-panel { 
    background: #ffffff; 
    border: 1px solid #e5e7eb; 
    border-radius: 12px; 
    padding: 28px; 
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1); 
  }
  
  .pro-filter-form { display: flex; flex-direction: column; gap: 20px; }
  
  .pro-filter-grid { 
    display: grid; 
    grid-template-columns: 1.5fr 1.1fr 1.2fr 1.2fr; 
    gap: 16px; 
  }
  
  .input-group { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .input-label { font-size: 0.85rem; font-weight: 600; color: #4b5563; white-space: nowrap; }
  
  .input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
  
  .input-icon { 
    position: absolute; 
    left: 12px; 
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af; 
    pointer-events: none; 
    transition: color 0.2s; 
  }
  
  .pro-input { 
    width: 100%; 
    box-sizing: border-box;
    padding: 10px 12px 10px 36px;
    border: 1px solid #d1d5db; 
    border-radius: 8px; 
    font-size: 0.875rem; 
    background: #ffffff;
    color: #111827;
    outline: none; 
    transition: all 0.2s ease; 
    appearance: none;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .pro-input::placeholder { color: #9ca3af; }
  .pro-input:hover { border-color: #9ca3af; }
  
  .input-wrapper:focus-within .input-icon { color: #2557a7; }
  .input-wrapper:focus-within .pro-input { 
    border-color: #2557a7; 
    box-shadow: 0 0 0 3px rgba(37, 87, 167, 0.1); 
  }

  select.pro-input {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 16px;
    padding-right: 36px;
    cursor: pointer;
  }

  .pro-filter-actions { 
    display: flex; justify-content: flex-end; align-items: center; gap: 12px; 
  }
  
  .btn-primary { 
    background: #2557a7; color: #fff; border: none; padding: 10px 20px; 
    border-radius: 8px; font-weight: 500; font-size: 0.875rem; cursor: pointer; 
    display: inline-flex; align-items: center; gap: 8px; transition: background-color 0.2s; 
  }
  .btn-primary:hover { background: #1d4586; }
  
  .btn-secondary { 
    background: #ffffff; color: #374151; border: 1px solid #d1d5db; padding: 10px 16px; 
    border-radius: 8px; font-weight: 500; font-size: 0.875rem; cursor: pointer; 
    display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; 
  }
  .btn-secondary:hover { background: #f9fafb; color: #111827; }

  .results-divider {
    margin: 28px 0 20px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.95rem;
    color: #4b5563;
    font-weight: 600;
  }

  /* Loading Spinner */
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

  /* ===== ENHANCED AESTHETIC JOB CARDS ===== */
  .dash-job-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
    gap: 20px; 
  }

  .dash-job-card { 
    background: #ffffff; 
    border: 1.5px solid #e2e8f0; 
    border-radius: 16px; 
    padding: 22px; 
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); 
    display: flex; 
    flex-direction: column; 
    position: relative; 
    box-shadow: 0 2px 6px -1px rgba(0, 0, 0, 0.04);
  }
  .dash-job-card:hover { 
    border-color: #3b82f6; 
    box-shadow: 0 12px 28px -4px rgba(37, 99, 235, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04); 
    transform: translateY(-3px); 
  }

  .dash-job-card-top { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-start; 
    margin-bottom: 14px; 
  }

  .pro-company-avatar {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
    border: 1px solid #dbeafe;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #2563eb;
    font-size: 1.15rem;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }
  .pro-logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .save-btn { 
    width: 36px; 
    height: 36px; 
    border-radius: 50%; 
    border: 1px solid #e2e8f0; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    background: #ffffff; 
    color: #94a3b8; 
    cursor: pointer; 
    transition: all 0.2s; 
    flex-shrink: 0;
  }
  .save-btn:hover { 
    background: #f8fafc; 
    color: #2563eb; 
    border-color: #cbd5e1;
    transform: scale(1.05);
  }
  .save-btn.saved { 
    background: #eff6ff; 
    color: #2563eb; 
    border-color: #93c5fd; 
  }

  .pro-company-name {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 4px;
  }
  .verified-badge-icon {
    color: #2563eb;
  }

  .dash-job-card h3 { 
    margin: 0 0 12px 0; 
    font-size: 1.12rem; 
    font-weight: 700; 
    line-height: 1.35; 
  }
  .dash-job-card h3 a { 
    color: #0f172a; 
    text-decoration: none; 
    transition: color 0.15s;
  }
  .dash-job-card h3 a:hover { 
    color: #2563eb; 
  }

  .pro-badges-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .pro-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .workplace-remote {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
  }
  .workplace-hybrid {
    background: #f5f3ff;
    color: #7c3aed;
    border: 1px solid #ddd6fe;
  }
  .workplace-on_site, .workplace-onsite {
    background: #f8fafc;
    color: #475569;
    border: 1px solid #e2e8f0;
  }
  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .pill-type {
    background: #f1f5f9;
    color: #334155;
    border: 1px solid #e2e8f0;
  }
  .pill-location {
    background: #f8fafc;
    color: #64748b;
    border: 1px solid #e2e8f0;
  }

  .pro-salary-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #15803d;
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 700;
    margin-bottom: 14px;
    align-self: flex-start;
  }

  .pro-skills-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }
  .pro-skill-chip {
    font-size: 0.72rem;
    font-weight: 600;
    color: #475569;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 2px 7px;
  }

  .pro-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px solid #f1f5f9;
  }
  .pro-time-ago {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    color: #94a3b8;
    font-weight: 500;
  }
  .pro-view-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #2563eb;
    text-decoration: none;
    transition: all 0.15s;
    padding: 6px 12px;
    border-radius: 6px;
    background: #eff6ff;
  }
  .pro-view-btn:hover {
    background: #2563eb;
    color: #ffffff;
    transform: translateX(2px);
  }

  .applied-badge {
    position: absolute;
    top: 16px;
    right: 56px; 
    background: #ecfdf5;
    color: #059669;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 12px;
    border: 1px solid #a7f3d0;
    display: flex;
    align-items: center;
    gap: 4px;
    letter-spacing: 0.2px;
    white-space: nowrap;
  }

  /* Pagination */
  .pagination-bar { 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    gap: 16px; 
    margin-top: 32px; 
    padding-top: 24px; 
    border-top: 1px solid #f3f4f6; 
  }
  .pagination-text { 
    font-size: 0.875rem; 
    color: #4b5563; 
    font-weight: 600; 
  }
  .btn-icon { 
    width: 36px; 
    height: 36px; 
    border: 1px solid #e5e7eb; 
    background: #fff; 
    border-radius: 8px; 
    display: grid; 
    place-items: center; 
    cursor: pointer; 
    color: #4b5563; 
    transition: all 0.2s; 
  }
  .btn-icon:hover:not(:disabled) { 
    background: #f9fafb; 
    border-color: #d1d5db; 
    color: #111827; 
  }
  .btn-icon:disabled { 
    opacity: 0.5; 
    cursor: not-allowed; 
  }
  
  .dash-empty { 
    min-height: 200px; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
    border: 2px dashed #e5e7eb; 
    border-radius: 12px; 
    color: #6b7280; 
    font-size: 0.95rem; 
    background: #f9fafb; 
    gap: 12px; 
  }

  /* Responsive */
  @media (max-width: 1200px) { 
    .pro-filter-grid { grid-template-columns: repeat(2, 1fr); } 
  }
  @media (max-width: 600px) { 
    .pro-filter-grid { grid-template-columns: 1fr; } 
    .pro-filter-actions { flex-direction: column-reverse; width: 100%; }
    .pro-filter-actions button { width: 100%; justify-content: center; }
    .dash-tabs { gap: 16px; }
    .dash-tab { font-size: 0.95rem; }
    .dash-job-grid { grid-template-columns: 1fr; }
    .applied-badge { 
      position: static; 
      margin-top: 8px; 
      align-self: flex-start;
    }
    .dash-job-card { position: relative; }
    .dash-job-card-top { margin-bottom: 8px; }
  }
`;

/* --- REUSABLE COMPONENTS --- */
function LoadingSpinner() {
  return (
    <div className="job-spinner-container">
      <div className="circular-spinner"></div>
      <span style={{ color: '#4b5563', fontSize: '0.95rem', fontWeight: '500' }}>Loading data...</span>
    </div>
  );
}

function DashboardJobCard({ job, saved, onSave, applied }) { 
  const company = getCompanyName(job);
  const location = getLocation(job);
  const salary = formatSalary(job);
  const initial = company.charAt(0).toUpperCase() || 'J';
  const workplace = (job.workplace_type || (job.is_remote ? 'remote' : 'on_site')).toLowerCase();
  const time = timeAgo(job.created_at || job.published_at);

  let skillsList = [];
  if (Array.isArray(job.skills)) skillsList = job.skills.slice(0, 3);
  else if (Array.isArray(job.tags)) skillsList = job.tags.slice(0, 3);
  else if (job.category_name) skillsList = [job.category_name];

  return (
    <article className="dash-job-card">
      {applied && (
        <div className="applied-badge">
          <CheckCircle2 size={12} /> Applied
        </div>
      )}
      <div className="dash-job-card-top">
        <div className="pro-company-avatar">
          {job.companies?.logo_path || job.company?.logo_path ? (
            <img src={job.companies?.logo_path || job.company?.logo_path} alt={company} className="pro-logo-img" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <button
          type="button"
          className={`save-btn ${saved ? 'saved' : ''}`}
          onClick={() => onSave(job.id)}
          title={saved ? "Unsave Job" : "Save Job"}
        >
          {saved ? <Check size={16} /> : <Bookmark size={16} />}
        </button>
      </div>

      <div className="pro-company-name">
        <span>{company}</span>
        <ShieldCheck size={14} className="verified-badge-icon" title="Verified Employer" />
      </div>

      <h3>
        <Link to={`/dashboard/job-seeker/jobs/${job.id}`}>{job.title}</Link>
      </h3>

      <div className="pro-badges-row">
        <span className={`pro-pill workplace-${workplace}`}>
          <span className="pulse-dot" />
          {workplace === 'remote' ? 'Remote' : workplace === 'hybrid' ? 'Hybrid' : 'On-site'}
        </span>
        <span className="pro-pill pill-type">
          <BriefcaseBusiness size={12} /> {formatType(job.employment_type)}
        </span>
        <span className="pro-pill pill-location">
          <MapPin size={12} /> {location}
        </span>
      </div>

      {salary && (
        <div className="pro-salary-pill">
          <DollarSign size={13} />
          <span>{salary}</span>
        </div>
      )}

      {skillsList.length > 0 && (
        <div className="pro-skills-chips">
          {skillsList.map((skill, idx) => (
            <span key={idx} className="pro-skill-chip">{typeof skill === 'string' ? skill : (skill?.name || String(skill))}</span>
          ))}
        </div>
      )}

      <div className="pro-card-footer">
        <span className="pro-time-ago">
          <Clock size={13} /> {time || 'Recently posted'}
        </span>
        <Link to={`/dashboard/job-seeker/jobs/${job.id}`} className="pro-view-btn">
          View Job <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  ); 
}

function Empty({ text, icon }) { 
  return <div className="dash-empty"><div style={{ color: '#d1d5db' }}>{icon}</div> {text}</div>; 
}

function getCompanyName(job) { 
  return job?.companies?.name || job?.company?.name || job?.company_name || 'Employer'; 
}

function getLocation(job) { 
  if (job?.is_remote && !job.city && !job.province) return 'Remote'; 
  return [job?.city, job?.province].filter(Boolean).join(', ') || 'Remote / Unspecified'; 
}

function formatType(value) { 
  if (!value) return 'Full-time'; 
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()); 
}
