import ShareJobButton from './ShareJobButton';
import {
  Bookmark,
  Briefcase,
  BriefcaseBusiness,
  Clock3,
  Code2,
  MapPin,
  Sprout,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { categoryFallbackImages, jobIllustrations } from '../config/site';
import { formatSalary } from '../lib/format';
import useJobBookmark from '../hooks/useJobBookmark';
import CompanyLogo from './CompanyLogo';

const categoryIcons = {
  'it-software': Code2,
  'office-admin': BriefcaseBusiness,
  restaurant: UtensilsCrossed,
  agriculture: Sprout,
  trucking: Truck,
};

export default function JobCard({ job, variant = 'row' }) {
  const { saved, loading: saving, error: saveError, toggleSaved } = useJobBookmark(job.id);

  const image = jobIllustrations[job.categorySlug] || categoryFallbackImages[job.categorySlug];
  const salary = formatSalary(job);
  const companyTarget = job.companyId ? `/companies/${job.companyId}` : null;
  const CategoryIcon = categoryIcons[job.categorySlug] || BriefcaseBusiness;

  return (
    <article
      className={`job-card job-card--${variant}`}
      data-category={job.categorySlug || 'other'}
    >
      {variant === 'row' && (
        <div className="job-card__visual-group">
          <span className="job-card__category-icon">
            <CategoryIcon size={21} />
          </span>

          <div className="job-card__visual">
            {image ? (
              <img src={image} alt="" />
            ) : (
              <CompanyLogo company={job.company} size="lg" />
            )}
          </div>
        </div>
      )}

      <div className="job-card__main"><CompanyLogo company={job.company} size="md"/>
        <Link
          to={`/jobs/${job.id}`}
          className="job-card__title"
        >
          {job.title}
        </Link>

        {job.companyName && (
          companyTarget ? (
            <Link
              className="job-card__company"
              to={companyTarget}
            >
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

        {job.workplaceType && <span><MapPin size={14}/>{job.workplaceType}</span>}
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
      <Link to={`/jobs/${job.id}`} className="job-card-details">View details</Link><ShareJobButton job={job}/>
    </article>
  );
}
