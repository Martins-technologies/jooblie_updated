import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Eye, Users, UserRoundCheck, Building2, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import SkeletonContent from '../../shared/components/Skeleton';
import { MetricCard, Monogram, PanelHeading, StatusBadge, WorkspaceEmpty } from '../../shared/components/WorkspaceCards';
import { useAuth } from '../../shared/context/AuthContext';
import { apiRequest } from '../../shared/lib/api';
import { formatDate } from '../../shared/lib/format';
import { jobLocation } from '../../shared/lib/dashboardPresentation';

export default function RecruiterDashboardPage() {
  const { profile } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', data: {} });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setState(current => ({ ...current, loading: true, error: '' }));
    apiRequest('/recruiter/dashboard', { auth: true, signal: controller.signal }).then(data => { if (!controller.signal.aborted) setState({ loading: false, error: '', data }); }).catch(error => { if (error.name !== 'AbortError') setState(current => ({ ...current, loading: false, error: error.message })); });
    return () => controller.abort();
  }, [attempt]);
  const { data } = state, metrics = data.metrics || {}, pipeline = data.pipeline || {}, jobs = data.jobs || [], apps = data.recentApplications || [];
  const stages = [['submitted', 'New applicants', '#438cff'], ['shortlisted', 'Shortlisted', '#9568e5'], ['interviewing', 'Interviewing', '#e9b256'], ['hired', 'Hired', '#31b188']];
  const max = Math.max(1, ...stages.map(([key]) => Number(pipeline[key]) || 0));
  return <DashboardLayout title={`Welcome back, ${(profile?.full_name || 'there').trim().split(' ')[0]}`} subtitle="Good people make great teams. Here’s how your hiring is moving.">
    {state.error && <div role="alert" className="error-banner">{state.error} <button type="button" className="text-button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
    <div className="workspace-stack">
      {state.loading ? <SkeletonContent variant="dashboard" rows={0} metrics={5} label="Loading hiring overview..." /> : <div className="workspace-metrics workspace-metrics--five"><MetricCard icon={BriefcaseBusiness} value={metrics.jobs} label="Total jobs" hint="Every opportunity matters" /><MetricCard icon={BriefcaseBusiness} value={metrics.activeJobs} label="Active jobs" hint="Open for applications" tone="green" /><MetricCard icon={Users} value={metrics.applications} label="Applicants" hint="Your talent community" tone="purple" /><MetricCard icon={Eye} value={metrics.views} label="Job views" hint="Reach across the network" tone="cyan" /><MetricCard icon={UserRoundCheck} value={pipeline.hired} label="Hired" hint="Great teams start here" tone="amber" /></div>}
      <div className="workspace-grid"><section className="workspace-panel"><PanelHeading title="Your latest opportunities" description="Keep an eye on the roles bringing people to your team." to="/my-jobs" link="Manage jobs" />
        {state.loading ? <SkeletonContent rows={4} label="Loading job postings..." /> : jobs.length ? <table className="workspace-table"><thead><tr><th>Opportunity</th><th>Location</th><th>Status</th><th><span className="sr-only">View job</span></th></tr></thead><tbody>{jobs.slice(0, 4).map((job, index) => <tr key={job.id}><td><div className="workspace-table__role"><Monogram name={job.title} index={index} /><div><Link to={`/jobs/${job.id}`}><strong>{job.title}</strong></Link><small>{formatDate(job.created_at)}</small></div></div></td><td>{jobLocation(job)}</td><td><StatusBadge status={job.status} /></td><td><Link to={`/jobs/${job.id}`} aria-label={`View ${job.title}`}><ChevronRight size={15} /></Link></td></tr>)}</tbody></table> : <WorkspaceEmpty to="/post-job" action="Post your first job">Your next great hire starts with an opportunity.</WorkspaceEmpty>}
      </section><aside className="workspace-side"><section className="workspace-panel"><PanelHeading title="Your hiring pipeline" description="A clear view of your candidate journey." />{state.loading ? <SkeletonContent rows={4} label="Loading pipeline..." /> : <div className="workspace-pipeline">{stages.map(([key, label, color]) => <div key={key}><div className="workspace-pipeline__label"><span>{label}</span><strong>{Number(pipeline[key] || 0)}</strong></div><div className="workspace-pipeline__track"><span style={{ width: `${Number(pipeline[key] || 0) / max * 100}%`, '--stage-color': color }} /></div></div>)}</div>}<Link to="/candidates" className="workspace-text-link" style={{ marginTop: 24 }}>Explore candidates<ArrowRight size={13} /></Link></section><div className="workspace-callout"><Building2 size={24} /><div><h3>Make a great first impression</h3><p>Help candidates discover what makes your company special.</p><Link to="/my-company" className="workspace-text-link">Review company profile<ArrowRight size={12} /></Link></div></div></aside></div>
      <section className="workspace-panel"><PanelHeading title="Recent applicants" description="Meet the people interested in joining your team." to="/candidates" />{state.loading ? <SkeletonContent rows={3} label="Loading applicants..." /> : apps.length ? <table className="workspace-table"><thead><tr><th>Candidate</th><th>Applied</th><th>Status</th><th><span className="sr-only">View candidates</span></th></tr></thead><tbody>{apps.slice(0, 4).map((application, index) => <tr key={application.id}><td><div className="workspace-table__role"><Monogram name={application.profiles?.full_name || 'Candidate'} index={index} /><div><Link to="/candidates"><strong>{application.profiles?.full_name || 'Candidate'}</strong></Link><small>{application.jobs?.title || 'Job application'}</small></div></div></td><td>{formatDate(application.created_at) || '—'}</td><td><StatusBadge status={application.status} /></td><td><Link to="/candidates" aria-label="Review candidate"><ChevronRight size={15} /></Link></td></tr>)}</tbody></table> : <WorkspaceEmpty>New applications will appear here when candidates apply to your jobs.</WorkspaceEmpty>}</section>
    </div>
  </DashboardLayout>;
}
