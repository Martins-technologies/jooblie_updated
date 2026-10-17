import ShareJobButton from './ShareJobButton';
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Code2,
  MapPin,
  Sparkles,
  Sprout,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatSalary } from '../lib/format';
import useJobBookmark from '../hooks/useJobBookmark';
import CompanyLogo from './CompanyLogo';

export default function JobCard({ job, variant = 'row' }) {
  const { saved, loading: saving, error: saveError, toggleSaved } = useJobBookmark(job.id);
  const salary = formatSalary(job);
  const companyTarget = job.companyId ? `/companies/${job.companyId}` : null;

  // Grid variant for search/browse grid pages
  if (variant === 'grid') {
    return (
      <article
        className="job-card job-card--grid"
        data-category={job.categorySlug || 'other'}
      >
        <div className="job-card__main">
          <CompanyLogo company={job.company || { name: job.companyName }} size="md" />
          <Link
            to={`/jobs/${job.id}`}
            className="job-card__title"
          >
            {job.title}
          </Link>

          {job.companyName && (
            companyTarget ? (
              <Link className="job-card__company" to={companyTarget}>
                {job.companyName}
              </Link>
            ) : (
              <span className="job-card__company">
                {job.companyName}
              </span>
            )
          )}

          {job.location && (
            <div className="job-card__location">
              <MapPin size={13} />
              {job.location}
            </div>
          )}
        </div>

        <div className="job-card__meta-column">
          {job.jobType && (
            <span>
              <Clock3 size={14} />
              {job.jobType}
            </span>
          )}

          {job.workplaceType && <span><MapPin size={14} />{job.workplaceType}</span>}
          {job.experience && (
            <span>
              <Briefcase size={14} />
              {job.experience}
            </span>
          )}
        </div>

        <div className="job-card__side">
          {salary && (
            <strong className="job-card__salary">
              {salary}
            </strong>
          )}

          {job.categoryName && (
            <span className="tag">
              {job.categoryName}
            </span>
          )}
        </div>

        <button
          className={`bookmark-button${saved ? ' is-saved' : ''}`}
          type="button"
          aria-label={saved ? 'Remove saved job' : 'Save job'}
          aria-pressed={saved}
          title={saveError ? 'Saved jobs could not be loaded. Reload to try again.' : (saved ? 'Remove saved job' : 'Save job')}
          disabled={saving || Boolean(saveError)}
          onClick={toggleSaved}
        >
          <Bookmark
            size={18}
            fill={saved ? 'currentColor' : 'none'}
          />
        </button>
        <Link to={`/jobs/${job.id}`} className="job-card-details">View details</Link>
        <ShareJobButton job={job} />
      </article>
    );
  }

  // Row variant for Homepage "Jobs posted in the last 24 hours" and Company detail pages
  return (
    <article
      className="job-card job-card--row"
      data-category={job.categorySlug || 'other'}
    >
      {/* Single, authoritative company brand avatar / logo */}
      <div className="job-card__logo-wrap">
        <CompanyLogo company={job.company || { name: job.companyName }} size="lg" />
      </div>

      {/* Main content: Title, Company, Location, Tags */}
      <div className="job-card__body">
        <div className="job-card__header-row">
          <Link to={`/jobs/${job.id}`} className="job-card__title">
            {job.title}
          </Link>
          {job.company?.verificationStatus === 'verified' && <span className="job-card__badge-verified" title="Verified employer">
            <span className="job-card__badge-dot" aria-hidden="true" />
            Verified employer
          </span>}
        </div>

        <div className="job-card__company-row">
          {job.companyName && (
            companyTarget ? (
              <Link className="job-card__company" to={companyTarget}>
                {job.companyName}
              </Link>
            ) : (
              <span className="job-card__company">
                {job.companyName}
              </span>
            )
          )}

          {job.location && (
            <>
              <span className="job-card__meta-sep" aria-hidden="true">&bull;</span>
              <span className="job-card__location">
                <MapPin size={13} className="job-card__meta-icon" />
                {job.location}
              </span>
            </>
          )}

          {job.workplaceType && (
            <>
              <span className="job-card__meta-sep" aria-hidden="true">&bull;</span>
              <span className="job-card__workplace">
                {job.workplaceType}
              </span>
            </>
          )}
        </div>

        {/* Structured Metadata Pills */}
        <div className="job-card__pills-row">
          {job.jobType && (
            <span className="job-card__pill">
              <Clock3 size={12} />
              {job.jobType}
            </span>
          )}
          {job.categoryName && (
            <span className="job-card__pill job-card__pill--category">
              {job.categoryName}
            </span>
          )}
          {job.experience && (
            <span className="job-card__pill">
              <Briefcase size={12} />
              {job.experience}
            </span>
          )}
        </div>
      </div>

      {/* Salary & Direct Routing Guarantee */}
      <div className="job-card__compensation">
        {salary ? (
          <strong className="job-card__salary">{salary}</strong>
        ) : (
          <span className="job-card__salary-muted">Salary undisclosed</span>
        )}
        <span className="job-card__direct-tag">
          <CheckCircle2 size={12} /> Direct Hire
        </span>
      </div>

      {/* Actions: Bookmark, Share, and Primary View Button */}
      <div className="job-card__actions-group">
        <div className="job-card__secondary-actions">
          <ShareJobButton job={job} />
          <button
            className={`bookmark-button${saved ? ' is-saved' : ''}`}
            type="button"
            aria-label={saved ? 'Remove saved job' : 'Save job'}
            aria-pressed={saved}
            title={saveError ? 'Saved jobs could not be loaded.' : (saved ? 'Remove saved job' : 'Save job')}
            disabled={saving || Boolean(saveError)}
            onClick={toggleSaved}
          >
            <Bookmark
              size={17}
              fill={saved ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        <Link to={`/jobs/${job.id}`} className="button button--primary button--sm job-card__cta-btn">
          View Details <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
