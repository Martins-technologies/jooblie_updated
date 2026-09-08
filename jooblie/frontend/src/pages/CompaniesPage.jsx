import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import PageHero from '../components/PageHero';
import PageSection from '../components/PageSection';
import CompanyLogo from '../components/CompanyLogo';
import { EmptyState } from '../components/StatusMessage';
import usePublicData from '../hooks/usePublicData';
import Reveal from '../components/Reveal';

/* =========================================
   1. SKELETON LOADER COMPONENT
========================================= */
const CompanyCardSkeleton = () => (
  <div className="premium-company-card skeleton-card">
    <div className="card-header">
      <div className="skeleton-logo shimmer"></div>
      <div className="header-text" style={{ width: '100%' }}>
        <div className="skeleton-title shimmer"></div>
        <div className="skeleton-subtitle shimmer"></div>
      </div>
    </div>
    <div className="skeleton-tags" style={{ marginTop: '16px' }}>
      <div className="skeleton-tag shimmer"></div>
    </div>
    <div className="skeleton-footer shimmer" style={{ marginTop: 'auto' }}></div>
  </div>
);

/* =========================================
   2. MAIN COMPANIES PAGE COMPONENT
========================================= */
export default function CompaniesPage() {
  const { loading, data } = usePublicData();
  const companies = data?.companies || [];

  return (
    <div className="companies-page-wrapper">
      {/* =========================================
          3. PREMIUM GRID & CARD STYLES
      ========================================= */}
      <style>{`
        .companies-page-wrapper {
          background-color: #f8f9fa;
          min-height: 100vh;
          padding-bottom: 60px;
        }

        /* Grid Layout */
        .company-grid-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .premium-card-wrapper {
          text-decoration: none !important;
          color: inherit !important;
          display: flex;
          height: 100%;
        }

        /* Card Styling */
        .premium-company-card {
          background: #ffffff;
          border: 1px solid #e8e8e8;
          border-radius: 12px;
          padding: 24px;
          transition: all 0.3s ease;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          width: 100%;
          height: 100%;
        }

        .premium-company-card:hover {
          border-color: #2557a7;
          box-shadow: 0 6px 16px -4px rgba(37, 87, 167, 0.1);
          transform: translateY(-3px);
        }

        /* Header Area */
        .card-header {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .company-logo-container {
          flex-shrink: 0;
          width: 60px;
          height: 60px;
          border-radius: 8px;
          border: 1px solid #f0f0f0;
          padding: 4px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        .company-logo-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .header-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .company-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
          line-height: 1.3;
          transition: color 0.2s;
        }

        .premium-company-card:hover .company-title {
          color: #2557a7;
        }

        .company-location {
          font-size: 0.9rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Tags */
        .company-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag {
          background: #eef2f9;
          color: #1e3a8a;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Footer / Action Area */
        .card-footer {
          margin-top: auto; /* Pushes footer to the bottom */
          padding-top: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          color: #0066cc;
          font-size: 0.95rem;
        }

        .premium-company-card:hover .card-footer {
          color: #004c99;
        }

        .card-footer-icon {
          transition: transform 0.2s;
        }
        
        .premium-company-card:hover .card-footer-icon {
          transform: translateX(4px); /* Arrow moves right on hover */
        }

        /* --- Skeleton Animations --- */
        .skeleton-card { pointer-events: none; }
        .shimmer {
          background: #f6f7f8;
          background-image: linear-gradient(90deg, #f6f7f8 0px, #edeef1 40px, #f6f7f8 80px);
          background-size: 600px;
          animation: shimmer 1.5s infinite linear;
          border-radius: 6px;
        }
        @keyframes shimmer {
          0% { background-position: -300px 0; }
          100% { background-position: 300px 0; }
        }
        
        .skeleton-logo { width: 60px; height: 60px; border-radius: 8px; flex-shrink: 0; }
        .skeleton-title { height: 20px; width: 80%; margin-bottom: 8px; margin-top: 4px; }
        .skeleton-subtitle { height: 14px; width: 50%; }
        .skeleton-tags { display: flex; gap: 8px; }
        .skeleton-tag { height: 26px; width: 100px; border-radius: 6px; }
        .skeleton-footer { height: 20px; width: 120px; margin-top: 24px; }

        /* Responsive */
        @media (max-width: 600px) {
          .company-grid-container { grid-template-columns: 1fr; }
          .premium-company-card { padding: 16px; }
        }
      `}</style>

      <PageHero
        eyebrow="Employer directory"
        title="Companies hiring on Jooblie"
        text="Explore employers with current openings in the Jooblie ecosystem."
      />

      <PageSection soft reveal={false}>
        {loading ? (
          /* SKELETON LOADING GRID */
          <div className="company-grid-container">
            {[...Array(6)].map((_, i) => (
              <CompanyCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : companies.length ? (
          /* ACTUAL COMPANY GRID */
          <Reveal className="company-grid-container" stagger>
            {companies.map((company) => {
              const jobCount = data?.jobs?.filter((job) => job.isActive && String(job.companyId) === String(company.id)).length || 0;
              
              return (
                <Link className="premium-card-wrapper" to={`/companies/${company.id}`} key={company.id}>
                  <div className="premium-company-card">
                    
                    {/* Header: Logo, Name, Location */}
                    <div className="card-header">
                      <div className="company-logo-container">
                        <CompanyLogo company={company} size="xl" />
                      </div>
                      <div className="header-text">
                        <h2 className="company-title">{company.name}</h2>
                        {company.location && (
                          <div className="company-location">
                            <MapPin size={14} /> {company.location}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {company.industry && (
                      <div className="company-tags">
                        <span className="tag">{company.industry}</span>
                      </div>
                    )}

                    {/* Footer: Open Jobs Count */}
                    <div className="card-footer">
                      <span>{jobCount} open {jobCount === 1 ? 'job' : 'jobs'}</span>
                      <ArrowRight size={18} className="card-footer-icon" />
                    </div>

                  </div>
                </Link>
              );
            })}
          </Reveal>
        ) : (
          <Reveal>
            <EmptyState
              backendMissing={!data?.configured}
              title="No employer profiles yet"
              text="Companies with active openings will appear here when available."
            />
          </Reveal>
        )}
      </PageSection>
    </div>
  );
}