import { useEffect, useState } from 'react';
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
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import CompanyLogo from './CompanyLogo';

const categoryIcons = {
  'it-software': Code2,
  'office-admin': BriefcaseBusiness,
  restaurant: UtensilsCrossed,
  agriculture: Sprout,
  trucking: Truck,
};

export default function JobCard({ job, variant = 'row' }) {
  const auth = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth.role === 'job_seeker') return;

    try {
      const values = JSON.parse(localStorage.getItem('jooblie:saved-jobs') || '[]');
      setSaved(values.map(String).includes(String(job.id)));
    } catch {
      setSaved(false);
    }
  }, [job.id, auth.role]);

  const toggleSaved = async () => {
    if (saving) return;

    if (auth.role === 'job_seeker') {
      setSaving(true);
      const next = !saved;
      setSaved(next);

      try {
        await apiRequest(`/job-seeker/jobs/${job.id}/save`, {
          method: next ? 'POST' : 'DELETE',
          auth: true,
        });
      } catch {
        setSaved(!next);
      } finally {
        setSaving(false);
      }

      return;
    }

    try {
      const values = JSON.parse(localStorage.getItem('jooblie:saved-jobs') || '[]').map(String);
      const id = String(job.id);
      const next = values.includes(id)
        ? values.filter((value) => value !== id)
        : [...values, id];

      localStorage.setItem('jooblie:saved-jobs', JSON.stringify(next));
      setSaved(next.includes(id));
    } catch {
      setSaved((value) => !value);
    }
  };

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

      <div className="job-card__main">
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
        title={
          auth.role === 'job_seeker'
            ? (saved ? 'Remove saved job' : 'Save job')
            : 'Sign in as a job seeker to sync saved jobs'
        }
        disabled={saving}
        onClick={toggleSaved}
      >
        <Bookmark
          size={18}
          fill={saved ? 'currentColor' : 'none'}
        />
      </button>
    </article>
  );
}
