import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import PageHero from '../../shared/components/PageHero';
import PageSection from '../../shared/components/PageSection';
import Reveal from '../../shared/components/Reveal';
import SearchPanel from '../../shared/components/SearchPanel';
import { EmptyState } from '../../shared/components/StatusMessage';
import { searchJobs } from '../../shared/lib/data';
import { focusCategories } from '../../shared/config/site';

const PAGE_SIZE = 10;

/* =========================================
   1. PREMIUM GRID JOB CARD COMPONENT
========================================= */
const JobCard = ({ job }) => {
  const { 
    id, 
    title, 
    company, 
    location, 
    type, 
    salary, 
    description, 
    postedAt = "Recently" 
  } = job;

  // Extract company details safely
  const companyName = typeof company === 'object' && company !== null ? company.name : (company || "Hiring Company");
  const companyLogo = typeof company === 'object' && company !== null ? company.logoUrl : null;

  return (
    <Link to={`/jobs/${id}`} className="premium-card-wrapper">
      <div className="premium-job-card">
        
        {/* Header: Logo, Title, Company, Location */}
        <div className="card-header">
          <div className="company-logo-container">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="company-logo" />
            ) : (
              <div className="company-logo-fallback">
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="header-text">
            <h2 className="job-title">{title}</h2>
            <div className="company-info">
              <span className="company-name">{companyName}</span>
              {location && <span className="location-dot">•</span>}
              {location && <span className="job-location">{location}</span>}
            </div>
          </div>
        </div>

        {/* Badges: Salary, Type, Urgency */}
        <div className="job-badges">
          {salary && (
            <span className="badge salary-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2557a7" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              {salary}
            </span>
          )}
          {type && (
            <span className="badge type-badge">{type}</span>
          )}
          <span className="badge easy-apply">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ marginRight: '4px' }}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Actively Hiring
          </span>
        </div>

        {/* Description Snippet */}
        <div className="job-snippet">
          <p>
            {description 
              ? `${description.substring(0, 100)}...` 
              : 'Click here to view the full job description and apply.'}
          </p>
        </div>

        {/* Footer: Timestamp */}
        <div className="card-footer">
          <span className="posted-time">Posted {postedAt}</span>
        </div>
      </div>
    </Link>
  );
};

/* =========================================
   2. GRID SKELETON LOADER
========================================= */
const JobCardSkeleton = () => (
  <div className="premium-job-card skeleton-card">
    <div className="card-header">
      <div className="skeleton-logo shimmer"></div>
      <div className="header-text" style={{ width: '100%' }}>
        <div className="skeleton-title shimmer"></div>
        <div className="skeleton-subtitle shimmer"></div>
      </div>
    </div>
    <div className="skeleton-tags">
      <div className="skeleton-tag shimmer" style={{ width: '70px' }}></div>
      <div className="skeleton-tag shimmer" style={{ width: '90px' }}></div>
    </div>
    <div className="skeleton-desc shimmer"></div>
  </div>
);

/* =========================================
   3. MAIN JOBS PAGE COMPONENT
========================================= */
export default function JobsPage() {
  const { categorySlug } = useParams();
  const [params] = useSearchParams();
  const [page, setPage] = useState(1);
  const resultsTopRef = useRef(null);

  const [state, setState] = useState({
    loading: true,
    jobs: [],
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, pages: 0 },
    configured: true,
    error: null,
  });

  const category = focusCategories.find((item) => item.key === categorySlug);
  const paramsKey = params.toString();

  useEffect(() => {
    setPage(1);
  }, [paramsKey, categorySlug]);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));

    searchJobs({
      page,
      limit: PAGE_SIZE,
      filters: {
        q: params.get('q') || '',
        location: params.get('location') || '',
        type: params.get('type') || '',
        workplace: params.get('workplace') || '',
        salary: params.get('salary') || '',
        date: params.get('date') || '',
        category: categorySlug || '',
      },
    }).then((result) => {
      if (!active) return;
      setState({
        loading: false,
        jobs: result.jobs,
        pagination: result.pagination,
        configured: result.configured,
        error: result.error,
      });
    });

    return () => {
      active = false;
    };
  }, [page, paramsKey, categorySlug]);

  const totalPages = Math.max(1, state.pagination.pages || 1);
  const safePage = Math.min(page, totalPages);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    if (resultsTopRef.current) {
      resultsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="jobs-page-wrapper">
      {/* =========================================
          4. COLUMN/GRID CSS STYLES
      ========================================= */}
      <style>{`
        .jobs-page-wrapper {
          background-color: #f8f9fa;
          min-height: 100vh;
          padding-bottom: 60px;
        }

        /* Grid Layout for Job List */
        .job-list {
          max-width: 1200px; /* Widened for multiple columns */
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px; /* Spacing between columns and rows */
        }

        .results-heading {
          max-width: 1200px;
          margin: 0 auto 20px auto;
        }

        .premium-card-wrapper {
          text-decoration: none !important;
          color: inherit !important;
          display: flex; /* Helps card fill the grid cell height */
          height: 100%;
        }

        .premium-job-card {
          background: #ffffff;
          border: 1px solid #e8e8e8;
          border-radius: 12px;
          padding: 16px 20px;
          transition: all 0.3s ease;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          width: 100%;
          height: 100%; /* Stretches card to match row height */
        }

        .premium-job-card:hover {
          border-color: #2557a7;
          box-shadow: 0 6px 16px -4px rgba(37, 87, 167, 0.1);
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .company-logo-container {
          flex-shrink: 0;
        }

        .company-logo {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          object-fit: contain;
          border: 1px solid #f0f0f0;
          padding: 4px;
          background: #fff;
        }

        .company-logo-fallback {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background: #eef2f9;
          color: #2557a7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: bold;
          border: 1px solid #dce5f2;
        }

        .header-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .job-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #2d2d2d;
          margin: 0;
          line-height: 1.3;
          transition: color 0.2s;
        }

        .premium-job-card:hover .job-title {
          color: #2557a7;
        }

        .company-info {
          font-size: 0.9rem;
          color: #595959;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .company-name {
          color: #2d2d2d;
          font-weight: 500;
        }

        .location-dot {
          color: #999;
          font-size: 0.8rem;
        }

        .job-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }

        .badge {
          display: flex;
          align-items: center;
          background: #f3f4f6;
          color: #4b5563;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .salary-badge {
          background: #eef2f9;
          color: #1e3a8a;
        }

        .easy-apply {
          color: #9f1239;
          background: #fff1f2;
        }

        .job-snippet {
          font-size: 0.9rem;
          color: #595959;
          line-height: 1.5;
          flex-grow: 1; /* Pushes footer to the bottom */
        }

        .job-snippet p {
          margin: 0;
          position: relative;
          padding-left: 12px;
        }

        .job-snippet p::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #9ca3af;
        }

        .card-footer {
          margin-top: auto; /* Aligns to bottom */
          padding-top: 12px;
          font-size: 0.8rem;
          color: #6b7280;
          font-weight: 500;
          border-top: 1px solid #f0f0f0;
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
        
        .skeleton-logo { width: 44px; height: 44px; border-radius: 8px; flex-shrink: 0; }
        .skeleton-title { height: 20px; width: 80%; margin-bottom: 8px; margin-top: 4px; }
        .skeleton-subtitle { height: 14px; width: 50%; }
        .skeleton-tags { display: flex; gap: 8px; margin-top: 4px; }
        .skeleton-tag { height: 24px; border-radius: 4px; }
        .skeleton-desc { height: 36px; width: 100%; margin-top: auto; }

        /* --- Pagination --- */
        .pagination { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 40px; max-width: 1200px; margin-left: auto; margin-right: auto; }
        .pagination-btn { padding: 8px 16px; background: #fff; border: 1px solid #d1d5db; color: #374151; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .pagination-btn:hover:not(:disabled) { background: #f9fafb; border-color: #9ca3af; }
        .pagination-btn:disabled { border-color: #e5e7eb; color: #9ca3af; background: #f9fafb; cursor: not-allowed; box-shadow: none; }
        .pagination-info { font-size: 0.95rem; color: #4b5563; }
        
        /* Mobile Responsiveness */
        @media (max-width: 600px) {
          .job-list {
            grid-template-columns: 1fr; /* 1 column on mobile */
          }
          .premium-job-card { padding: 14px; }
        }
      `}</style>

      <PageHero
        eyebrow={category ? 'Specialist category' : 'Current openings'}
        title={category ? `${category.label} Jobs` : 'Find your next opportunity'}
        text={category
          ? `Browse active ${category.label.toLowerCase()} openings from the shared Jooblie backend.`
          : 'Search current jobs by title, location, job type, salary, and work arrangement.'}
      />

      <PageSection className="jobs-search-section" reveal={false}>
        <Reveal>
          <SearchPanel
            variant="page"
            initial={{
              q: params.get('q') || '',
              location: params.get('location') || '',
              type: params.get('type') || '',
              salary: params.get('salary') || '',
              workplace: params.get('workplace') || '',
              date: params.get('date') || '',
            }}
          />
        </Reveal>
      </PageSection>

      <PageSection className="jobs-results-section" soft reveal={false}>
        <div ref={resultsTopRef} style={{ scrollMarginTop: '100px' }} />

        <Reveal className="results-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#111827', margin: '0 0 4px 0' }}>
                {state.loading
                  ? 'Fetching latest jobs...'
                  : `${state.pagination.total || 0} ${(state.pagination.total || 0) === 1 ? 'job' : 'jobs'} found`}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                Only active, approved openings for this site are shown.
              </p>
            </div>
          </div>
        </Reveal>

        {state.loading ? (
          <div className="job-list">
            {[...Array(6)].map((_, i) => (
              <JobCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : state.jobs.length ? (
          <>
            <Reveal className="job-list" stagger>
              {state.jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </Reveal>

            {totalPages > 1 && (
              <Reveal className="pagination" delay={100}>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => handlePageChange(Math.max(1, safePage - 1))}
                  className="pagination-btn"
                >
                  Previous
                </button>

                <span className="pagination-info">
                  Page <strong style={{color: '#111827'}}>{safePage}</strong> of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
                  className="pagination-btn"
                >
                  Next
                </button>
              </Reveal>
            )}
          </>
        ) : (
          <Reveal>
            <EmptyState
              backendMissing={!state.configured}
              title="No matching jobs"
              text={state.error?.message || 'Try different search terms or filters. New openings will appear here automatically.'}
            />
          </Reveal>
        )}
      </PageSection>
    </div>
  );
}