import discoveryPhoto from '../../shared/assets/images/cta/05_for_job_seekers.webp';
import SharedJobCard from '../../shared/components/JobCard';
import ShareJobButton from '../../shared/components/ShareJobButton';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import PageHero from '../../shared/components/PageHero';
import PageSection from '../../shared/components/PageSection';
import Reveal from '../../shared/components/Reveal';
import SearchPanel from '../../shared/components/SearchPanel';
import { EmptyState } from '../../shared/components/StatusMessage';
import { searchJobs } from '../../shared/lib/data';
import { focusCategories } from '../../shared/config/site';
import useJobBookmark from '../../shared/hooks/useJobBookmark';
import { timeAgo, formatSalary, stripHtml } from '../../shared/lib/format';
import { 
  MapPin, 
  Briefcase, 
  Building2, 
  Zap, 
  Clock, 
  ArrowRight, 
  ArrowUpRight, 
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bookmark,
  ShieldCheck
} from 'lucide-react';

const PAGE_SIZE = 9; // 3x3 clean grid

// Deterministic brand gradients for company avatars
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', // Royal Blue
  'linear-gradient(135deg, #059669 0%, #047857 100%)', // Emerald
  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', // Violet
  'linear-gradient(135deg, #d97706 0%, #b45309 100%)', // Amber
  'linear-gradient(135deg, #db2777 0%, #be185d 100%)', // Pink
  'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', // Sky
  'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', // Indigo
  'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', // Rose
];

function getCompanyAvatarGradient(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

/* =========================================
   1. PREMIUM RESPONSIVE JOB CARD
========================================= */
const JobCard = ({ job }) => {
  const { 
    id, 
    title, 
    company, 
    companyName: rawCompanyName,
    location, 
    jobType,
    employmentType,
    type,
    workplaceType,
    isRemote,
    description,
    createdAt 
  } = job;

  const companyName = typeof company === 'object' && company !== null 
    ? (company.name || rawCompanyName || "Hiring Company") 
    : (rawCompanyName || company || "Hiring Company");

  const companyLogo = typeof company === 'object' && company !== null ? company.logoUrl : null;
  const avatarGradient = useMemo(() => getCompanyAvatarGradient(companyName), [companyName]);

  const displayType = jobType || employmentType || type || null;
  
  // Clean salary filtering: hide any zero ranges ($0 - $0, CA$0 - CA$0, etc.)
  const displaySalary = useMemo(() => {
    const s = formatSalary(job);
    if (!s) return null;
    if (/^(\$|ca\$|usd)?\s*0(\s*-\s*(\$|ca\$|usd)?\s*0)?$/i.test(s.trim())) return null;
    if (/^(from|up to)\s*(\$|ca\$|usd)?\s*0$/i.test(s.trim())) return null;
    return s;
  }, [job]);

  const displayWorkplace = isRemote ? 'Remote' : (workplaceType || null);
  const postedTime = createdAt ? timeAgo(createdAt) : (job.postedAt || "Recently");

  const { saved, loading: saving, error: saveError, toggleSaved: handleToggleSaved } = useJobBookmark(id);

  // Clean description snippet
  const cleanSnippet = useMemo(() => {
    if (!description) return '';
    const text = stripHtml(description).replace(/^[·\s\-_*]+/, '').trim();
    return text.length > 125 ? `${text.substring(0, 125)}...` : text;
  }, [description]);

  return (
    <div className="jb-card-anchor">
      <article className="jb-job-card">
        <ShareJobButton job={job}/>
        {/* Card Header: Avatar, Titles & Action Icon */}
        <div className="jb-card-top">
          <div className="jb-company-avatar-wrap">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="jb-company-logo" />
            ) : (
              <div 
                className="jb-company-avatar" 
                style={{ background: avatarGradient }}
              >
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="jb-card-meta">
            <h3 className="jb-job-title" title={title}>
              {title}
            </h3>
            <div className="jb-company-location-row">
              <span className="jb-company-name">{companyName}</span>
              {location && (
                <>
                  <span className="jb-meta-sep">·</span>
                  <span className="jb-location-text">
                    <MapPin size={12} strokeWidth={2.2} className="jb-meta-pin" />
                    {location}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="jb-card-actions">
            <button
              type="button"
              className={`jb-card-bookmark-btn ${saved ? 'is-saved' : ''}`}
              onClick={handleToggleSaved}
              title={saveError ? 'Saved jobs could not be loaded. Reload to try again.' : (saved ? 'Remove from saved jobs' : 'Save this job')}
              aria-label={saved ? "Remove from saved jobs" : "Save this job"}
              aria-pressed={saved}
              disabled={saving || Boolean(saveError)}
            >
              <Bookmark size={14} fill={saved ? "#0066f5" : "none"} color={saved ? "#0066f5" : "#94a3b8"} strokeWidth={2.2} />
            </button>
            <div className="jb-card-hover-arrow" aria-hidden="true">
              <ArrowUpRight size={17} strokeWidth={2.2} />
            </div>
          </div>
        </div>

        {/* Feature & Metadata Badges */}
        <div className="jb-card-badges">
          <span className="jb-badge jb-badge--hiring">
            <Zap size={11} fill="#ef4444" strokeWidth={0} />
            Actively Hiring
          </span>

          {displayType && (
            <span className="jb-badge jb-badge--type">
              <Briefcase size={11} strokeWidth={2.2} />
              {displayType}
            </span>
          )}

          {displayWorkplace && (
            <span className="jb-badge jb-badge--workplace">
              <Building2 size={11} strokeWidth={2.2} />
              {displayWorkplace}
            </span>
          )}

          {displaySalary && (
            <span className="jb-badge jb-badge--salary">
              <DollarSign size={11} strokeWidth={2.4} />
              {displaySalary}
            </span>
          )}
        </div>

        {/* Snippet / Excerpt */}
        <div className="jb-card-snippet">
          <p>
            {cleanSnippet || 'View full role overview, responsibilities, compensation, and qualifications.'}
          </p>
        </div>

        {/* Footer */}
        <div className="jb-card-footer">
          <span className="jb-posted-info">
            <Clock size={12} strokeWidth={2} />
            Posted {postedTime}
          </span>

          <Link to={`/jobs/${id}`} className="jb-apply-cta" aria-label={`View ${title} at ${companyName}`}>
            View details
            <ArrowRight size={13} strokeWidth={2.4} className="jb-cta-arrow" />
          </Link>
        </div>
      </article>
    </div>
  );
};

/* =========================================
   2. SHIMMER SKELETON LOADER
========================================= */
const JobCardSkeleton = () => (
  <div className="jb-job-card jb-skeleton-card">
    <div className="jb-card-top">
      <div className="jb-skeleton-avatar jb-shimmer" />
      <div className="jb-card-meta" style={{ width: '100%' }}>
        <div className="jb-skeleton-bar jb-shimmer" style={{ width: '72%', height: '18px' }} />
        <div className="jb-skeleton-bar jb-shimmer" style={{ width: '48%', height: '13px', marginTop: '7px' }} />
      </div>
    </div>
    <div className="jb-card-badges">
      <div className="jb-skeleton-pill jb-shimmer" style={{ width: '92px' }} />
      <div className="jb-skeleton-pill jb-shimmer" style={{ width: '68px' }} />
      <div className="jb-skeleton-pill jb-shimmer" style={{ width: '58px' }} />
    </div>
    <div className="jb-card-snippet">
      <div className="jb-skeleton-bar jb-shimmer" style={{ width: '100%', height: '14px', marginBottom: '6px' }} />
      <div className="jb-skeleton-bar jb-shimmer" style={{ width: '75%', height: '14px' }} />
    </div>
    <div className="jb-card-footer">
      <div className="jb-skeleton-bar jb-shimmer" style={{ width: '95px', height: '12px' }} />
      <div className="jb-skeleton-bar jb-shimmer" style={{ width: '75px', height: '12px' }} />
    </div>
  </div>
);

/* =========================================
   3. MAIN JOBS PAGE COMPONENT
========================================= */
export default function JobsPage() {
  const { categorySlug } = useParams();
  const [params] = useSearchParams();
  const [page, setPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);
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
    setPage(1);
  }, [viewAll]);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));

    const limit = viewAll ? 1000 : PAGE_SIZE;

    searchJobs({
      page,
      limit,
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
        jobs: result.jobs || [],
        pagination: result.pagination || { page: 1, limit: PAGE_SIZE, total: 0, pages: 0 },
        configured: result.configured,
        error: result.error,
      });
    });

    return () => {
      active = false;
    };
  }, [page, paramsKey, categorySlug, viewAll]);

  const totalPages = Math.max(1, state.pagination.pages || 1);
  const safePage = Math.min(page, totalPages);
  const totalCount = state.pagination.total || state.jobs.length;

  const handlePageChange = (newPage) => {
    setPage(newPage);
    if (resultsTopRef.current) {
      resultsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="jb-jobs-page-root">
      {/* Scoped CSS Styles */}
      <style>{`
        .jb-jobs-page-root {
          background-color: #f8fbff;
          min-height: 100vh;
          padding-bottom: 70px;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* Results Header - Flush with .container */
        .jb-results-header {
          width: 100%;
          margin: 0 0 22px 0;
          padding: 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 16px;
        }

        .jb-results-heading-main {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .jb-results-title {
          font-size: 1.55rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .jb-count-badge {
          display: inline-flex;
          align-items: center;
          background: #e0f0fe;
          color: #0066f5;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: -0.01em;
        }

        .jb-results-subtext {
          color: #64748b;
          font-size: 0.92rem;
          margin: 4px 0 0;
        }

        .jb-view-all-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #ffffff;
          color: #0066f5;
          border: 1.5px solid #dbeafe;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.18s ease;
          box-shadow: 0 1px 3px rgba(0, 102, 245, 0.05);
        }

        .jb-view-all-toggle-btn:hover {
          background: #0066f5;
          color: #ffffff;
          border-color: #0066f5;
          box-shadow: 0 4px 12px rgba(0, 102, 245, 0.2);
        }

        /* 100% RESPONSIVE GRID - Matches Container Exactly */
        .jb-jobs-grid {
          width: 100%;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        @media (max-width: 1080px) {
          .jb-jobs-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }
        }

        @media (max-width: 680px) {
          .jb-jobs-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .jb-results-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }

        /* CARD ARCHITECTURE */
        .jb-card-anchor {
          text-decoration: none !important;
          color: inherit !important;
          display: flex;
          height: 100%;
        }

        .jb-job-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 20px 16px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 10px -2px rgba(15, 23, 42, 0.02);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          cursor: pointer;
        }

        .jb-job-card:hover {
          border-color: #93c5fd;
          transform: translateY(-3px);
          box-shadow: 0 14px 28px -6px rgba(0, 102, 245, 0.12), 0 4px 10px rgba(15, 23, 42, 0.03);
        }

        /* Top Bar */
        .jb-card-top {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          position: relative;
        }

        .jb-company-avatar-wrap {
          flex-shrink: 0;
        }

        .jb-company-logo {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          object-fit: contain;
          border: 1px solid #e2e8f0;
          padding: 3px;
          background: #ffffff;
        }

        .jb-company-avatar {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .jb-card-meta {
          flex: 1;
          min-width: 0; /* truncate helper */
        }

        .jb-job-title {
          font-size: 1.08rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px;
          line-height: 1.35;
          letter-spacing: -0.015em;
          text-transform: capitalize;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.18s ease;
        }

        .jb-job-card:hover .jb-job-title {
          color: #0066f5;
        }

        .jb-company-location-row {
          display: flex;
          align-items: center;
          font-size: 13px;
          color: #475569;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          gap: 6px;
        }

        .jb-company-name {
          font-weight: 600;
          color: #334155;
          text-transform: capitalize;
        }

        .jb-meta-sep {
          color: #cbd5e1;
          font-size: 11px;
        }

        .jb-location-text {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: #64748b;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: capitalize;
        }

        .jb-meta-pin {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .jb-card-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .jb-card-bookmark-btn {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s ease;
          padding: 0;
        }

        .jb-card-bookmark-btn:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .jb-card-bookmark-btn.is-saved {
          background: #eff6ff;
          border-color: #93c5fd;
        }

        .jb-card-hover-arrow {
          color: #cbd5e1;
          transition: all 0.18s ease;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .jb-job-card:hover .jb-card-hover-arrow {
          color: #0066f5;
          transform: translate(2px, -2px);
        }

        /* Badges Row */
        .jb-card-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
        }

        .jb-badge {
          display: inline-flex;
          align-items: center;
          gap: 4.5px;
          font-size: 11.5px;
          font-weight: 600;
          padding: 3.5px 8.5px;
          border-radius: 6px;
          line-height: 1.25;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .jb-badge--hiring {
          background: #fff1f2;
          color: #e11d48;
          border: 1px solid #ffe4e6;
        }

        .jb-badge--type {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #dbeafe;
        }

        .jb-badge--workplace {
          background: #f0fdf4;
          color: #15803d;
          border: 1px solid #dcfce7;
        }

        .jb-badge--salary {
          background: #fefce8;
          color: #b45309;
          border: 1px solid #fef08a;
        }

        /* Description Snippet */
        .jb-card-snippet {
          margin-top: 12px;
          margin-bottom: 14px;
          flex: 1;
        }

        .jb-card-snippet p {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: #64748b;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        /* Footer */
        .jb-card-footer {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12.5px;
        }

        .jb-posted-info {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #94a3b8;
          font-weight: 500;
        }

        .jb-apply-cta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #0066f5;
          font-weight: 600;
          font-size: 12.5px;
          transition: gap 0.18s ease;
        }

        .jb-job-card:hover .jb-apply-cta {
          gap: 7px;
        }

        .jb-cta-arrow {
          transition: transform 0.18s ease;
        }

        .jb-job-card:hover .jb-cta-arrow {
          transform: translateX(2px);
        }

        /* SKELETON LOADER */
        .jb-skeleton-card {
          pointer-events: none;
        }

        .jb-shimmer {
          background: #f1f5f9;
          background-image: linear-gradient(90deg, #f1f5f9 0px, #e2e8f0 40px, #f1f5f9 80px);
          background-size: 400px;
          animation: jb-shimmer-anim 1.5s infinite linear;
          border-radius: 6px;
        }

        @keyframes jb-shimmer-anim {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }

        .jb-skeleton-avatar {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .jb-skeleton-pill {
          height: 22px;
          border-radius: 6px;
        }

        .jb-skeleton-bar {
          border-radius: 4px;
        }

        /* PAGINATION - Flush with Container */
        .jb-pagination-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 36px;
          width: 100%;
          padding: 0;
        }

        .jb-page-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          color: #1e293b;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .jb-page-nav-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #0066f5;
          color: #0066f5;
        }

        .jb-page-nav-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .jb-page-indicator {
          font-size: 13.5px;
          color: #64748b;
          font-weight: 500;
        }

        .jb-page-indicator strong {
          color: #0f172a;
          font-weight: 700;
        }
      `}</style>

      {/* Hero Presentation */}
      <PageHero
        eyebrow={category ? 'Specialist category' : 'Current openings'}
        title={category ? `${category.label} opportunities.` : 'Find a role.'}
        accent={category ? 'Explore your next move.' : 'Move your story forward.'}
        imageSrc={discoveryPhoto}
        imageAlt="Professional exploring a new career opportunity"
        text={category
          ? `Browse active ${category.label.toLowerCase()} opportunities by location, work arrangement and job type.`
          : 'Search current jobs by title, location, job type, salary, and work arrangement.'}
      />

      {/* Filter / Search Bar */}
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

      {/* Jobs Results & Cards */}
      <PageSection className="jobs-results-section" soft reveal={false}>
        <div ref={resultsTopRef} style={{ scrollMarginTop: '100px' }} />

        <Reveal className="jb-results-header">
          <div>
            <div className="jb-results-heading-main">
              <h2 className="jb-results-title">
                {state.loading ? 'Fetching latest jobs...' : 'Available Jobs'}
              </h2>
              {!state.loading && totalCount > 0 && (
                <span className="jb-count-badge">
                  {totalCount} {totalCount === 1 ? 'position' : 'positions'}
                </span>
              )}
            </div>
            <p className="jb-results-subtext">
              Current openings available on this portal are displayed.
            </p>
          </div>

          {!state.loading && state.pagination.total > PAGE_SIZE && (
            <button
              type="button"
              className="jb-view-all-toggle-btn"
              onClick={() => setViewAll(!viewAll)}
            >
              <Sparkles size={14} />
              <span>{viewAll ? 'Show Paginated' : 'View All Openings'}</span>
            </button>
          )}
        </Reveal>

        {state.loading ? (
          <div className="jb-jobs-grid">
            {[...Array(6)].map((_, i) => (
              <JobCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : state.jobs.length ? (
          <>
            <Reveal className="jb-jobs-grid" stagger>
              {state.jobs.map((job) => (
                <SharedJobCard variant="grid" key={job.id} job={job} />
              ))}
            </Reveal>

            {!viewAll && totalPages > 1 && (
              <Reveal className="jb-pagination-wrap" delay={100}>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => handlePageChange(Math.max(1, safePage - 1))}
                  className="jb-page-nav-btn"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <span className="jb-page-indicator">
                  Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
                </span>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
                  className="jb-page-nav-btn"
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </Reveal>
            )}
          </>
        ) : (
          <Reveal>
            <EmptyState
              backendMissing={!state.configured}
              title={state.error?'Jobs could not be loaded':'No matching jobs found'}
              text={state.error?.message || 'Try adjusting your search criteria, removing filters, or searching for related keywords.'}
            />
          </Reveal>
        )}

        <div className="network-trust-banner" style={{ marginTop: '36px' }}>
          <ShieldCheck size={18} className="network-trust-icon" />
          <p>
            Availability depends on openings published by employers. Jooblie supports platform integrity but does not promise placement or endorse every individual listing.
          </p>
        </div>
      </PageSection>
    </div>
  );
}

// Re-export JobCard for use in other pages
export { JobCard };
