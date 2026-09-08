import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, MonitorSmartphone, CheckCircle2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getJobById } from '../../shared/lib/data';
import { apiRequest } from '../../shared/lib/api';
import { formatDate, formatSalary } from '../../shared/lib/format';
import { useAuth } from '../../shared/context/AuthContext';
import CompanyLogo from '../../shared/components/CompanyLogo';
import PageSection from '../../shared/components/PageSection';
import Reveal from '../../shared/components/Reveal';
import { EmptyState, LoadingState } from '../../shared/components/StatusMessage';

export default function JobDetailPage() {
  const { jobId } = useParams();
  const auth = useAuth();
  const [state, setState] = useState({ loading: true, result: null });
  const [application, setApplication] = useState({ loading: false, success: false, error: '' });
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    let active = true;
    getJobById(jobId).then((result) => {
      if (active) setState({ loading: false, result });
    });
    return () => { active = false; };
  }, [jobId]);

  if (state.loading) return <PageSection><LoadingState label="Loading job details..." /></PageSection>;

  const { job, configured } = state.result || {};
  if (!job || !job.isActive) {
    return <PageSection><EmptyState backendMissing={!configured} title="Job not available" text="This opening may be closed, expired, removed, or unavailable on this portal." /></PageSection>;
  }

  const salary = formatSalary(job);
  
  // Safe check for company verification
  const isCompanyVerified = job.company?.linkedinVerified || job.company?.isVerified || false;

  // 🔥 YAHAN FIX HAI: e.preventDefault() add kiya hai taake page hargiz redirect/refresh na ho
  const applyWithJooblie = async (e) => {
    e.preventDefault(); 
    setApplication({ loading: true, success: false, error: '' });
    try {
      await apiRequest(`/job-seeker/jobs/${job.id}/apply`, { method: 'POST', auth: true, body: { cover_letter: coverLetter.trim() || null } });
      setApplication({ loading: false, success: true, error: '' });
    } catch (error) {
      setApplication({ loading: false, success: false, error: error.message });
    }
  };

  return (
    <PageSection className="detail-page" reveal={false}>
      <style>{`
        .detail-page-wrapper {
          max-width: 1100px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #0066cc;
          text-decoration: none;
          font-weight: 600;
          margin-bottom: 24px;
        }
        .back-link:hover { text-decoration: underline; }

        .job-detail-header-card {
          background: #fff;
          border-radius: 12px;
          padding: 32px;
          border: 1px solid #e8e8e8;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 24px;
        }

        .header-left-content {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .job-detail-header__main h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #111827;
          margin: 8px 0;
        }
        
        .company-link {
          color: #0066cc;
          font-weight: 600;
          text-decoration: none;
          font-size: 1.1rem;
        }
        .company-link:hover { text-decoration: underline; }

        .tag-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .tag {
          background: #eef2f9;
          color: #0066cc;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .tag--muted {
          background: #f3f4f6;
          color: #4b5563;
        }

        .job-detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          color: #6b7280;
          font-size: 0.9rem;
          margin-top: 12px;
        }
        .job-detail-meta span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .job-detail-header__actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
          min-width: max-content;
        }
        .salary-highlight {
          color: #059669;
          font-size: 1.25rem;
          font-weight: 700;
        }
        
        .detail-grid-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          align-items: stretch;
        }

        .content-card-ui {
          background: #fff;
          border-radius: 12px;
          padding: 32px;
          border: 1px solid #e8e8e8;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
          height: 100%;
        }

        .content-card-ui h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: #111827;
          margin-top: 0;
          margin-bottom: 24px;
        }

        .summary-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 16px;
        }
        .summary-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .summary-row span {
          color: #9ca3af;
          font-size: 0.85rem;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .summary-row strong {
          color: #111827;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .verified-badge {
          color: #059669;
          background: #ecfdf5;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        @media (max-width: 800px) {
          .job-detail-header-card {
            flex-direction: column;
          }
          .job-detail-header__actions {
            align-items: flex-start;
            width: 100%;
          }
          .detail-grid-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="detail-page-wrapper">
        <Reveal>
          <Link className="back-link" to="/all-jobs">
            <ArrowLeft size={18} /> Back to jobs
          </Link>
        </Reveal>

        <Reveal className="job-detail-header-card">
          <div className="header-left-content">
            <CompanyLogo company={job.company || { name: job.companyName }} size="xl" />
            <div className="job-detail-header__main">
              <div className="tag-row">
                {job.categoryName && <span className="tag">{job.categoryName}</span>}
                {job.jobType && <span className="tag tag--muted">{job.jobType}</span>}
              </div>
              
              <h1>{job.title}</h1>
              
              {job.companyName && (
                job.companyId ? 
                <Link className="company-link" to={`/companies/${job.companyId}`}>{job.companyName}</Link> : 
                <span className="company-link">{job.companyName}</span>
              )}
              
              <div className="job-detail-meta">
                {job.workplaceType && <span><MonitorSmartphone size={16} />{job.workplaceType}</span>}
                {job.location && <span><MapPin size={16} />{job.location}</span>}
                {job.createdAt && <span><CalendarDays size={16} />Posted {formatDate(job.createdAt)}</span>}
              </div>
            </div>
          </div>

          <div className="job-detail-header__actions">
            {salary && <span className="salary-highlight">{salary}</span>}
            
            {auth.role === 'job_seeker' ? (
              <>
                {!application.success && (
                  <textarea
                    value={coverLetter}
                    onChange={(event) => setCoverLetter(event.target.value)}
                    maxLength={10000}
                    placeholder="Optional cover letter (up to 10,000 characters)"
                    style={{ width: '100%', minHeight: '110px', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                )}
                <button className="button button--primary" type="button" disabled={application.loading || application.success} onClick={applyWithJooblie} style={{ width: '100%' }}>
                  {application.success ? <><CheckCircle2 size={17} /> Applied</> : application.loading ? 'Submitting...' : 'Apply with Jooblie'}
                </button>
              </>
            ) : !auth.session ? (
              <Link className="button button--primary" to="/sign-in" state={{ from: `/jobs/${job.id}` }} style={{ width: '100%', textAlign: 'center' }}>
                Sign in to Apply
              </Link>
            ) : null}
            {application.error && <span className="inline-error">{application.error} {application.error.toLowerCase().includes('resume') && <><br /><Link to="/dashboard/job-seeker/profile" state={{ from: `/jobs/${job.id}` }}>Open My Profile to upload a PDF resume.</Link></>}</span>}
          </div>
        </Reveal>

        <div className="detail-grid-container">
          <Reveal as="article" className="content-card-ui" direction="left">
            <h2>Job Description</h2>
            <div style={{ color: '#4b5563', lineHeight: '1.7' }}>
              {job.description ? <RichText text={job.description} /> : <p>No public description has been added yet.</p>}
            </div>
            
            {job.skills?.length > 0 && (
              <>
                <h2 style={{ marginTop: '32px' }}>Skills</h2>
                <div className="tag-row">
                  {job.skills.map((skill) => <span className="tag tag--muted" key={skill}>{skill}</span>)}
                </div>
              </>
            )}
          </Reveal>

          <Reveal as="aside" className="content-card-ui" direction="right" delay={80}>
            <h2>Job Overview</h2>
            <SummaryRow label="Company" value={job.companyName} isVerified={isCompanyVerified} />
            <SummaryRow label="Job type" value={job.jobType} />
            <SummaryRow label="Work setup" value={job.workplaceType} />
            <SummaryRow label="Location" value={job.location} />
            <SummaryRow label="Pay / Salary" value={salary} />
            <SummaryRow label="Category" value={job.categoryName} />
          </Reveal>
        </div>
      </div>
    </PageSection>
  );
}

function SummaryRow({ label, value, isVerified }) {
  if (!value) return null;
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>
        {value}
        {isVerified && (
          <span className="verified-badge" title="LinkedIn Verified">
            <CheckCircle2 size={12} /> Verified
          </span>
        )}
      </strong>
    </div>
  );
}

function RichText({ text }) {
  const blocks = String(text).split(/\n{2,}/).filter(Boolean);
  return <>{blocks.map((block, index) => <p key={index} style={{ marginBottom: '12px' }}>{block.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}</p>)}</>;
}
