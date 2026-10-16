import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Bookmark, BriefcaseBusiness, CheckCircle2, Circle, ChevronRight, Trophy } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import SkeletonContent from '../../shared/components/Skeleton';
import { JobPreviewCard, MetricCard, Monogram, PanelHeading, StatusBadge, WorkspaceEmpty } from '../../shared/components/WorkspaceCards';
import { useAuth } from '../../shared/context/AuthContext';
import { apiRequest } from '../../shared/lib/api';
import { companyName, profileProgress } from '../../shared/lib/dashboardPresentation';
import { formatDate } from '../../shared/lib/format';

const EMPTY = { metrics: {}, applications: [], savedJobs: [], profile: null };
export default function JobSeekerDashboardPage() {
  const { profile } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', data: EMPTY });
  const [jobs, setJobs] = useState({ loading: true, error: '', items: [] });
  const [recommended, setRecommended] = useState({ loading: true, items: [] });
  const [saving, setSaving] = useState(new Set());
  const inFlight = useRef(new Set());
  const load = useCallback(async signal => {
    try {
      const data = await apiRequest('/job-seeker/dashboard', { auth: true, signal });
      if (!signal?.aborted) setState({ loading: false, error: '', data: { ...EMPTY, ...data } });
    } catch (error) { if (error.name !== 'AbortError') setState(current => ({ ...current, loading: false, error: error.message })); }
  }, []);
  useEffect(() => {
    const controller = new AbortController(); const signal = controller.signal;
    load(signal);
    apiRequest('/public/jobs?page=1&limit=4', { signal }).then(data => { if (!signal.aborted) setJobs({ loading: false, error: '', items: data.items || data.jobs || [] }); }).catch(error => { if (error.name !== 'AbortError') setJobs({ loading: false, error: error.message, items: [] }); });
    apiRequest('/job-seeker/recommended-jobs?limit=4', { auth: true, signal }).then(data => { if (!signal.aborted) setRecommended({ loading: false, items: data.items || data.jobs || [] }); }).catch(error => { if (error.name !== 'AbortError') setRecommended({ loading: false, items: [] }); });
    return () => controller.abort();
  }, [load]);
  const savedIds = useMemo(() => new Set((state.data.savedJobs || []).map(item => String(item.job_id || item.jobs?.id))), [state.data.savedJobs]);
  const toggleSave = async id => {
    const key = String(id); if (inFlight.current.has(key)) return;
    inFlight.current.add(key); setSaving(new Set(inFlight.current));
    try { await apiRequest(`/job-seeker/jobs/${id}/save`, { method: savedIds.has(key) ? 'DELETE' : 'POST', auth: true }); await load(); }
    catch (error) { setState(current => ({ ...current, error: error.message })); }
    finally { inFlight.current.delete(key); setSaving(new Set(inFlight.current)); }
  };
  const data = state.data, metrics = data.metrics || {}, progress = profileProgress(data.profile || profile || {});
  const choices = recommended.items.length ? recommended.items : jobs.items;
  const name = (profile?.full_name || 'there').trim().split(' ')[0];
  return <DashboardLayout title={`Welcome back, ${name}`} subtitle="Your next opportunity is one step closer.">
    {state.error && <div className="error-banner" role="alert">{state.error} <button type="button" className="text-button" onClick={() => load()}>Try again</button></div>}
    <div className="workspace-stack">
      {state.loading ? <SkeletonContent variant="dashboard" rows={0} label="Loading your career overview..." /> : <div className="workspace-metrics">
        <MetricCard icon={BriefcaseBusiness} value={metrics.applications} label="Applications" hint="Your career in motion" />
        <MetricCard icon={Bookmark} value={metrics.savedJobs} label="Saved jobs" hint="Ready when you are" tone="purple" />
        <MetricCard icon={CheckCircle2} value={metrics.shortlisted} label="Shortlisted" hint="One step closer" tone="green" />
        <MetricCard icon={Trophy} value={metrics.offers} label="Offers" hint="Your next beginning" tone="amber" />
      </div>}
      <div className="workspace-grid">
        <section className="workspace-panel"><PanelHeading title={recommended.items.length ? 'Recommended for you' : 'Explore opportunities'} description={recommended.items.length ? 'Opportunities selected using your profile and interests.' : 'Fresh roles to help you take the next step.'} to="/dashboard/job-seeker/jobs" link="View all jobs" />
          {recommended.loading || (!recommended.items.length && jobs.loading) ? <SkeletonContent variant="cards" rows={4} label="Loading opportunities..." /> : choices.length ? <div className="workspace-job-grid">{choices.slice(0, 4).map((job, index) => <JobPreviewCard key={job.id} index={index} job={job} saved={savedIds.has(String(job.id))} saving={saving.has(String(job.id))} onSave={toggleSave} />)}</div> : <WorkspaceEmpty to="/dashboard/job-seeker/jobs">{jobs.error ? 'Opportunities could not be loaded. Try browsing jobs again.' : 'New opportunities will appear here as they are posted.'}</WorkspaceEmpty>}
        </section>
        <aside className="workspace-side"><section className="workspace-panel workspace-profile">{state.loading ? <SkeletonContent rows={3} label="Loading profile progress..." /> : <>
          <div className="workspace-profile__intro"><div><h2>Stand out to recruiters</h2><p>A complete profile helps employers get to know you.</p></div><div className="workspace-progress" style={{ '--progress': progress.percent }} role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness"><span>{progress.percent}%</span></div></div>
          <div className="workspace-checklist">{[[progress.basic, 'Basic information'], [progress.experience, 'Work experience'], [progress.resume, 'Upload your resume']].map(([done, label]) => <Link to="/dashboard/job-seeker/profile" key={label}>{done ? <CheckCircle2 size={17} className="is-done" /> : <Circle size={17} />}<span>{label}</span><ChevronRight size={13} /></Link>)}</div><Link to="/dashboard/job-seeker/profile" className="button button--primary">{progress.percent === 100 ? 'Review profile' : 'Complete profile'}<ArrowRight size={14} /></Link>
        </>}</section><div className="workspace-callout"><Bell size={23} /><div><h3>Your search, your preferences</h3><p>Keep your account and communication preferences up to date.</p><Link to="/dashboard/job-seeker/settings" className="workspace-text-link">Manage preferences<ArrowRight size={12} /></Link></div></div></aside>
      </div>
      <section className="workspace-panel"><PanelHeading title="Recent applications" description="A little clarity on where your next chapter stands." to="/dashboard/job-seeker/applications" />
        {state.loading ? <SkeletonContent rows={3} label="Loading applications..." /> : data.applications?.length ? <table className="workspace-table"><thead><tr><th>Role / company</th><th>Date applied</th><th>Status</th><th><span className="sr-only">View job</span></th></tr></thead><tbody>{data.applications.slice(0, 4).map((application, index) => { const job = application.jobs || application.job || {}; const id = application.job_id || job.id; return <tr key={application.id}><td><div className="workspace-table__role"><Monogram name={companyName(job)} index={index} /><div>{id ? <Link to={`/jobs/${id}`}><strong>{job.title || 'Job application'}</strong></Link> : <strong>{job.title || 'Job application'}</strong>}<small>{companyName(job)}</small></div></div></td><td>{formatDate(application.created_at) || '—'}</td><td><StatusBadge status={application.status} /></td><td>{id && <Link to={`/jobs/${id}`} aria-label={`View ${job.title || 'job'}`}><ChevronRight size={15} /></Link>}</td></tr>; })}</tbody></table> : <WorkspaceEmpty to="/dashboard/job-seeker/jobs">Your applications will appear here. Find a role that feels right for you.</WorkspaceEmpty>}
      </section>
    </div>
  </DashboardLayout>;
}
