import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Eye,
  FileCheck2,
  Filter,
  Globe2,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Reveal from '../components/Reveal';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { formatDate, timeAgo } from '../lib/format';

const emptyPipeline = {
  submitted: 0,
  viewed: 0,
  shortlisted: 0,
  interviewing: 0,
  offered: 0,
  hired: 0,
  rejected: 0,
  withdrawn: 0,
};

const empty = {
  metrics: { companies: 0, jobs: 0, activeJobs: 0, applications: 0, views: 0 },
  pipeline: emptyPipeline,
  companies: [],
  jobs: [],
  recentApplications: [],
};

const emptyCompany = {
  name: '',
  website: '',
  registration_number: '',
  description: '',
};

const jobTabs = [
  { value: 'all', label: 'All jobs' },
  { value: 'active', label: 'Active' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'closed', label: 'Closed' },
];

const funnelSteps = [
  ['submitted', 'New applicants'],
  ['viewed', 'Reviewed'],
  ['shortlisted', 'Shortlisted'],
  ['interviewing', 'Interviewing'],
  ['offered', 'Offers'],
  ['hired', 'Hired'],
];

export default function RecruiterDashboardPage() {
  const { profile } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', success: '', data: empty });
  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [workingApplication, setWorkingApplication] = useState(null);
  const [workingJob, setWorkingJob] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [jobTab, setJobTab] = useState('all');
  const [jobSearch, setJobSearch] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await apiRequest('/recruiter/dashboard', { auth: true });
      setState((current) => ({ loading: false, error: '', success: current.success, data: { ...empty, ...data } }));
    } catch (error) {
      setState({ loading: false, error: error.message, success: '', data: empty });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createCompany = async (event) => {
    event.preventDefault();
    setCreatingCompany(true);
    try {
      await apiRequest('/recruiter/companies', {
        method: 'POST',
        auth: true,
        body: {
          ...companyForm,
          description: companyForm.description || null,
        },
      });
      setCompanyForm(emptyCompany);
      setState((current) => ({ ...current, success: 'Company created successfully.' }));
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    } finally {
      setCreatingCompany(false);
    }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    setWorkingApplication(applicationId);
    try {
      await apiRequest(`/recruiter/applications/${applicationId}`, {
        method: 'PATCH',
        auth: true,
        body: { status },
      });
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    } finally {
      setWorkingApplication(null);
    }
  };

  const updateJobStatus = async (jobId, status) => {
    setWorkingJob(jobId);
    try {
      await apiRequest(`/recruiter/jobs/${jobId}`, {
        method: 'PATCH',
        auth: true,
        body: { status },
      });
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    } finally {
      setWorkingJob(null);
    }
  };

  const { data } = state;

  const companyJobs = useMemo(() => {
    if (selectedCompanyId === 'all') return data.jobs;
    return data.jobs.filter((job) => job.company_id === selectedCompanyId);
  }, [data.jobs, selectedCompanyId]);

  const visibleJobs = useMemo(() => {
    const needle = jobSearch.trim().toLowerCase();
    return companyJobs.filter((job) => {
      const tabMatches = jobTab === 'all' || job.status === jobTab;
      if (!tabMatches) return false;
      if (!needle) return true;
      return [
        job.title,
        job.companies?.name,
        job.categories?.name,
        job.city,
        job.province,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [companyJobs, jobTab, jobSearch]);

  const visibleApplications = useMemo(() => {
    if (selectedCompanyId === 'all') return data.recentApplications;
    return data.recentApplications.filter((application) => application.jobs?.company_id === selectedCompanyId);
  }, [data.recentApplications, selectedCompanyId]);

  const scopedMetrics = useMemo(() => {
    if (selectedCompanyId === 'all') return data.metrics;
    const jobs = companyJobs;
    return {
      companies: 1,
      jobs: jobs.length,
      activeJobs: jobs.filter((job) => job.status === 'active').length,
      applications: jobs.reduce((sum, job) => sum + Number(job.applications_count || 0), 0),
      views: jobs.reduce((sum, job) => sum + Number(job.views_count || 0), 0),
    };
  }, [companyJobs, data.metrics, selectedCompanyId]);

  const scopedPipeline = useMemo(() => {
    if (selectedCompanyId === 'all') return { ...emptyPipeline, ...(data.pipeline || {}) };
    return companyJobs.reduce((acc, job) => {
      Object.entries(job.application_status_counts || {}).forEach(([status, count]) => {
        acc[status] = (acc[status] || 0) + Number(count || 0);
      });
      return acc;
    }, { ...emptyPipeline });
  }, [companyJobs, data.pipeline, selectedCompanyId]);

  const engagedCandidates =
    Number(scopedPipeline.shortlisted || 0)
    + Number(scopedPipeline.interviewing || 0)
    + Number(scopedPipeline.offered || 0);

  const conversionRate = scopedMetrics.views > 0
    ? Math.round((scopedMetrics.applications / scopedMetrics.views) * 100)
    : 0;

  const selectedCompany = selectedCompanyId === 'all'
    ? null
    : data.companies.find((company) => company.id === selectedCompanyId) || null;

  const greetingName = (profile?.full_name || 'there').split(' ')[0];

  return (
    <DashboardLayout
      title={`Welcome back, ${greetingName}`}
      subtitle="Track jobs, review applicants, and move the right candidates through your hiring pipeline."
      actions={(
        <Link to="/post-job" className="button button--primary recruiter-primary-action">
          <Plus size={17} /> Post a Job
        </Link>
      )}
    >
      <div className="recruiter-dashboard">
        {state.error && <div className="error-banner">{state.error}</div>}
        {state.success && <div className="success-banner">{state.success}</div>}

        {data.companies.length > 0 && (
          <Reveal className="recruiter-workspace-bar" direction="scale">
            <div className="recruiter-workspace-bar__copy">
              <span className="recruiter-workspace-icon"><Building2 size={18} /></span>
              <div>
                <strong>{selectedCompany?.name || 'All companies'}</strong>
                <span>Employer workspace</span>
              </div>
            </div>

            <label className="recruiter-company-switcher">
              <span>Viewing</span>
              <select value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)}>
                <option value="all">All companies</option>
                {data.companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </label>
          </Reveal>
        )}

        <Reveal className="recruiter-kpi-grid" stagger>
          <KpiCard
            icon={BriefcaseBusiness}
            label="Active jobs"
            value={scopedMetrics.activeJobs}
            detail={`${scopedMetrics.jobs} total job${scopedMetrics.jobs === 1 ? '' : 's'}`}
            tone="blue"
          />
          <KpiCard
            icon={Users}
            label="Applicants"
            value={scopedMetrics.applications}
            detail={`${engagedCandidates} in active pipeline`}
            tone="violet"
          />
          <KpiCard
            icon={Eye}
            label="Job views"
            value={scopedMetrics.views}
            detail={`${conversionRate}% view-to-apply rate`}
            tone="cyan"
          />
          <KpiCard
            icon={UserRoundCheck}
            label="Hires"
            value={scopedPipeline.hired || 0}
            detail={`${scopedPipeline.offered || 0} offer${Number(scopedPipeline.offered || 0) === 1 ? '' : 's'} open`}
            tone="green"
          />
        </Reveal>

        {!state.loading && data.companies.length === 0 && (
          <Reveal className="dashboard-panel recruiter-onboarding recruiter-onboarding--modern">
            <div className="recruiter-onboarding__intro">
              <span className="recruiter-onboarding__icon"><Building2 size={24} /></span>
              <div>
                <span className="eyebrow">Employer setup</span>
                <h2>Create your company profile</h2>
                <p>You need a company profile before you can post jobs and receive applications.</p>
              </div>
            </div>
            <form className="dashboard-inline-form recruiter-company-form" onSubmit={createCompany}>
              <CompanyInput label="Company name" required value={companyForm.name} onChange={(value) => setCompanyForm((current) => ({ ...current, name: value }))} />
              <CompanyInput label="Website" type="url" required value={companyForm.website} placeholder="https://example.com" onChange={(value) => setCompanyForm((current) => ({ ...current, website: value }))} />
              <CompanyInput label="Registration number" required value={companyForm.registration_number} onChange={(value) => setCompanyForm((current) => ({ ...current, registration_number: value }))} />
              <CompanyInput label="Description" value={companyForm.description} onChange={(value) => setCompanyForm((current) => ({ ...current, description: value }))} />
              <button className="button button--primary" disabled={creatingCompany}>{creatingCompany ? 'Creating...' : 'Create Company'}</button>
            </form>
          </Reveal>
        )}

        {data.companies.length > 0 && (
          <div className="recruiter-dashboard-grid">
            <main className="recruiter-dashboard-main">
              <Reveal className="dashboard-panel recruiter-panel recruiter-jobs-panel" direction="left">
                <div className="recruiter-panel-heading" id="jobs">
                  <div>
                    <span className="recruiter-panel-kicker">Jobs</span>
                    <h2>Your job posts</h2>
                    <p>Monitor performance, review status, and manage your current openings.</p>
                  </div>
                  <Link to="/post-job" className="recruiter-text-action">Create job <ArrowRight size={14} /></Link>
                </div>

                <div className="recruiter-job-toolbar">
                  <div className="recruiter-job-tabs" role="tablist" aria-label="Filter jobs">
                    {jobTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        className={jobTab === tab.value ? 'is-active' : ''}
                        onClick={() => setJobTab(tab.value)}
                      >
                        {tab.label}
                        <span>{countJobsByStatus(companyJobs, tab.value)}</span>
                      </button>
                    ))}
                  </div>

                  <label className="recruiter-job-search">
                    <Search size={15} />
                    <input
                      value={jobSearch}
                      onChange={(event) => setJobSearch(event.target.value)}
                      placeholder="Search your jobs"
                    />
                  </label>
                </div>

                {state.loading ? (
                  <DashboardEmpty text="Loading your jobs..." />
                ) : visibleJobs.length ? (
                  <div className="recruiter-job-list">
                    {visibleJobs.slice(0, 12).map((job) => (
                      <JobPerformanceRow
                        key={job.id}
                        job={job}
                        working={workingJob === job.id}
                        onStatusChange={(status) => updateJobStatus(job.id, status)}
                      />
                    ))}
                  </div>
                ) : (
                  <DashboardEmpty text="No jobs match this filter." />
                )}
              </Reveal>

              <Reveal className="dashboard-panel recruiter-panel recruiter-candidates-panel" direction="left" delay={70}>
                <div className="recruiter-panel-heading" id="candidates">
                  <div>
                    <span className="recruiter-panel-kicker">Candidates</span>
                    <h2>Recent applicants</h2>
                    <p>Review the newest candidates and update their hiring stage.</p>
                  </div>
                  <span className="recruiter-candidate-count">{visibleApplications.length} recent</span>
                </div>

                {state.loading ? (
                  <DashboardEmpty text="Loading applicants..." />
                ) : visibleApplications.length ? (
                  <div className="recruiter-candidate-list">
                    {visibleApplications.slice(0, 8).map((application) => (
                      <CandidateRow
                        key={application.id}
                        application={application}
                        working={workingApplication === application.id}
                        onStatusChange={(status) => updateApplicationStatus(application.id, status)}
                      />
                    ))}
                  </div>
                ) : (
                  <DashboardEmpty text="Applications will appear here after candidates apply." />
                )}
              </Reveal>
            </main>

            <aside className="recruiter-dashboard-side">
              <Reveal className="dashboard-panel recruiter-panel recruiter-funnel-card" direction="right">
                <div className="recruiter-panel-heading recruiter-panel-heading--compact">
                  <div>
                    <span className="recruiter-panel-kicker">Hiring funnel</span>
                    <h2>Candidate pipeline</h2>
                  </div>
                  <span className="recruiter-heading-icon"><BarChart3 size={17} /></span>
                </div>

                <HiringFunnel pipeline={scopedPipeline} total={scopedMetrics.applications} />
              </Reveal>

              <Reveal className="dashboard-panel recruiter-panel recruiter-company-card" direction="right" delay={60}>
                <div className="recruiter-panel-heading recruiter-panel-heading--compact">
                  <div>
                    <span className="recruiter-panel-kicker">Company</span>
                    <h2>{selectedCompany?.name || data.companies[0]?.name || 'Employer profile'}</h2>
                  </div>
                  <Building2 size={18} />
                </div>

                <CompanySummary company={selectedCompany || data.companies[0]} />
              </Reveal>

              <Reveal className="dashboard-panel recruiter-panel recruiter-quick-actions" direction="right" delay={110}>
                <div className="recruiter-panel-heading recruiter-panel-heading--compact">
                  <div>
                    <span className="recruiter-panel-kicker">Quick actions</span>
                    <h2>Keep hiring moving</h2>
                  </div>
                  <Sparkles size={17} />
                </div>

                <Link to="/post-job" className="recruiter-quick-link">
                  <span className="recruiter-quick-link__icon"><Plus size={17} /></span>
                  <span><strong>Post a new job</strong><small>Create an opening in minutes</small></span>
                  <ArrowRight size={15} />
                </Link>
                <a href="#candidates" className="recruiter-quick-link">
                  <span className="recruiter-quick-link__icon"><Users size={17} /></span>
                  <span><strong>Review candidates</strong><small>Move applicants through pipeline</small></span>
                  <ArrowRight size={15} />
                </a>
                <Link to="/companies" className="recruiter-quick-link">
                  <span className="recruiter-quick-link__icon"><Building2 size={17} /></span>
                  <span><strong>Company profile</strong><small>Review employer information</small></span>
                  <ArrowRight size={15} />
                </Link>
              </Reveal>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className={`recruiter-kpi-card recruiter-kpi-card--${tone}`}>
      <div className="recruiter-kpi-card__top">
        <span className="recruiter-kpi-card__icon"><Icon size={19} /></span>
        <TrendingUp size={15} className="recruiter-kpi-card__trend" />
      </div>
      <strong>{Number(value || 0).toLocaleString()}</strong>
      <span className="recruiter-kpi-card__label">{label}</span>
      <small>{detail}</small>
    </article>
  );
}

function JobPerformanceRow({ job, working, onStatusChange }) {
  const location = job.is_remote
    ? 'Remote'
    : [job.city, job.province].filter(Boolean).join(', ') || 'Location not specified';

  return (
    <article className="recruiter-job-row">
      <div className="recruiter-job-row__main">
        <div className="recruiter-job-row__titleline">
          <Link to={`/jobs/${job.id}`}>{job.title}</Link>
          <Status status={job.status} />
        </div>
        <div className="recruiter-job-row__meta">
          <span><Building2 size={13} /> {job.companies?.name || 'Company'}</span>
          <span><MapPin size={13} /> {location}</span>
          {job.categories?.name && <span><Filter size={13} /> {job.categories.name}</span>}
        </div>
      </div>

      <div className="recruiter-job-row__performance">
        <span><Eye size={14} /><strong>{Number(job.views_count || 0)}</strong><small>Views</small></span>
        <span><Users size={14} /><strong>{Number(job.applications_count || 0)}</strong><small>Applicants</small></span>
      </div>

      <div className="recruiter-job-row__date">
        <Clock3 size={13} />
        <span>{job.published_at ? `Published ${timeAgo(job.published_at)}` : `Created ${timeAgo(job.created_at)}`}</span>
      </div>

      <div className="recruiter-job-row__manage">
        <select
          className="recruiter-stage-select"
          value={job.status}
          disabled={working || ['expired', 'removed'].includes(job.status)}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label={`Manage ${job.title} status`}
        >
          {job.status === 'active' && <option value="active" disabled>Active</option>}
          {job.status === 'expired' && <option value="expired" disabled>Expired</option>}
          {job.status === 'removed' && <option value="removed" disabled>Removed</option>}
          <option value="pending_review">Submit for review</option>
          <option value="closed">Close job</option>
        </select>
        <Link className="recruiter-icon-button" to={`/jobs/${job.id}`} aria-label={`View ${job.title}`}><MoreHorizontal size={17} /></Link>
      </div>
    </article>
  );
}

function CandidateRow({ application, working, onStatusChange }) {
  const candidate = application.profiles;
  const candidateName = candidate?.full_name || 'Candidate';
  const location = [candidate?.location_city, candidate?.location_province].filter(Boolean).join(', ');

  return (
    <article className="recruiter-candidate-row">
      <span className="recruiter-candidate-avatar">{candidateName.slice(0, 1).toUpperCase()}</span>
      <div className="recruiter-candidate-row__identity">
        <strong>{candidateName}</strong>
        <span>{candidate?.headline || 'Job applicant'}</span>
        <small>{location || 'Location not provided'}</small>
      </div>
      <div className="recruiter-candidate-row__job">
        <span>Applied for</span>
        <strong>{application.jobs?.title || 'Job application'}</strong>
        <small>{formatDate(application.created_at)}</small>
      </div>
      <select
        className="recruiter-stage-select recruiter-stage-select--candidate"
        value={application.status}
        disabled={working}
        onChange={(event) => onStatusChange(event.target.value)}
        aria-label={`Update ${candidateName} application status`}
      >
        <option value="submitted">New applicant</option>
        <option value="viewed">Reviewed</option>
        <option value="shortlisted">Shortlisted</option>
        <option value="interviewing">Interviewing</option>
        <option value="offered">Offered</option>
        <option value="hired">Hired</option>
        <option value="rejected">Rejected</option>
        <option value="withdrawn" disabled>Withdrawn</option>
      </select>
    </article>
  );
}

function HiringFunnel({ pipeline, total }) {
  const max = Math.max(1, ...funnelSteps.map(([key]) => Number(pipeline[key] || 0)));

  return (
    <div className="recruiter-funnel">
      <div className="recruiter-funnel__summary">
        <div><strong>{Number(total || 0)}</strong><span>Total applicants</span></div>
        <span className="recruiter-funnel__badge"><FileCheck2 size={13} /> Live pipeline</span>
      </div>

      <div className="recruiter-funnel__steps">
        {funnelSteps.map(([key, label]) => {
          const value = Number(pipeline[key] || 0);
          const width = Math.max(value ? 9 : 3, Math.round((value / max) * 100));
          return (
            <div className="recruiter-funnel-step" key={key}>
              <div><span>{label}</span><strong>{value}</strong></div>
              <span className="recruiter-funnel-bar"><i style={{ width: `${width}%` }} /></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompanySummary({ company }) {
  if (!company) return <DashboardEmpty text="No company profile available." />;
  const verified = company.verification_status === 'verified';

  return (
    <div className="recruiter-company-summary">
      <div className="recruiter-company-summary__logo">{company.name?.slice(0, 1).toUpperCase() || 'C'}</div>
      <div className="recruiter-company-summary__identity">
        <strong>{company.name}</strong>
        <span className={`recruiter-verification ${verified ? 'is-verified' : ''}`}>
          {verified ? <CheckCircle2 size={13} /> : <CalendarClock size={13} />}
          {verified ? 'Verified employer' : String(company.verification_status || 'pending').replaceAll('_', ' ')}
        </span>
      </div>

      <div className="recruiter-company-summary__details">
        {company.website && <a href={company.website} target="_blank" rel="noreferrer"><Globe2 size={14} /> Website <ArrowRight size={13} /></a>}
        <span><CircleDollarSign size={14} /> Account status: {String(company.status || 'active').replaceAll('_', ' ')}</span>
      </div>

      <Link to="/companies" className="button button--secondary button--small">Manage company</Link>
    </div>
  );
}

function CompanyInput({ label, value, onChange, required = false, type = 'text', placeholder = '' }) {
  return <label><span>{label}</span><input type={type} required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Status({ status }) {
  return <span className={`status-pill status-pill--${status}`}>{String(status).replaceAll('_', ' ')}</span>;
}

function DashboardEmpty({ text }) {
  return <div className="dashboard-empty">{text}</div>;
}

function countJobsByStatus(jobs, status) {
  if (status === 'all') return jobs.length;
  return jobs.filter((job) => job.status === status).length;
}
