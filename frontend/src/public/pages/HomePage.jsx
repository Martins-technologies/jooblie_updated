import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleUserRound,
  MessageCircle,
  Search,
  Send,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import SearchPanel from '../../shared/components/SearchPanel';
import CategoryCard from '../../shared/components/CategoryCard';
import JobCard from '../../shared/components/JobCard';
import SectionHeading from '../../shared/components/SectionHeading';
import Reveal from '../../shared/components/Reveal';
import { EmptyState, LoadingState } from '../../shared/components/StatusMessage';
import usePublicData from '../../shared/hooks/usePublicData';
import { focusCategories, SITE_NAME } from '../../shared/config/site';

import heroPeopleImage from '../../shared/assets/images/hero/01_hero_people.webp';
import jobSeekerImage from '../../shared/assets/images/cta/05_for_job_seekers.webp';
import employerImage from '../../shared/assets/images/cta/04_for_employers.webp';

const steps = [
  { icon: CircleUserRound, label: '1. Create Account', text: 'Sign up as a job seeker or employer.' },
  { icon: Search, label: '2. Search or Post', text: 'Search jobs or post your job in minutes.' },
  { icon: Send, label: '3. Apply or Review', text: 'Submit applications or review candidates in your workspace.' },
  { icon: MessageCircle, label: '4. Connect', text: 'Communicate easily within the platform.' },
  { icon: CheckCircle2, label: '5. Get Hired', text: 'Find the right match and get hired.' },
  { icon: TrendingUp, label: '6. Grow Together', text: 'Build your career or grow your business.' },
];

export default function HomePage() {
  const { loading, data } = usePublicData();
  const activeJobs = data.jobs.filter((job) => job.isActive);
  const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
  const seen = new Set();

  const latestJobs = activeJobs
    .filter((job) => {
      const published = new Date(job.createdAt || 0).getTime();
      return Number.isFinite(published) && published >= last24Hours;
    })
    .filter((job) => {
      const id = String(job.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 3);

  const counts = Object.fromEntries(focusCategories.map((category) => [category.key, 0]));
  activeJobs.forEach((job) => {
    if (job.categorySlug && Object.prototype.hasOwnProperty.call(counts, job.categorySlug)) {
      counts[job.categorySlug] += 1;
    }
  });

  return (
    <div className="jooblie-home">
      <section className="jooblie-home-hero">
        <div className="jooblie-home-hero-bg">
          <div className="container jooblie-home-hero-inner">
            <div className="jooblie-home-copy">
              <h1>
                Find the right job.
                <br />
                Faster with <span>{SITE_NAME}.</span>
              </h1>
              <p>
                Explore current openings across multiple industries.
                <br />
                Connect with top employers and build your future.
              </p>
              <div className="jooblie-home-actions">
                <Link className="button button--primary" to="/all-jobs">
                  <Search size={18} /> Find Jobs
                </Link>
                <Link className="button button--secondary" to="/post-job">
                  <BriefcaseBusiness size={18} /> Post a Job
                </Link>
              </div>
            </div>
          </div>

          <div className="jooblie-home-hero-image" aria-hidden="true">
            <img src={heroPeopleImage} alt="" width="1280" height="800" fetchPriority="high" decoding="async"/>
          </div>
        </div>

        <div className="container jooblie-search-overlap">
          <SearchPanel />
        </div>
      </section>

      <section className="section section--compact jooblie-category-section">
        <div className="container">
          <SectionHeading
            title="Popular Job Categories"
            action={(
              <Link to="/categories" className="inline-link">
                View all categories <ArrowRight size={16} />
              </Link>
            )}
          />
          <Reveal className="category-grid" stagger>
            {focusCategories.map((category) => (
              <CategoryCard
                key={category.key}
                category={category}
                count={counts[category.key]}
              />
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section section--soft jooblie-jobs-section">
        <div className="container">
          <SectionHeading
            title="Jobs posted in the last 24 hours"
            action={(
              <Link to="/all-jobs" className="inline-link">
                View all jobs <ArrowRight size={16} />
              </Link>
            )}
          />

          {loading ? (
            <Reveal><LoadingState label="Loading current jobs..." /></Reveal>
          ) : latestJobs.length ? (
            <Reveal className="job-list" stagger>
              {latestJobs.map((job) => <JobCard key={job.id} job={job} />)}
            </Reveal>
          ) : (
            <Reveal>
              <EmptyState
                backendMissing={!data.configured}
                title={data.configured ? 'No new jobs in the last 24 hours' : 'Jobs temporarily unavailable'}
                text="New active openings will appear here automatically. Browse all jobs to see earlier listings."
              />
            </Reveal>
          )}

          {latestJobs.length > 0 && (
            <Reveal className="centered-action" delay={120}>
              <Link to="/all-jobs" className="button button--secondary">View All Jobs</Link>
            </Reveal>
          )}
        </div>
      </section>

      <section className="section section--compact jooblie-audience-section">
        <div className="container audience-grid">
          <Reveal as={Link} to="/register?role=job_seeker" className="audience-card audience-card--blue" direction="left">
            <div className="audience-card__content">
              <h2>For Job Seekers</h2>
              <p>Search current openings, save roles and manage your applications.</p>
              <span>Create your profile <ArrowRight size={16} /></span>
            </div>
            <img src={jobSeekerImage} alt="Professional exploring career opportunities" width="960" height="640" loading="lazy" decoding="async"/>
          </Reveal>

          <Reveal as={Link} to="/post-job" className="audience-card audience-card--green" direction="right" delay={100}>
            <div className="audience-card__content">
              <h2>For Employers</h2>
              <p>Post jobs, find qualified candidates, and grow your team.</p>
              <span>Post a job now <ArrowRight size={16} /></span>
            </div>
            <img src={employerImage} alt="Professionals collaborating at work" width="960" height="640" loading="lazy" decoding="async"/>
          </Reveal>
        </div>
      </section>

      <section className="section jooblie-how">
        <div className="container">
          <SectionHeading title="How Jooblie Works" center />
          <Reveal className="steps-grid" stagger>
            {steps.map(({ icon: Icon, label, text }, index) => (
              <div className="step" key={label}>
                <div className="step__icon"><Icon size={23} /></div>
                <strong>{label}</strong>
                <p>{text}</p>
                {index < steps.length - 1 && <span className="step__line" aria-hidden="true" />}
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      
    </div>
  );
}
