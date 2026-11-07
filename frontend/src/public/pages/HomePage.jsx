import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Compass,
  FileCheck2,
  Filter,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import SearchPanel from '../../shared/components/SearchPanel';
import CategoryCard from '../../shared/components/CategoryCard';
import JobCard from '../../shared/components/JobCard';
import CompanyLogo from '../../shared/components/CompanyLogo';
import SectionHeading from '../../shared/components/SectionHeading';
import Reveal from '../../shared/components/Reveal';
import { EmptyState, LoadingState } from '../../shared/components/StatusMessage';
import usePublicData from '../../shared/hooks/usePublicData';
import { focusCategories, IS_HEALTH_PORTAL, SITE_NAME } from '../../shared/config/site';

import jobSeekerImage from '../../shared/assets/images/cta/05_for_job_seekers.webp';
import employerImage from '../../shared/assets/images/cta/04_for_employers.webp';

const howItWorksSteps = [
  {
    step: '01',
    icon: Search,
    title: 'Discover Roles',
    desc: 'Search active openings by title, location, category, and supported work preferences (Remote, Hybrid, On-site).',
  },
  {
    step: '02',
    icon: Building2,
    title: 'Explore Employers',
    desc: 'Review published employer profiles, company details, and current openings before applying.',
  },
  {
    step: '03',
    icon: FileCheck2,
    title: 'Submit Application',
    desc: 'Apply directly with your profile, resume, and cover note. Structured routing delivers your application to recruiters.',
  },
  {
    step: '04',
    icon: Compass,
    title: 'Track Progress',
    desc: 'Follow your recorded application statuses and saved positions within one unified recruitment network.',
  },
];

export default function HomePage() {
  const { loading, data } = usePublicData();
  const activeJobs = data.jobs.filter((job) => job.isActive);
  const companies = (data.companies || []).slice(0, 6);
  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
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

  // If no 24h jobs exist, display up to 3 latest active jobs
  const displayJobs = latestJobs.length > 0 ? latestJobs : activeJobs.slice(0, 3);

  const counts = Object.fromEntries(focusCategories.map((category) => [category.key, 0]));
  activeJobs.forEach((job) => {
    if (job.categorySlug && Object.prototype.hasOwnProperty.call(counts, job.categorySlug)) {
      counts[job.categorySlug] += 1;
    }
  });

  return (
    <div className="jooblie-home">
      {/* 1. HERO SECTION */}
      <section className="jooblie-home-hero" aria-label="Hero">
        <div className="jooblie-home-hero-bg">
          {/* Creative Multi-Layer Ambient Atmosphere */}
          <div className="hero-ambient-glow hero-ambient-glow--primary" aria-hidden="true" />
          <div className="hero-ambient-glow hero-ambient-glow--cyan" aria-hidden="true" />
          <div className="hero-bg-grid" aria-hidden="true" />
          <div className="hero-bg-accent-ring hero-bg-accent-ring--1" aria-hidden="true" />
          <div className="hero-bg-accent-ring hero-bg-accent-ring--2" aria-hidden="true" />

          <div className="container jooblie-home-hero-inner">
            <div className="jooblie-home-copy">
              <div className="hero-badge">
                <span className="hero-badge-pulse" aria-hidden="true" />
                <span>YOUR NEXT CHAPTER STARTS HERE</span>
              </div>

              <h1>
                {IS_HEALTH_PORTAL ? 'Your next healthcare role.' : 'Your next opportunity.'}<br/><span className="hero-gradient-text">A clearer path forward.</span>
              </h1>

              <p className="hero-lead">
                Discover current openings, get to know the employers behind them, and bring your next application into focus.
              </p>

              <div className="jooblie-home-actions">
                <Link className="button button--primary hero-primary-btn" to="/all-jobs">
                  <Search size={16} /> Browse Opportunities
                </Link>
                <Link className="button button--secondary hero-secondary-btn" to="/companies">
                  <Building2 size={16} /> Explore Employers
                </Link>
              </div>

              <div className="hero-trust-clean" aria-label="Platform features">
                <span className="hero-trust-clean__item">
                  <CheckCircle2 size={15} className="hero-trust-clean__icon" /> Direct Applications
                </span>
                <span className="hero-trust-clean__sep" aria-hidden="true">&bull;</span>
                <span className="hero-trust-clean__item">
                  <ShieldCheck size={15} className="hero-trust-clean__icon" /> Employer Profiles
                </span>
                <span className="hero-trust-clean__sep" aria-hidden="true">&bull;</span>
                <span className="hero-trust-clean__item">
                  <Sparkles size={15} className="hero-trust-clean__icon" /> Saved Opportunities
                </span>
              </div>
            </div>

            <div className="jooblie-home-hero-visual" aria-label="Visual showcase of professional collaboration">
              {/* Ambient Glow Backdrop */}
              <div className="hero-visual-backdrop" aria-hidden="true" />

              {/* 4-Diamond Collage Cluster */}
              <div className="hero-diamonds-container">
                {/* Diamond 1: Main Large Diamond (Center-Right) - Direction: Vertical Float */}
                <div className="hero-diamond-item hero-diamond-item--main" title="Young product lead and software engineer collaborating in London office">
                  <div className="hero-diamond-shape">
                    <img
                      src="/images/hero-diamond-main.jpg"
                      alt="Young male product lead in light blue shirt and young female engineer in navy blazer smiling over laptop"
                      className="hero-diamond-img"
                      loading="eager" decoding="async"
                    />
                  </div>
                </div>

                {/* Diamond 2: Top Diamond (Top-Left, Handshake fully visible) - Direction: Diagonal Up-Right */}
                <div className="hero-diamond-item hero-diamond-item--top" title="Young talent lead and candidate shaking hands in modern glass office">
                  <div className="hero-diamond-shape">
                    <img
                      src="/images/hero-diamond-top.jpg"
                      alt="Young woman in tailored navy jacket warmly shaking hands with candidate in crisp white shirt in London glass office"
                      className="hero-diamond-img"
                      loading="eager"
                    />
                  </div>
                </div>

                {/* Diamond 3: Left Small Diamond - Direction: Horizontal Sway */}
                <div className="hero-diamond-item hero-diamond-item--left" title="Creative product designers in royal blue">
                  <div className="hero-diamond-shape">
                    <img
                      src="/images/hero-diamond-left.jpg"
                      alt="Two young creative product designers in royal blue shirt and navy blazer working on laptop wireframes"
                      className="hero-diamond-img"
                      loading="eager"
                    />
                  </div>
                </div>

                {/* Diamond 4: Bottom-Left Diamond - Direction: Diagonal Down-Left */}
                <div className="hero-diamond-item hero-diamond-item--bottom" title="Young engineering team collaborating on laptop">
                  <div className="hero-diamond-shape">
                    <img
                      src="/images/hero-diamond-bottom.jpg"
                      alt="Young software engineer in navy cable-knit sweater and female colleague in indigo blazer coding on laptop"
                      className="hero-diamond-img"
                      loading="eager"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FUNCTIONAL SEARCH PANEL OVERLAP */}
        <div className="container jooblie-search-overlap">
          <SearchPanel variant="hero" actionPath="/all-jobs" />
        </div>
      </section>

      {/* 2. POPULAR CATEGORIES */}
      <section className="section section--compact jooblie-category-section">
        <div className="container">
          <SectionHeading
            title={IS_HEALTH_PORTAL ? 'Healthcare Job Categories' : 'Popular Job Categories'}
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

      {/* 3. RECENT / CURRENT OPENINGS */}
      <section className="section section--soft jooblie-jobs-section">
        <div className="container">
          <SectionHeading
            title={latestJobs.length > 0 ? 'Jobs posted in the last 24 hours' : 'Recent Job Openings'}
            action={(
              <Link to="/all-jobs" className="inline-link">
                Browse all jobs <ArrowRight size={16} />
              </Link>
            )}
          />

          {loading ? (
            <Reveal><LoadingState label="Loading current jobs..." /></Reveal>
          ) : displayJobs.length ? (
            <Reveal className="job-list" stagger>
              {displayJobs.map((job) => <JobCard key={job.id} job={job} />)}
            </Reveal>
          ) : (
            <Reveal>
              <EmptyState
                backendMissing={!data.configured}
                title={data.configured ? 'No active jobs available' : 'Jobs temporarily unavailable'}
                text="Active openings published by employers will appear here automatically. Browse all jobs to see current listings."
              />
            </Reveal>
          )}

          {displayJobs.length > 0 && (
            <Reveal className="centered-action" delay={120}>
              <Link to="/all-jobs" className="button button--secondary">
                View All {activeJobs.length ? `${activeJobs.length} Available Jobs` : 'Openings'}
              </Link>
            </Reveal>
          )}
        </div>
      </section>

      {/* 4. PUBLIC JOB SEEKERS AND EMPLOYERS SECTIONS (VISUALLY DISTINCT) */}
      <section className="section jooblie-portal-sections">
        <div className="container audience-grid-enhanced">
          {/* Section for Job Seekers */}
          <Reveal as="div" className="audience-card-enhanced audience-card--seekers" direction="left">
            <div className="audience-card__visual-wrap">
              <img
                src={jobSeekerImage}
                alt="Job seeker exploring career opportunities on tablet"
                width="960"
                height="640"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="audience-card__body">
              <span className="audience-tag">For Job Seekers</span>
              <h2>Find opportunities that fit your next step.</h2>
              <p className="audience-lead">
                Explore confirmed job discovery features, precise filters for work arrangement and salary, and detailed company profiles across top industries.
              </p>
              <ul className="audience-features-list">
                <li><CheckCircle2 size={16} /> Targeted keyword, location, and work preference search</li>
                <li><CheckCircle2 size={16} /> Company profile exploration with current active openings</li>
                <li><CheckCircle2 size={16} /> Structured application submissions to hiring teams</li>
              </ul>
              <div className="audience-action-row">
                <Link to="/all-jobs" className="button button--primary">
                  Browse Jobs <ArrowRight size={16} />
                </Link>
                <Link to="/register?role=job_seeker" className="inline-link audience-link">
                  Create seeker profile
                </Link>
              </div>
              <p className="audience-disclaimer">
                An application does not guarantee an interview or employment.
              </p>
            </div>
          </Reveal>

          {/* Section for Employers */}
          <Reveal as="div" className="audience-card-enhanced audience-card--employers" direction="right" delay={100}>
            <div className="audience-card__visual-wrap">
              <img
                src={employerImage}
                alt="Hiring managers reviewing candidate applications in modern conference room"
                width="960"
                height="640"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="audience-card__body">
              <span className="audience-tag audience-tag--employer">For Employers</span>
              <h2>Make your next hire easier to discover.</h2>
              <p className="audience-lead">
                Showcase your company profile, publish detailed job listings, and reach motivated candidates across specialized category portals.
              </p>
              <ul className="audience-features-list">
                <li><CheckCircle2 size={16} /> Company profile visibility across the entire public network</li>
                <li><CheckCircle2 size={16} /> Structured listings with remote, hybrid, and on-site preferences</li>
                <li><CheckCircle2 size={16} /> Centralized applicant discovery and review in your recruiter workspace</li>
              </ul>
              <div className="audience-action-row">
                <Link to="/register?role=recruiter" className="button button--primary">
                  Hire Talent <ArrowRight size={16} />
                </Link>
                <Link to="/post-job" className="inline-link audience-link">
                  Post an opening
                </Link>
              </div>
              <p className="audience-guidance">
                Clear job descriptions, accurate locations, and salary details help candidates decide faster.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5. A CONNECTED HIRING NETWORK (REAL DATA ONLY) */}
      <section className="section section--soft jooblie-network-section">
        <div className="container">
          <div className="network-header">
            <span className="eyebrow">Employer directory</span>
            <h2>A connected hiring network.</h2>
            <p className="network-subtitle">
              Get to know the employers on Jooblie and explore their published openings.
            </p>
          </div>

          {loading ? (
            <LoadingState label="Loading employer network..." />
          ) : companies.length ? (
            <Reveal className="network-companies-grid" stagger>
              {companies.map((company) => (
                <Link
                  key={company.id}
                  to={`/companies/${company.id}`}
                  className="network-company-card"
                  aria-label={`View profile for ${company.name}`}
                >
                  <div className="network-company-logo">
                    <CompanyLogo company={company} size="lg" />
                  </div>
                  <div className="network-company-info">
                    <div className="network-company-top">
                      <h3>{company.name}</h3>
                      {company.verificationStatus === 'verified' && (
                        <span className="network-verified-badge" title="Verified employer profile">
                          <CheckCircle2 size={13} />
                        </span>
                      )}
                    </div>
                    {company.location && (
                      <span className="network-company-location">
                        <MapPin size={13} /> {company.location}
                      </span>
                    )}
                    <span className="network-company-link">
                      View profile & openings <ArrowRight size={13} />
                    </span>
                  </div>
                </Link>
              ))}
            </Reveal>
          ) : (
            <p className="network-empty-note">
              Employer profiles will appear here as organizations publish active listings.
            </p>
          )}

          {/* Explicit Trust Disclaimer Required by Section 5 */}
          <div className="network-trust-banner">
            <ShieldCheck size={18} className="network-trust-icon" />
            <p>
              Availability depends on openings published by employers. Jooblie supports platform integrity but does not promise placement or endorse every individual listing.
            </p>
          </div>
        </div>
      </section>

      {/* 6. HOW JOOBLIE WORKS */}
      <section className="section jooblie-how">
        <div className="container">
          <SectionHeading
            title="How Jooblie Works"
            subtitle="A transparent, streamlined recruitment workflow for candidates and employers alike."
            center
          />
          <Reveal className="steps-grid-modern" stagger>
            {howItWorksSteps.map(({ step, icon: Icon, title, desc }) => (
              <div className="step-card" key={step}>
                <div className="step-header">
                  <div className="step-badge">{step}</div>
                  <div className="step-icon-wrap">
                    <Icon size={20} />
                  </div>
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>
    </div>
  );
}

