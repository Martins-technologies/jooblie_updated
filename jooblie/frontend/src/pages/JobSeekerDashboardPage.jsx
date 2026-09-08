import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bookmark, BriefcaseBusiness, Building2, Check,
  ChevronLeft, ChevronRight, FileText, FileUp, Filter, Laptop,
  MapPin, Search, Trophy, UserRound, X, CheckCircle2, Clock,
  Plus, Trash2, Award, UploadCloud
} from 'lucide-react';

import DashboardLayout from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const EMPTY_DASHBOARD = {
  metrics: { applications: 0, savedJobs: 0, offers: 0 },
  profile: null,
  applications: [],
  savedJobs: [],
};

const EMPTY_PROFILE = {
  full_name: '', phone: '', headline: '', location_city: '',
  location_province: '', skills: '', default_resume_path: '',
  experience: [], // Naya field experience ke liye
};

const EMPTY_FILTERS = {
  q: '', location: '', category: '', type: '', workplace: '',
};

function getCurrentView(pathname) {
  if (pathname.includes('/dashboard/job-seeker/jobs')) return 'jobs';
  if (pathname.includes('/dashboard/job-seeker/applications')) return 'applications';
  if (pathname.includes('/dashboard/job-seeker/saved')) return 'saved';
  if (pathname.includes('/dashboard/job-seeker/profile')) return 'profile';
  if (pathname.includes('/dashboard/job-seeker/settings')) return 'settings';
  return 'overview';
}

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

function normalizeRecommended(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.jobs || payload.items || payload.recommendedJobs || payload.recommended_jobs || [];
}

export default function JobSeekerDashboardPage() {
  const location = useLocation();
  const auth = useAuth();
  const currentView = getCurrentView(location.pathname);

  const [dashboardState, setDashboardState] = useState({ loading: true, error: '', success: '', data: EMPTY_DASHBOARD });
  const [jobsState, setJobsState] = useState({ loading: true, error: '', jobs: [], total: 0, page: 1, totalPages: 1 });
  const [recommendedState, setRecommendedState] = useState({ loading: true, jobs: [] });
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [resumeFile, setResumeFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingJobs, setSavingJobs] = useState(new Set());

  const savedIds = useMemo(
    () => new Set((dashboardState.data.savedJobs || []).map((item) => String(item.job_id || item.jobs?.id))),
    [dashboardState.data.savedJobs]
  );

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */
  const loadDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) setDashboardState((current) => ({ ...current, loading: true }));
    try {
      const result = await apiRequest('/job-seeker/dashboard', { auth: true });
      setDashboardState((current) => ({
        ...current, loading: false, error: '',
        data: {
          ...EMPTY_DASHBOARD, ...result,
          metrics: { ...EMPTY_DASHBOARD.metrics, ...(result?.metrics || {}) },
          applications: result?.applications || [],
          savedJobs: result?.savedJobs || result?.saved_jobs || [],
        },
      }));
    } catch (error) {
      setDashboardState((current) => ({ ...current, loading: false, error: error.message || 'Could not load dashboard.' }));
    }
  }, []);

  /* =======================================================
     CATEGORIES
  ======================================================= */
  const loadCategories = useCallback(async () => {
    try {
      const result = await apiRequest('/public/categories');
      const list = result?.categories || result?.items || (Array.isArray(result) ? result : []);
      setCategories(list);
    } catch { setCategories([]); }
  }, []);

  /* =======================================================
     JOBS
  ======================================================= */
  const loadJobs = useCallback(async ({ requestedPage = 1, activeFilters = EMPTY_FILTERS, limit = 8 } = {}) => {
    setJobsState((current) => ({ ...current, loading: true, error: '' }));
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
      const normalized = normalizeJobsResponse(result);
      setJobsState({ loading: false, error: '', ...normalized });
    } catch (error) {
      setJobsState({ loading: false, error: error.message || 'Could not load jobs.', jobs: [], total: 0, page: 1, totalPages: 1 });
    }
  }, []);

  /* =======================================================
     RECOMMENDED
  ======================================================= */
  const loadRecommended = useCallback(async () => {
    setRecommendedState({ loading: true, jobs: [] });
    try {
      const result = await apiRequest('/job-seeker/recommended-jobs?limit=6', { auth: true });
      setRecommendedState({ loading: false, jobs: normalizeRecommended(result).slice(0, 6) });
    } catch { setRecommendedState({ loading: false, jobs: [] }); }
  }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */
  useEffect(() => {
    loadDashboard();
    loadCategories();
    loadRecommended();
    loadJobs({ requestedPage: 1, limit: 8 });
  }, [loadDashboard, loadCategories, loadRecommended, loadJobs]);

  /* =======================================================
     PROFILE SYNC
  ======================================================= */
  useEffect(() => {
    const profile = dashboardState.data.profile;
    if (!profile) return;
    
    // Safety check for experience JSON parsing if backend stores it as string
    let parsedExperience = [];
    if (profile.experience) {
      parsedExperience = Array.isArray(profile.experience) ? profile.experience : (typeof profile.experience === 'string' ? JSON.parse(profile.experience).catch(()=>[]) : []);
    }

    setProfileForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      headline: profile.headline || '',
      location_city: profile.location_city || '',
      location_province: profile.location_province || '',
      skills: (profile.skills || []).join(', '),
      default_resume_path: profile.default_resume_path || '',
      experience: parsedExperience,
    });
  }, [dashboardState.data.profile]);

  /* =======================================================
     EXPERIENCE HANDLERS
  ======================================================= */
  const addExperience = () => {
    setProfileForm(c => ({
      ...c, 
      experience: [...c.experience, { title: '', company: '', startDate: '', endDate: '', description: '', current: false }]
    }));
  };

  const updateExperience = (index, field, value) => {
    const newExp = [...profileForm.experience];
    newExp[index][field] = value;
    setProfileForm(c => ({...c, experience: newExp}));
  };

  const removeExperience = (index) => {
    const newExp = profileForm.experience.filter((_, i) => i !== index);
    setProfileForm(c => ({...c, experience: newExp}));
  };

  /* =======================================================
     FILTER
  ======================================================= */
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

  /* =======================================================
     PAGINATION
  ======================================================= */
  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > jobsState.totalPages) return;
    setPage(nextPage);
    loadJobs({ requestedPage: nextPage, activeFilters: appliedFilters, limit: 8 });
  };

  /* =======================================================
     SAVE JOB
  ======================================================= */
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
      await loadDashboard(false);
    } catch (error) {
      setDashboardState((current) => ({ ...current, error: error.message || 'Could not update saved job.' }));
    } finally {
      setSavingJobs((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  /* =======================================================
     PROFILE SAVE
  ======================================================= */
  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setDashboardState((current) => ({ ...current, error: '', success: '' }));

    try {
      let resumePath = profileForm.default_resume_path || null;
      if (resumeFile) {
        if (!supabase || !auth.user?.id) throw new Error('Resume upload is not available.');
        if (resumeFile.size > 5 * 1024 * 1024) throw new Error('Resume must be 5 MB or smaller.');

        const safeName = resumeFile.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
        const path = `${auth.user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('resumes').upload(path, resumeFile, { upsert: false, contentType: resumeFile.type || undefined });
        if (uploadError) throw uploadError;
        resumePath = path;
      }

      const result = await apiRequest('/auth/profile', {
        method: 'PATCH',
        auth: true,
        body: {
          full_name: profileForm.full_name,
          phone: profileForm.phone || null,
          headline: profileForm.headline || null,
          location_city: profileForm.location_city || null,
          location_province: profileForm.location_province || null,
          skills: profileForm.skills.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 50),
          default_resume_path: resumePath,
          experience: profileForm.experience // Saving the new experience array
        },
      });

      setDashboardState((current) => ({
        ...current,
        success: 'Profile updated successfully.',
        data: { ...current.data, profile: result.profile },
      }));
      setResumeFile(null);
      await auth.refreshProfile();
      await loadRecommended();
      
      // Auto clear success message after 4s
      setTimeout(() => {
        setDashboardState(curr => ({...curr, success: ''}));
      }, 4000);

    } catch (error) {
      setDashboardState((current) => ({ ...current, error: error.message || 'Could not update profile.' }));
    } finally {
      setSavingProfile(false);
    }
  };

  const data = dashboardState.data;
  const recommendationJobs = recommendedState.jobs.length ? recommendedState.jobs : jobsState.jobs.slice(0, 6);

  const pageDetails = {
    overview: { title: 'Dashboard Overview', subtitle: 'Your job search progress at a glance.' },
    jobs: { title: 'Search Jobs', subtitle: 'Find your next career opportunity.' },
    applications: { title: 'My Applications', subtitle: 'Track the status of your submitted applications.' },
    saved: { title: 'Saved Jobs', subtitle: 'Opportunities you have bookmarked for later.' },
    profile: { title: 'My Profile', subtitle: 'Build your resume and stand out to employers.' },
    settings: { title: 'Account Settings', subtitle: 'Manage your account preferences.' },
  };

  const details = pageDetails[currentView];

  return (
    <DashboardLayout title={details.title} subtitle={details.subtitle}>
      {/* =========================================
          PREMIUM CSS INJECTION
      ========================================= */}
      <style>{`
        /* Core Layout */
        .dash-stack { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }
        
        .dash-panel {
          background: #ffffff;
          border: 1px solid #e8e8e8;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        }

        /* Headings */
        .dash-heading { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
        .dash-heading h2 { margin: 0; color: #111827; font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 8px;}
        .dash-heading p { margin: 4px 0 0; color: #6b7280; font-size: 0.9rem; }
        .dash-link { color: #2557a7; font-weight: 600; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
        .dash-link:hover { color: #164081; text-decoration: underline; }

        /* Metrics Grid (3 Columns) */
        .dash-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .metric-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 18px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          transition: all 0.3s ease;
        }

        .metric-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
          transform: translateY(-4px); 
        }

        .metric-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .metric-icon.blue { background: #f0f4ff; color: #2557a7; }
        .metric-icon.purple { background: #f5f3ff; color: #6d28d9; }
        .metric-icon.green { background: #f0fdf4; color: #15803d; }
        .metric-icon.orange { background: #fff7ed; color: #ea580c; }

        .metric-content { display: flex; flex-direction: column; }
        .metric-content strong { font-size: 1.75rem; font-weight: 800; color: #111827; line-height: 1; margin-bottom: 6px; }
        .metric-content span { color: #6b7280; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }

        /* Job Grid (Mini Cards) */
        .dash-job-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .dash-job-card {
          background: #fff; border: 1px solid #e8e8e8; border-radius: 12px; padding: 20px;
          transition: all 0.2s; display: flex; flex-direction: column;
        }
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

        /* List Rows (Latest Jobs, Applications) */
        .dash-list-row {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 16px 0; border-bottom: 1px solid #f0f0f0; transition: background 0.2s;
        }
        .dash-list-row:last-child { border-bottom: none; padding-bottom: 0; }
        .row-left { display: flex; align-items: center; gap: 16px; flex-grow: 1; }
        .row-info h3 { margin: 0 0 4px 0; font-size: 1rem; font-weight: 600; }
        .row-info h3 a { color: #111827; text-decoration: none; }
        .row-info h3 a:hover { color: #2557a7; text-decoration: underline; }
        .row-info p { margin: 0; color: #6b7280; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
        
        /* Status Pills */
        .status-pill { padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 4px; }
        .status-pill.submitted { background: #eef2f9; color: #2557a7; }
        .status-pill.reviewing { background: #fff7ed; color: #ea580c; }
        .status-pill.interview { background: #f3e8ff; color: #7c3aed; }
        .status-pill.accepted { background: #ecfdf5; color: #059669; }
        .status-pill.rejected { background: #fef2f2; color: #e11d48; }

        /* =========================================
           FORMS & FILTERS
        ========================================= */
        .dash-filter-inputs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
        .dash-filter-actions { display: flex; justify-content: flex-end; align-items: center; gap: 12px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { color: #374151; font-size: 0.85rem; font-weight: 600; }
        .form-input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; color: #111827; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .form-input:focus { border-color: #2557a7; box-shadow: 0 0 0 3px rgba(37, 87, 167, 0.1); }
        .form-textarea { resize: vertical; min-height: 100px; }
        
        /* Buttons */
        .btn-primary { background: #2557a7; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-primary:hover { background: #164081; }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
        
        .btn-secondary { background: #fff; color: #4b5563; border: 1px solid #d1d5db; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-secondary:hover { background: #f9fafb; border-color: #9ca3af; color: #111827; }

        .btn-danger-ghost { background: transparent; color: #e11d48; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 4px;}
        .btn-danger-ghost:hover { background: #fef2f2; }

        .btn-icon { width: 42px; height: 42px; border: 1px solid #d1d5db; background: #fff; border-radius: 8px; display: grid; place-items: center; cursor: pointer; color: #4b5563; transition: all 0.2s; }
        .btn-icon:hover { background: #f3f4f6; color: #111827; }

        /* Empty States & Banners */
        .dash-empty { min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed #e5e7eb; border-radius: 12px; color: #6b7280; font-size: 0.95rem; background: #f9fafb; }
        .banner { padding: 12px 16px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
        .banner-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .banner-success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }

        /* =========================================
           PROFILE BUILDER LAYOUT (LinkedIn Style)
        ========================================= */
        .profile-builder-grid {
          display: grid;
          grid-template-columns: 2.5fr 1fr;
          gap: 24px;
          align-items: flex-start;
        }

        .profile-section-card {
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .profile-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
          color: #111827;
        }
        .profile-section-header h3 { margin: 0; font-size: 1.2rem; font-weight: 700; }

        .profile-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }

        /* Experience Items */
        .experience-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          position: relative;
        }
        .experience-item:last-child { margin-bottom: 0; }
        
        .exp-header-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }

        /* Skills Pills */
        .skills-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .skill-pill {
          background: #eef2f9;
          color: #2557a7;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Resume Upload Box */
        .resume-upload-box {
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 24px 16px;
          text-align: center;
          background: #f9fafb;
          transition: all 0.2s;
        }
        .resume-upload-box:hover { border-color: #2557a7; background: #f0f4ff; }
        .resume-upload-box input[type="file"] { display: none; }
        .resume-upload-label { cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; color: #4b5563; }
        .resume-upload-label .icon { color: #2557a7; }
        .resume-file-name { margin-top: 12px; font-size: 0.85rem; color: #059669; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; }

        /* Sticky Save Bar */
        .sticky-save-card {
          position: sticky;
          top: 24px;
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .sticky-save-card p { font-size: 0.9rem; color: #6b7280; margin: 0 0 16px 0; }

        /* Account Settings Row */
        .account-row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f0f0f0; }
        .account-row:last-child { border-bottom: none; }
        .account-label { font-weight: 600; color: #374151; }
        .account-value { color: #6b7280; }

        @media (max-width: 1024px) {
          .dash-metrics { grid-template-columns: repeat(2, 1fr); }
          .dash-filter-inputs { grid-template-columns: repeat(2, 1fr); }
          .profile-builder-grid { grid-template-columns: 1fr; }
          .sticky-save-card { position: static; margin-bottom: 24px; }
        }
        @media (max-width: 600px) {
          .dash-metrics { grid-template-columns: 1fr; }
          .dash-filter-inputs { grid-template-columns: 1fr; }
          .dash-filter-actions { flex-direction: column-reverse; }
          .dash-filter-actions button { width: 100%; }
          .profile-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {dashboardState.error && <div className="banner banner-error"><X size={18}/> {dashboardState.error}</div>}
      {dashboardState.success && <div className="banner banner-success"><CheckCircle2 size={18}/> {dashboardState.success}</div>}

      {/* =========================================================
          OVERVIEW TAB
      ========================================================= */}
      {currentView === 'overview' && (
        <div className="dash-stack">
          <div className="dash-metrics">
            <Metric icon={BriefcaseBusiness} label="Applications" value={data.metrics.applications} colorClass="blue" />
            <Metric icon={Bookmark} label="Saved Jobs" value={data.metrics.savedJobs} colorClass="purple" />
            <Metric icon={Trophy} label="Offers" value={data.metrics.offers} colorClass="green" />
          </div>

          <section className="dash-panel">
            <Heading title="Recommended Jobs" text="Curated opportunities matching your profile." />
            {recommendedState.loading ? (
              <Empty text="Loading recommendations..." />
            ) : recommendationJobs.length ? (
              <div className="dash-job-grid">
                {recommendationJobs.map((job) => (
                  <DashboardJobCard key={job.id} job={job} saved={savedIds.has(String(job.id))} onSave={toggleSaveJob} />
                ))}
              </div>
            ) : (
              <Empty text="No recommendations available right now." />
            )}
          </section>

          <section className="dash-panel">
            <Heading title="Latest Openings" text="Recently published roles on Jooblie." action={<Link to="/dashboard/job-seeker/jobs" className="dash-link">View all jobs</Link>} />
            {jobsState.loading ? (
              <Empty text="Loading latest jobs..." />
            ) : jobsState.jobs.length ? (
              <div>
                {jobsState.jobs.slice(0, 5).map((job) => (
                  <JobRow key={job.id} job={job} saved={savedIds.has(String(job.id))} onSave={toggleSaveJob} />
                ))}
              </div>
            ) : (
              <Empty text="No recent jobs found." />
            )}
          </section>

          <section className="dash-panel">
            <Heading title="Recent Applications" text="Status of your recently submitted profiles." action={<Link to="/dashboard/job-seeker/applications" className="dash-link">View all</Link>} />
            {data.applications.length ? (
              <div>
                {data.applications.slice(0, 4).map((app) => (
                  <ApplicationRow key={app.id} application={app} />
                ))}
              </div>
            ) : (
              <Empty text="You haven't applied to any jobs yet." />
            )}
          </section>
        </div>
      )}

      {/* =========================================================
          JOBS SEARCH TAB
      ========================================================= */}
      {currentView === 'jobs' && (
        <div className="dash-stack">
          <section className="dash-panel">
            <Heading title="Discover Jobs" text="Filter and search for the perfect role." />
            
            <form onSubmit={applyFilters}>
              <div className="dash-filter-inputs">
                <FilterField label="Keywords">
                  <input className="form-input" placeholder="Title, skill, or company" value={filters.q} onChange={(e) => setFilters(c => ({...c, q: e.target.value}))} />
                </FilterField>
                <FilterField label="Location">
                  <input className="form-input" placeholder="City or province" value={filters.location} onChange={(e) => setFilters(c => ({...c, location: e.target.value}))} />
                </FilterField>
                <FilterField label="Category">
                  <select className="form-input" value={filters.category} onChange={(e) => setFilters(c => ({...c, category: e.target.value}))}>
                    <option value="">All Categories</option>
                    {categories.map((c) => <option key={c.id} value={c.slug || c.id}>{c.name}</option>)}
                  </select>
                </FilterField>
                <FilterField label="Workplace">
                  <select className="form-input" value={filters.workplace} onChange={(e) => setFilters(c => ({...c, workplace: e.target.value}))}>
                    <option value="">Any</option>
                    <option value="remote">Remote</option>
                    <option value="onsite">On-site</option>
                  </select>
                </FilterField>
              </div>
              
              <div className="dash-filter-actions">
                <button type="button" className="btn-secondary" onClick={clearFilters}>
                  <X size={16} /> Clear Filters
                </button>
                <button type="submit" className="btn-primary">
                  <Search size={16} /> Search Jobs
                </button>
              </div>
            </form>
          </section>

          <section className="dash-panel">
            <Heading title="Search Results" text={`${jobsState.total} jobs found matching your criteria.`} />
            {jobsState.loading ? (
              <Empty text="Loading jobs..." />
            ) : jobsState.jobs.length ? (
              <>
                <div className="dash-job-grid">
                  {jobsState.jobs.map((job) => (
                    <DashboardJobCard key={job.id} job={job} saved={savedIds.has(String(job.id))} onSave={toggleSaveJob} />
                  ))}
                </div>
                
                {/* Pagination */}
                {jobsState.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                    <button className="btn-icon" disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft size={18} /></button>
                    <span style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: '500' }}>Page {page} of {jobsState.totalPages}</span>
                    <button className="btn-icon" disabled={page >= jobsState.totalPages} onClick={() => changePage(page + 1)}><ChevronRight size={18} /></button>
                  </div>
                )}
              </>
            ) : (
              <Empty text="No jobs found for the selected filters." />
            )}
          </section>
        </div>
      )}

      {/* =========================================================
          APPLICATIONS TAB
      ========================================================= */}
      {currentView === 'applications' && (
        <section className="dash-panel">
          <Heading title="My Applications" text="Track the status of roles you have applied for." />
          {data.applications.length ? (
            <div>
              {data.applications.map((app) => (
                <ApplicationRow key={app.id} application={app} />
              ))}
            </div>
          ) : (
            <Empty text="You haven't submitted any applications yet." />
          )}
        </section>
      )}

      {/* =========================================================
          SAVED JOBS TAB
      ========================================================= */}
      {currentView === 'saved' && (
        <section className="dash-panel">
          <Heading title="Saved Jobs" text="Opportunities you have bookmarked to review later." />
          {data.savedJobs.length ? (
            <div className="dash-job-grid">
              {data.savedJobs.map((saved) => {
                const job = saved.jobs || saved.job;
                if (!job) return null;
                return <DashboardJobCard key={saved.job_id || job.id} job={job} saved onSave={toggleSaveJob} />;
              })}
            </div>
          ) : (
            <Empty text="You have no saved jobs." />
          )}
        </section>
      )}

      {/* =========================================================
          PROFILE TAB (LINKEDIN STYLE)
      ========================================================= */}
      {currentView === 'profile' && (
        <form onSubmit={saveProfile} className="profile-builder-grid">
          
          {/* LEFT COLUMN: MAIN PROFILE SECTIONS */}
          <div className="profile-main-column">
            
            {/* 1. Basic Info Section */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <UserRound size={20} color="#2557a7" />
                <h3>Basic Information</h3>
              </div>
              <div className="profile-form-grid">
                <ProfileField label="Full Name" value={profileForm.full_name} onChange={(val) => setProfileForm(c => ({...c, full_name: val}))} />
                <ProfileField label="Phone Number" value={profileForm.phone} onChange={(val) => setProfileForm(c => ({...c, phone: val}))} />
                <ProfileField label="Professional Headline" value={profileForm.headline} onChange={(val) => setProfileForm(c => ({...c, headline: val}))} wide placeholder="e.g. Senior Software Engineer at Tech Corp" />
                <ProfileField label="City" value={profileForm.location_city} onChange={(val) => setProfileForm(c => ({...c, location_city: val}))} />
                <ProfileField label="Province / State" value={profileForm.location_province} onChange={(val) => setProfileForm(c => ({...c, location_province: val}))} />
              </div>
            </div>

            {/* 2. Experience Section */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <BriefcaseBusiness size={20} color="#2557a7" />
                <h3>Work Experience</h3>
              </div>
              
              {profileForm.experience.length === 0 && (
                <p style={{color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px'}}>No experience added yet. Add your past roles to stand out to employers.</p>
              )}

              {profileForm.experience.map((exp, index) => (
                <div key={index} className="experience-item">
                  <div className="exp-header-actions">
                    <button type="button" className="btn-danger-ghost" onClick={() => removeExperience(index)}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                  <div className="profile-form-grid">
                    <ProfileField label="Job Title" value={exp.title} onChange={(val) => updateExperience(index, 'title', val)} placeholder="e.g. Product Manager" />
                    <ProfileField label="Company" value={exp.company} onChange={(val) => updateExperience(index, 'company', val)} placeholder="e.g. Google" />
                    <ProfileField label="Start Date" value={exp.startDate} onChange={(val) => updateExperience(index, 'startDate', val)} placeholder="MM/YYYY" />
                    <ProfileField label="End Date" value={exp.endDate} onChange={(val) => updateExperience(index, 'endDate', val)} placeholder="MM/YYYY or Present" />
                    <div className="form-group full-width">
                      <label>Description</label>
                      <textarea className="form-input form-textarea" value={exp.description} onChange={(e) => updateExperience(index, 'description', e.target.value)} placeholder="Describe your responsibilities and achievements..." />
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="btn-secondary" onClick={addExperience} style={{marginTop: '8px'}}>
                <Plus size={16} /> Add Experience
              </button>
            </div>

            {/* 3. Skills Section */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <Award size={20} color="#2557a7" />
                <h3>Skills</h3>
              </div>
              <p style={{color: '#6b7280', fontSize: '0.85rem', marginBottom: '12px'}}>Add skills separated by commas (e.g. JavaScript, React, Node.js).</p>
              <ProfileField label="" value={profileForm.skills} onChange={(val) => setProfileForm(c => ({...c, skills: val}))} wide placeholder="Enter your skills..." />
              
              {/* Live Skill Badges Preview */}
              {profileForm.skills.trim() && (
                <div className="skills-preview">
                  {profileForm.skills.split(',').map((skill, i) => skill.trim() && (
                    <span key={i} className="skill-pill">{skill.trim()}</span>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: RESUME & SAVE BUTTON */}
          <div className="profile-sidebar-column">
            
            <div className="sticky-save-card">
              <div className="profile-section-header" style={{ marginBottom: '16px' }}>
                <FileText size={20} color="#2557a7" />
                <h3>Resume</h3>
              </div>
              
              <div className="resume-upload-box">
                <label className="resume-upload-label">
                  <UploadCloud size={32} className="icon" />
                  <span style={{fontWeight: '600', color: '#111827', marginTop: '8px'}}>Upload new resume</span>
                  <span style={{fontSize: '0.8rem'}}>PDF, DOCX up to 5MB</span>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              {resumeFile && (
                <div className="resume-file-name">
                  <CheckCircle2 size={16} /> {resumeFile.name}
                </div>
              )}
              {!resumeFile && profileForm.default_resume_path && (
                <div className="resume-file-name" style={{color: '#4b5563'}}>
                  <FileText size={14}/> Existing resume uploaded
                </div>
              )}

              <hr style={{border: 0, borderTop: '1px solid #e8e8e8', margin: '24px 0'}} />
              
              <p>Review your information carefully before saving. This profile is visible to employers when you apply.</p>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Profile Updates'}
              </button>
            </div>

          </div>

        </form>
      )}

      {/* =========================================================
          SETTINGS TAB
      ========================================================= */}
      {currentView === 'settings' && (
        <section className="dash-panel">
          <Heading title="Account Settings" text="Manage your Jooblie account details." />
          <div>
            <div className="account-row"><span className="account-label">Full Name</span><span className="account-value">{data.profile?.full_name || 'Not provided'}</span></div>
            <div className="account-row"><span className="account-label">Email Address</span><span className="account-value">{auth.user?.email || 'Not available'}</span></div>
            <div className="account-row"><span className="account-label">Account Type</span><span className="account-value" style={{ background: '#eef2f9', color: '#2557a7', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>Job Seeker</span></div>
          </div>
        </section>
      )}

    </DashboardLayout>
  );
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function Heading({ title, text, action }) {
  return (
    <div className="dash-heading">
      <div>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}

function Metric({ icon: Icon, label, value, colorClass }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${colorClass}`}><Icon size={24} /></div>
      <div className="metric-content">
        <strong>{value || 0}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function FilterField({ label, children }) {
  return <label className="form-group"><span style={{color: '#4b5563', fontWeight: '600', fontSize: '0.85rem'}}>{label}</span>{children}</label>;
}

function ProfileField({ label, value, onChange, wide = false, placeholder = '' }) {
  if (!label) return <input className="form-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
  return (
    <label className={`form-group ${wide ? 'full-width' : ''}`}>
      <span>{label}</span>
      <input className="form-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// Mini Job Card for Dashboard Grid
function DashboardJobCard({ job, saved, onSave }) {
  return (
    <article className="dash-job-card">
      <div className="dash-job-card-top">
        <div className="dash-logo-box"><Building2 size={20} /></div>
        <button type="button" className={`save-btn ${saved ? 'saved' : ''}`} onClick={() => onSave(job.id)} title={saved ? "Unsave" : "Save Job"}>
          {saved ? <Check size={16} /> : <Bookmark size={16} />}
        </button>
      </div>
      <h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3>
      <span className="dash-company-name">{getCompanyName(job)}</span>
      
      <div className="dash-job-meta">
        <span className="meta-badge"><MapPin size={12} /> {getLocation(job)}</span>
        <span className="meta-badge"><BriefcaseBusiness size={12} /> {formatType(job.employment_type)}</span>
      </div>
    </article>
  );
}

// List Row for Latest Jobs
function JobRow({ job, saved, onSave }) {
  return (
    <article className="dash-list-row">
      <div className="row-left">
        <div className="dash-logo-box" style={{ width: '40px', height: '40px' }}><Building2 size={18} /></div>
        <div className="row-info">
          <h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3>
          <p>{getCompanyName(job)} • {getLocation(job)}</p>
        </div>
      </div>
      <button type="button" className={`save-btn ${saved ? 'saved' : ''}`} onClick={() => onSave(job.id)}>
        {saved ? <Check size={16} /> : <Bookmark size={16} />}
      </button>
    </article>
  );
}

// List Row for Applications
function ApplicationRow({ application }) {
  const job = application.jobs || application.job || {};
  const statusRaw = String(application.status || 'submitted').toLowerCase();
  
  // Map status to color classes
  let pillClass = 'submitted';
  if (statusRaw.includes('review')) pillClass = 'reviewing';
  if (statusRaw.includes('interview')) pillClass = 'interview';
  if (statusRaw.includes('accept') || statusRaw.includes('hired')) pillClass = 'accepted';
  if (statusRaw.includes('reject') || statusRaw.includes('decline')) pillClass = 'rejected';

  return (
    <div className="dash-list-row">
      <div className="row-left">
        <div className="dash-logo-box" style={{ width: '40px', height: '40px', background: '#f3f4f6', color: '#6b7280' }}><FileText size={18} /></div>
        <div className="row-info">
          <h3><Link to={`/jobs/${application.job_id || job.id}`}>{job.title || 'Job Application'}</Link></h3>
          <p>{getCompanyName(job)} <Clock size={12} style={{marginLeft: '6px'}}/> Applied recently</p>
        </div>
      </div>
      <span className={`status-pill ${pillClass}`}>
        {statusRaw.replace('_', ' ')}
      </span>
    </div>
  );
}

function Empty({ text }) {
  return <div className="dash-empty"><Search size={32} style={{ marginBottom: '12px', color: '#d1d5db' }}/> {text}</div>;
}

// Helpers
function getCompanyName(job) { return job?.companies?.name || job?.company?.name || job?.company_name || 'Employer'; }
function getLocation(job) {
  if (job?.is_remote && !job.city && !job.province) return 'Remote';
  return [job?.city, job?.province].filter(Boolean).join(', ') || 'Remote / Unspecified';
}
function formatType(value) {
  if (!value) return 'Job';
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}