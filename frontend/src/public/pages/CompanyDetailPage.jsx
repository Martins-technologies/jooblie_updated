import RecordMetadata from '../../shared/components/RecordMetadata';
import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, MapPin, CheckCircle2, Globe, Briefcase } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getCompanyById } from '../../shared/lib/data';
import CompanyLogo from '../../shared/components/CompanyLogo';
import JobCard from '../../shared/components/JobCard';
import PageSection from '../../shared/components/PageSection';
import Reveal from '../../shared/components/Reveal';
import SectionHeading from '../../shared/components/SectionHeading';
import { EmptyState } from '../../shared/components/StatusMessage';

/* =========================================
   1. PREMIUM SKELETON LOADER
========================================= */
const CompanyDetailSkeleton = () => (
  <div className="detail-page-wrapper">
    <div className="job-detail-header-card skeleton-card">
      <div className="header-left-content">
        <div className="skeleton-logo shimmer" style={{ width: '80px', height: '80px' }}></div>
        <div style={{ width: '100%' }}>
          <div className="skeleton-title shimmer" style={{ width: '40%', height: '28px' }}></div>
          <div className="skeleton-tags shimmer" style={{ width: '60%', height: '16px', marginTop: '12px' }}></div>
        </div>
      </div>
    </div>
    <div className="detail-grid-container">
      <div className="content-card-ui skeleton-card">
        <div className="skeleton-title shimmer" style={{ width: '30%', marginBottom: '24px' }}></div>
        <div className="skeleton-desc shimmer" style={{ height: '120px' }}></div>
      </div>
      <div className="content-card-ui skeleton-card">
        <div className="skeleton-title shimmer" style={{ width: '50%', marginBottom: '24px' }}></div>
        <div className="skeleton-desc shimmer" style={{ height: '20px', marginBottom: '16px' }}></div>
        <div className="skeleton-desc shimmer" style={{ height: '20px', marginBottom: '16px' }}></div>
      </div>
    </div>
  </div>
);

/* =========================================
   2. MAIN COMPANY DETAIL PAGE
========================================= */
export default function CompanyDetailPage() {
  const { companyId } = useParams();
  const [state, setState] = useState({ loading: true, result: null });

  // Backend Fetch Logic
  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true }));
    
    getCompanyById(companyId).then((result) => {
      if (active) setState({ loading: false, result });
    }).catch(() => {
      if (active) setState({ loading: false, result: null });
    });

    return () => { active = false; };
  }, [companyId]);

  if (state.loading) {
    return (
      <PageSection className="detail-page" reveal={false}>
        <CompanyDetailSkeleton />
      </PageSection>
    );
  }

  const { company, jobs, configured } = state.result || {};

  if (!company) {
    return (
      <PageSection>
        <EmptyState backendMissing={!configured} title="Company not found" text="The employer profile is not available or has been removed." />
      </PageSection>
    );
  }

  // Safe checks for company properties
  const isVerified = company.verificationStatus === 'verified';
  let website=null;try{const url=new URL(company.website);if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password)website=url;}catch{}

  return (
    <PageSection className="detail-page" reveal={false}>
      {/* =========================================
          3. PREMIUM INJECTED CSS STYLES
      ========================================= */}
      <RecordMetadata company={company}/>      <style>{`
        .detail-page-wrapper {
          max-width: 1100px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding-bottom: 60px;
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

        /* Top Header Card */
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

        .company-logo-box {
          width: 80px;
          height: 80px;
          background: #f0f4f8;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: bold;
          color: #2557a7;
          border: 1px solid #dce5f2;
          flex-shrink: 0;
          overflow: hidden;
        }

        .company-logo-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #fff;
        }

        .header-eyebrow {
          font-size: 0.85rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .job-detail-header__main h1 {
          font-size: 2rem;
          font-weight: 800;
          color: #111827;
          margin: 4px 0 8px 0;
        }

        .job-detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          color: #4b5563;
          font-size: 0.95rem;
          font-weight: 500;
        }
        .job-detail-meta span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Right Actions */
        .job-detail-header__actions {
          display: flex;
          align-items: flex-start;
          min-width: max-content;
        }

        .visit-btn {
          background: #f3f4f6;
          color: #111827;
          border: 1px solid #d1d5db;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .visit-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }
        
        /* Two Column Grid (Brabar Heights) */
        .detail-grid-container {
          display: grid;
          grid-template-columns: 2fr 1fr; /* Left wider, Right narrower */
          gap: 24px;
          align-items: stretch;
          margin-bottom: 40px;
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

        /* Description */
        .company-description {
          color: #4b5563;
          line-height: 1.7;
          font-size: 1rem;
          white-space: pre-wrap;
        }

        /* Summary Rows */
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

        /* Jobs Grid (Matching JobsPage style) */
        .company-jobs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
          gap: 20px;
          margin-top: 24px;
        }

        /* Skeleton Styles */
        .skeleton-card { pointer-events: none; }
        .shimmer {
          background: #f6f7f8;
          background-image: linear-gradient(90deg, #f6f7f8 0px, #edeef1 40px, #f6f7f8 80px);
          background-size: 600px;
          animation: shimmer 1.5s infinite linear;
          border-radius: 6px;
        }

        @media (max-width: 800px) {
          .job-detail-header-card { flex-direction: column; }
          .job-detail-header__actions { width: 100%; }
          .visit-btn { width: 100%; justify-content: center; }
          .detail-grid-container { grid-template-columns: 1fr; }
          .company-jobs-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="detail-page-wrapper">
        <Reveal>
          <Link className="back-link" to="/companies">
            <ArrowLeft size={18} /> Back to companies
          </Link>
        </Reveal>

        {/* Top Header Card */}
        <Reveal className="job-detail-header-card">
          <div className="header-left-content">
            <div className="company-logo-box">
              {company.logoUrl || company.logoPath ? (
                <img src={company.logoUrl || company.logoPath} alt={company.name} />
              ) : (
                company.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="job-detail-header__main">
              <span className="header-eyebrow">Employer Profile</span>
              <h1>{company.name}</h1>
              
              <div className="job-detail-meta">
                {company.industry && <span><Briefcase size={16} />{company.industry}</span>}
                {company.location && <span><MapPin size={16} />{company.location}</span>}
              </div>
            </div>
          </div>

          {website && (
            <div className="job-detail-header__actions">
              <a className="visit-btn" href={website.href} target="_blank" rel="noreferrer">
                <Globe size={18} /> Visit Website
              </a>
            </div>
          )}
        </Reveal>

        {/* Two Column Grid (About & Overview) */}
        <div className="detail-grid-container">
          
          {/* Left Column: About Company */}
          <Reveal as="article" className="content-card-ui" direction="left">
            <h2>About {company.name}</h2>
            <div className="company-description">
              {company.description ? (
                <RichText text={company.description} />
              ) : (
                <p>No public description has been added for this company yet.</p>
              )}
            </div>
          </Reveal>

          {/* Right Column: Company Overview */}
          <Reveal as="aside" className="content-card-ui" direction="right" delay={80}>
            <h2>Company Overview</h2>
            
            <SummaryRow label="Verification Status" value={isVerified?null:'Not verified'} isVerified={isVerified} />
            <SummaryRow label="Industry" value={company.industry} />
            <SummaryRow label="Headquarters" value={company.location} />
            <SummaryRow label="Website" value={website?.hostname} />
          </Reveal>
        </div>

        {/* Current Openings Section */}
        <Reveal>
          <SectionHeading eyebrow="Current openings" title={`Jobs at ${company.name}`} />
        </Reveal>

        {jobs && jobs.length > 0 ? (
          <Reveal className="company-jobs-grid" stagger>
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </Reveal>
        ) : (
          <Reveal>
            <EmptyState 
              title="No active openings" 
              text="This employer does not currently have any active job openings on the platform." 
            />
          </Reveal>
        )}
      </div>
    </PageSection>
  );
}

// Summary Row Component (Handles Verified Badge)
function SummaryRow({ label, value, isVerified, hideText }) {
  if (!value && !isVerified) return null;
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>
        {!hideText && value}
        {isVerified && (
          <span className="verified-badge" title="Verified employer record" style={{ marginLeft: hideText ? '0' : '8px' }}>
            <CheckCircle2 size={14} /> Verified Employer
          </span>
        )}
      </strong>
    </div>
  );
}

// Rich Text Formatter for Descriptions
function RichText({ text }) {
  const blocks = String(text).split(/\n{2,}/).filter(Boolean);
  return (
    <>
      {blocks.map((block, index) => (
        <p key={index} style={{ marginBottom: '12px' }}>
          {block.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
        </p>
      ))}
    </>
  );
}