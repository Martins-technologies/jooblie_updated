import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Bookmark, BriefcaseBusiness, CheckCircle2, Circle, ChevronRight, Trophy, Sparkles, ChevronDown, ChevronUp, Award, GraduationCap, FileText, UserRound } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import SkeletonContent from '../../shared/components/Skeleton';
import { JobPreviewCard, MetricCard, Monogram, PanelHeading, StatusBadge, WorkspaceEmpty } from '../../shared/components/WorkspaceCards';
import { useAuth } from '../../shared/context/AuthContext';
import { apiRequest } from '../../shared/lib/api';
import { supabase } from '../../shared/lib/supabase';
import { companyName, profileProgress, arrayValue } from '../../shared/lib/dashboardPresentation';
import { formatDate } from '../../shared/lib/format';

const EMPTY = { metrics: {}, applications: [], savedJobs: [], profile: null };

export default function JobSeekerDashboardPage() {
  const { profile } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', data: EMPTY });
  const [jobs, setJobs] = useState({ loading: true, error: '', items: [] });
  const [recommended, setRecommended] = useState({ loading: true, items: [] });
  const [saving, setSaving] = useState(new Set());
  const [checklistOpen, setChecklistOpen] = useState(false);
  const inFlight = useRef(new Set());

  const load = useCallback(async signal => {
    try {
      const data = await apiRequest('/job-seeker/dashboard', { auth: true, signal });
      if (!signal?.aborted) setState({ loading: false, error: '', data: { ...EMPTY, ...data } });
    } catch (error) {
      if (error.name !== 'AbortError') setState(current => ({ ...current, loading: false, error: error.message }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    load(signal);

    apiRequest('/public/jobs?page=1&limit=4', { signal })
      .then(data => { if (!signal.aborted) setJobs({ loading: false, error: '', items: data.items || data.jobs || [] }); })
      .catch(error => { if (error.name !== 'AbortError') setJobs({ loading: false, error: error.message, items: [] }); });

    apiRequest('/job-seeker/recommended-jobs?limit=4', { auth: true, signal })
      .then(data => { if (!signal.aborted) setRecommended({ loading: false, items: data.items || data.jobs || [] }); })
      .catch(error => { if (error.name !== 'AbortError') setRecommended({ loading: false, items: [] }); });

    return () => controller.abort();
  }, [load]);

  // 🔥 REAL-TIME STATUS SYNC: Supabase WebSocket + Polling + Focus listener
  useEffect(() => {
    const targetUserId = profile?.id || state.data.profile?.id;
    let channel = null;

    if (supabase && targetUserId) {
      channel = supabase
        .channel(`seeker-realtime-apps-${targetUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'applications',
            filter: `applicant_id=eq.${targetUserId}`,
          },
          () => {
            load();
          }
        )
        .subscribe();
    }

    // Backup polling every 8s for live update reflection
    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        load();
      }
    }, 8000);

    const onFocus = () => load();
    window.addEventListener('focus', onFocus);

    return () => {
      if (channel) supabase?.removeChannel(channel);
      clearInterval(pollTimer);
      window.removeEventListener('focus', onFocus);
    };
  }, [profile?.id, state.data.profile?.id, load]);

  const savedIds = useMemo(() => new Set((state.data.savedJobs || []).map(item => String(item.job_id || item.jobs?.id))), [state.data.savedJobs]);

  const toggleSave = async id => {
    const key = String(id);
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setSaving(new Set(inFlight.current));
    try {
      await apiRequest(`/job-seeker/jobs/${id}/save`, { method: savedIds.has(key) ? 'DELETE' : 'POST', auth: true });
      await load();
    } catch (error) {
      setState(current => ({ ...current, error: error.message }));
    } finally {
      inFlight.current.delete(key);
      setSaving(new Set(inFlight.current));
    }
  };

  const data = state.data;
  const metrics = data.metrics || {};
  const currentProfile = data.profile || profile || {};
  const progress = profileProgress(currentProfile);
  const choices = recommended.items.length ? recommended.items : jobs.items;
  const name = (profile?.full_name || 'there').trim().split(' ')[0];

  const hasEducation = arrayValue(currentProfile.education).length > 0;
  const hasSkills = arrayValue(currentProfile.skills).some(s => typeof s === 'string' ? Boolean(s.trim()) : Boolean(s));
  const is100Percent = progress.percent === 100;

  return (
    <DashboardLayout title={`Welcome back, ${name}`} subtitle="Your next opportunity is one step closer.">
      <style>{dashboardBannerStyles}</style>

      {state.error && (
        <div className="error-banner" role="alert">
          {state.error} <button type="button" className="text-button" onClick={() => load()}>Try again</button>
        </div>
      )}

      <div className="workspace-stack">
        {/* 🔥 DYNAMIC 100% PROFILE COMPLETION TOGGLE BANNER */}
        {!state.loading && !is100Percent && (
          <div className="profile-banner-card profile-banner-incomplete fade-in">
              <div className="profile-banner-header">
                <div className="profile-banner-content">
                  <div className="profile-banner-badge is-warning">
                    <Sparkles size={15} /> <span>Profile Completion Strength Meter</span>
                  </div>
                  <h2>Profile Health: {progress.percent < 40 ? 'Needs Attention' : progress.percent < 80 ? 'Intermediate' : 'Strong'} ({progress.percent}%)</h2>
                  <p>Employers prioritize applicants with complete details. Complete the dynamic checklist below to hit 100%.</p>
                </div>
                <div className="profile-banner-meter-group">
                  <div className="profile-meter-pill">
                    <div className="profile-meter-track">
                      <div className="profile-meter-fill" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <strong>{progress.percent}%</strong>
                  </div>
                  <div className="profile-banner-buttons">
                    <button
                      type="button"
                      className="btn-banner-toggle"
                      onClick={() => setChecklistOpen(!checklistOpen)}
                      aria-expanded={checklistOpen}
                    >
                      {checklistOpen ? <>Hide Checklist <ChevronUp size={14} /></> : <>Profile Strength Checklist <ChevronDown size={14} /></>}
                    </button>
                    <Link to="/dashboard/job-seeker/profile" className="btn-banner-primary">
                      Complete Profile Now <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>

              {checklistOpen && (
                <div className="profile-banner-checklist-drawer">
                  <h4>Dynamic Action Checklist to Reach 100%:</h4>
                  <div className="checklist-cards-grid">
                    <Link to="/dashboard/job-seeker/profile?tab=basic" className={`checklist-step-card ${progress.basic ? 'done' : 'pending'}`}>
                      <div className="step-icon"><UserRound size={16} /></div>
                      <div>
                        <strong>{progress.basic ? 'Basic Details' : '+40% Basic Details'}</strong>
                        <span>{progress.basic ? 'Completed' : 'Name, Phone, Headline, City'}</span>
                      </div>
                      <div className="step-status">{progress.basic ? <CheckCircle2 size={16} /> : <Circle size={16} />}</div>
                    </Link>

                    <Link to="/dashboard/job-seeker/profile?tab=experience" className={`checklist-step-card ${progress.experience ? 'done' : 'pending'}`}>
                      <div className="step-icon"><BriefcaseBusiness size={16} /></div>
                      <div>
                        <strong>{progress.experience ? 'Work Experience' : '+15% Add Work Experience'}</strong>
                        <span>{progress.experience ? 'Completed' : 'Add at least 1 past or current role'}</span>
                      </div>
                      <div className="step-status">{progress.experience ? <CheckCircle2 size={16} /> : <Circle size={16} />}</div>
                    </Link>

                    <Link to="/dashboard/job-seeker/profile?tab=education" className={`checklist-step-card ${hasEducation ? 'done' : 'pending'}`}>
                      <div className="step-icon"><GraduationCap size={16} /></div>
                      <div>
                        <strong>{hasEducation ? 'Education' : '+15% Add Education'}</strong>
                        <span>{hasEducation ? 'Completed' : 'Add your degree or certification'}</span>
                      </div>
                      <div className="step-status">{hasEducation ? <CheckCircle2 size={16} /> : <Circle size={16} />}</div>
                    </Link>

                    <Link to="/dashboard/job-seeker/profile?tab=skills" className={`checklist-step-card ${hasSkills ? 'done' : 'pending'}`}>
                      <div className="step-icon"><Award size={16} /></div>
                      <div>
                        <strong>{hasSkills ? 'Skills' : '+10% Add at least 5 Skills'}</strong>
                        <span>{hasSkills ? 'Completed' : 'Highlight your core competencies'}</span>
                      </div>
                      <div className="step-status">{hasSkills ? <CheckCircle2 size={16} /> : <Circle size={16} />}</div>
                    </Link>

                    <Link to="/dashboard/job-seeker/profile?tab=resume" className={`checklist-step-card ${progress.resume ? 'done' : 'pending'}`}>
                      <div className="step-icon"><FileText size={16} /></div>
                      <div>
                        <strong>{progress.resume ? 'Resume Attached' : '+20% Upload Resume'}</strong>
                        <span>{progress.resume ? 'Uploaded' : 'Upload .pdf or .docx document'}</span>
                      </div>
                      <div className="step-status">{progress.resume ? <CheckCircle2 size={16} /> : <Circle size={16} />}</div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        }

        {state.loading ? (
          <SkeletonContent variant="dashboard" rows={0} label="Loading your career overview..." />
        ) : (
          <div className="workspace-metrics">
            <MetricCard icon={BriefcaseBusiness} value={metrics.applications} label="Applications" hint="Your career in motion" />
            <MetricCard icon={Bookmark} value={metrics.savedJobs} label="Saved jobs" hint="Ready when you are" tone="purple" />
            <MetricCard icon={CheckCircle2} value={metrics.shortlisted} label="Shortlisted" hint="One step closer" tone="green" />
            <MetricCard icon={Trophy} value={metrics.offers} label="Offers" hint="Your next beginning" tone="amber" />
          </div>
        )}

        <div className="workspace-grid">
          <section className="workspace-panel">
            <PanelHeading
              title={recommended.items.length ? 'Recommended for you' : 'Explore opportunities'}
              description={recommended.items.length ? 'Opportunities selected using your profile and interests.' : 'Fresh roles to help you take the next step.'}
              to="/dashboard/job-seeker/jobs"
              link="View all jobs"
            />
            {recommended.loading || (!recommended.items.length && jobs.loading) ? (
              <SkeletonContent variant="cards" rows={4} label="Loading opportunities..." />
            ) : choices.length ? (
              <div className="workspace-job-grid">
                {choices.slice(0, 4).map((job, index) => (
                  <JobPreviewCard key={job.id} index={index} job={job} saved={savedIds.has(String(job.id))} saving={saving.has(String(job.id))} onSave={toggleSave} />
                ))}
              </div>
            ) : (
              <WorkspaceEmpty to="/dashboard/job-seeker/jobs">
                {jobs.error ? 'Opportunities could not be loaded. Try browsing jobs again.' : 'New opportunities will appear here as they are posted.'}
              </WorkspaceEmpty>
            )}
          </section>

          <aside className="workspace-side">
            <section className="workspace-panel workspace-profile">
              {state.loading ? (
                <SkeletonContent rows={3} label="Loading profile progress..." />
              ) : (
                <>
                  <div className="workspace-profile__intro">
                    <div>
                      <h2>Stand out to recruiters</h2>
                      <p>A complete profile helps employers get to know you.</p>
                    </div>
                    <div className="workspace-progress" style={{ '--progress': progress.percent }} role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
                      <span>{progress.percent}%</span>
                    </div>
                  </div>
                  <div className="workspace-checklist">
                    {[[progress.basic, 'Basic information'], [progress.experience, 'Work experience'], [progress.resume, 'Upload your resume']].map(([done, label]) => (
                      <Link to="/dashboard/job-seeker/profile" key={label}>
                        {done ? <CheckCircle2 size={17} className="is-done" /> : <Circle size={17} />}
                        <span>{label}</span>
                        <ChevronRight size={13} />
                      </Link>
                    ))}
                  </div>
                  <Link to="/dashboard/job-seeker/profile" className="button button--primary">
                    {progress.percent === 100 ? 'Review profile' : 'Complete profile'}
                    <ArrowRight size={14} />
                  </Link>
                </>
              )}
            </section>
            <div className="workspace-callout">
              <Bell size={23} />
              <div>
                <h3>Your search, your preferences</h3>
                <p>Keep your account and communication preferences up to date.</p>
                <Link to="/dashboard/job-seeker/settings" className="workspace-text-link">Manage preferences<ArrowRight size={12} /></Link>
              </div>
            </div>
          </aside>
        </div>

        <section className="workspace-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <PanelHeading title="Recent applications" description="Real-time status updates on where your applications stand." to="/dashboard/job-seeker/applications" />
            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} /> Live updates active
            </span>
          </div>
          {state.loading ? (
            <SkeletonContent rows={3} label="Loading applications..." />
          ) : data.applications?.length ? (
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Role / company</th>
                  <th>Date applied</th>
                  <th>Status</th>
                  <th><span className="sr-only">View job</span></th>
                </tr>
              </thead>
              <tbody>
                {data.applications.slice(0, 6).map((application, index) => {
                  const job = application.jobs || application.job || {};
                  const id = application.job_id || job.id;
                  return (
                    <tr key={application.id}>
                      <td>
                        <div className="workspace-table__role">
                          <Monogram name={companyName(job)} index={index} />
                          <div>
                            {id ? <Link to={`/jobs/${id}`}><strong>{job.title || 'Job application'}</strong></Link> : <strong>{job.title || 'Job application'}</strong>}
                            <small>{companyName(job)}</small>
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(application.created_at) || '—'}</td>
                      <td>
                        <StatusBadge status={application.status} />
                      </td>
                      <td>
                        {id && <Link to={`/jobs/${id}`} aria-label={`View ${job.title || 'job'}`}><ChevronRight size={15} /></Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <WorkspaceEmpty to="/dashboard/job-seeker/jobs">Your applications will appear here. Find a role that feels right for you.</WorkspaceEmpty>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

const dashboardBannerStyles = `
  .profile-banner-card {
    border-radius: 14px;
    padding: 24px 28px;
    margin-bottom: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    transition: all 0.25s ease;
  }
  .profile-banner-incomplete {
    background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
    border: 1px solid #bfdbfe;
  }
  .profile-banner-complete {
    background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%);
    border: 1px solid #a7f3d0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
  }
  .profile-banner-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  .profile-banner-content h2 {
    font-size: 1.25rem;
    font-weight: 750;
    color: #111827;
    margin: 6px 0;
  }
  .profile-banner-content p {
    font-size: 0.92rem;
    color: #4b5563;
    margin: 0;
    max-width: 650px;
  }
  .profile-banner-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 4px 10px;
    border-radius: 20px;
    margin-bottom: 4px;
  }
  .profile-banner-badge.is-warning {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }
  .profile-banner-badge.is-success {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }
  .profile-banner-meter-group {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
  }
  .profile-meter-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fff;
    border: 1px solid #dbeafe;
    padding: 6px 14px;
    border-radius: 30px;
  }
  .profile-meter-track {
    width: 100px;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }
  .profile-meter-fill {
    height: 100%;
    background: #2563eb;
    border-radius: 4px;
    transition: width 0.4s ease;
  }
  .profile-meter-pill strong {
    font-size: 0.95rem;
    color: #1e3a8a;
  }
  .profile-banner-buttons {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .btn-banner-toggle {
    background: #fff;
    border: 1px solid #cbd5e1;
    color: #334155;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 9px 15px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }
  .btn-banner-toggle:hover {
    background: #f8fafc;
    border-color: #94a3b8;
  }
  .btn-banner-primary {
    background: #2563eb;
    color: #fff;
    font-size: 0.88rem;
    font-weight: 650;
    padding: 10px 18px;
    border-radius: 8px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
  }
  .btn-banner-primary:hover {
    background: #1d4ed8;
  }
  .profile-banner-checklist-drawer {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #dbeafe;
    animation: fadeIn 0.2s ease-in-out;
  }
  .profile-banner-checklist-drawer h4 {
    font-size: 0.88rem;
    color: #334155;
    margin: 0 0 12px 0;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .checklist-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .checklist-step-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
  }
  .checklist-step-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.04);
  }
  .checklist-step-card.done {
    border-color: #a7f3d0;
    background: #f0fdf4;
  }
  .checklist-step-card.done .step-icon {
    background: #dcfce7;
    color: #15803d;
  }
  .checklist-step-card.done .step-status {
    color: #15803d;
  }
  .checklist-step-card.pending .step-icon {
    background: #eff6ff;
    color: #2563eb;
  }
  .checklist-step-card.pending .step-status {
    color: #94a3b8;
  }
  .step-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .checklist-step-card div strong {
    display: block;
    font-size: 0.88rem;
    color: #0f172a;
  }
  .checklist-step-card div span {
    font-size: 0.75rem;
    color: #64748b;
  }
  .step-status {
    margin-left: auto;
    flex-shrink: 0;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.9); }
  }
`;
