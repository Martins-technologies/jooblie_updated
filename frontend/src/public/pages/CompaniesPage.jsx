import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, BriefcaseBusiness, MapPin, Search, ShieldCheck, X } from 'lucide-react';
import PageHero from '../../shared/components/PageHero';
import CompanyLogo from '../../shared/components/CompanyLogo';
import { EmptyState } from '../../shared/components/StatusMessage';
import usePublicData from '../../shared/hooks/usePublicData';
import { stripHtml } from '../../shared/lib/format';
import '../../shared/styles/companiesDiscovery.css';

function CompanyCardSkeleton() {
  return <div className="employer-discovery-card employer-discovery-skeleton" aria-hidden="true"><div className="employer-discovery-card__top"><span className="employer-skeleton employer-skeleton--logo" /><span className="employer-skeleton employer-skeleton--tag" /></div><span className="employer-skeleton employer-skeleton--title" /><span className="employer-skeleton employer-skeleton--line" /><span className="employer-skeleton employer-skeleton--line employer-skeleton--short" /><span className="employer-skeleton employer-skeleton--footer" /></div>;
}

function EmployerCard({ company, jobs }) {
  const description = stripHtml(company.description || '');
  const categories = [...new Set(jobs.map(job => job.categoryName).filter(Boolean))].slice(0, 2);
  const locations = [...new Set(jobs.map(job => job.location).filter(Boolean))];
  const jobCount = jobs.length;
  return <article className="employer-discovery-card">
    <Link className="employer-discovery-card__link" to={'/companies/' + company.id}>
      <div className="employer-discovery-card__top"><CompanyLogo company={company} size="lg" />{company.verificationStatus === 'verified' && <span className="employer-verified"><ShieldCheck size={13} aria-hidden="true" />Verified</span>}</div>
      <div className="employer-discovery-card__identity"><h3>{company.name || 'Company profile'}</h3>{company.industry && <span className="employer-discovery-industry">{company.industry}</span>}</div>
      <p className={'employer-discovery-description' + (!description ? ' employer-discovery-description--empty' : '')}>{description || 'Explore this employer’s profile and the opportunities they publish on Jooblie.'}</p>
      <div className="employer-discovery-context">
        {company.location ? <span><MapPin size={14} aria-hidden="true" />{company.location}</span> : locations.length > 0 ? <span><MapPin size={14} aria-hidden="true" /><span>Open roles: {locations[0]}{locations.length > 1 ? ' + ' + (locations.length - 1) + ' more' : ''}</span></span> : null}
        {categories.length > 0 && <span><Building2 size={14} aria-hidden="true" /><span>Hiring in {categories.join(' · ')}</span></span>}
      </div>
      <div className="employer-discovery-card__footer"><span className={'employer-opening-count' + (!jobCount ? ' employer-opening-count--quiet' : '')}><BriefcaseBusiness size={14} aria-hidden="true" />{jobCount ? jobCount + (jobCount === 1 ? ' open role' : ' open roles') : 'No current openings'}</span><span className="employer-profile-action">View profile<ArrowRight size={15} aria-hidden="true" /></span></div>
    </Link>
  </article>;
}

export default function CompaniesPage() {
  const { loading, data } = usePublicData();
  const [query, setQuery] = useState('');
  const [openingsOnly, setOpeningsOnly] = useState(false);
  const companies = data?.companies || [];
  const jobsByCompany = useMemo(() => {
    const result = new Map();
    for (const job of data?.jobs || []) {
      if (!job.isActive || job.companyId == null) continue;
      const id = String(job.companyId);
      if (!result.has(id)) result.set(id, []);
      result.get(id).push(job);
    }
    return result;
  }, [data?.jobs]);
  const hiringCount = companies.filter(company => jobsByCompany.has(String(company.id))).length;
  const visibleCompanies = companies.filter(company =>
    (!openingsOnly || jobsByCompany.has(String(company.id))) &&
    String(company.name || '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );
  const hasFilters = query.trim() || openingsOnly;
  const clearFilters = () => { setQuery(''); setOpeningsOnly(false); };

  return (
    <div className="employers-discovery-page">
      <PageHero eyebrow="THE PEOPLE BEHIND THE OPPORTUNITY" title="Find a team." accent="See your next possibility." text="Get to know the employers behind the openings. Explore company profiles, understand their work and discover where your next step could lead." imageSrc="/images/about/collaboration-hero.webp" imageAlt="Two professionals exchanging ideas around a laptop in a bright workplace">
        <div className="public-hero-actions"><a href="#employer-directory" className="button button--primary">Explore employers<ArrowRight size={17} aria-hidden="true" /></a><Link to="/all-jobs">Browse current jobs<ArrowRight size={16} aria-hidden="true" /></Link></div>
      </PageHero>

      <section className="employer-directory" id="employer-directory" aria-labelledby="employer-directory-title">
        <div className="container">
          <div className="employer-directory-heading"><div><span className="employer-directory-eyebrow">EXPLORE THE DIRECTORY</span><h2 id="employer-directory-title">A little context. A better connection.</h2><p>Learn about a company before you take the next step.</p></div>{!loading && data?.configured && <span className="employer-directory-total"><Building2 size={15} aria-hidden="true" />{companies.length} {companies.length === 1 ? 'employer profile' : 'employer profiles'}</span>}</div>

          <div className="employer-directory-toolbar">
            <div className="employer-directory-search"><Search size={18} aria-hidden="true" /><label className="employer-sr-only" htmlFor="employer-name-search">Search by company name</label><input id="employer-name-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by company name" aria-controls="employer-results" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear company search"><X size={16} aria-hidden="true" /></button>}</div>
            <div className="employer-directory-filters" role="group" aria-label="Employer availability"><button type="button" aria-pressed={!openingsOnly} onClick={() => setOpeningsOnly(false)}>All employers{!loading && <span>{companies.length}</span>}</button><button type="button" aria-pressed={openingsOnly} onClick={() => setOpeningsOnly(true)}>With openings{!loading && <span>{hiringCount}</span>}</button></div>
          </div>
          <div className="employer-directory-results-note" role="status" aria-live="polite">{loading ? 'Loading employer profiles…' : data?.configured === false ? 'Employer profiles are temporarily unavailable.' : 'Showing ' + visibleCompanies.length + (visibleCompanies.length === 1 ? ' employer' : ' employers') + (query.trim() ? ' matching “' + query.trim() + '”' : '')}{hasFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}</div>

          <div id="employer-results" aria-busy={loading}>
            {loading ? <div className="employer-discovery-grid" role="status" aria-label="Loading employer profiles">{Array.from({ length: 6 }, (_, index) => <CompanyCardSkeleton key={index} />)}</div> : visibleCompanies.length ? <div className="employer-discovery-grid">{visibleCompanies.map(company => <EmployerCard key={company.id} company={company} jobs={jobsByCompany.get(String(company.id)) || []} />)}</div> : <div className="employer-directory-empty"><EmptyState backendMissing={data?.configured === false} title={data?.configured === false ? 'Employer directory unavailable' : hasFilters && companies.length ? 'No employers match this search' : 'No employer profiles yet'} text={hasFilters && companies.length ? 'Try another company name or include employers without current openings.' : 'Published employer profiles will appear here when available.'} />{hasFilters && <button type="button" className="button button--secondary" onClick={clearFilters}>Show all employers<ArrowRight size={16} aria-hidden="true" /></button>}</div>}
          </div>

          <div className="employer-directory-note"><ShieldCheck size={18} aria-hidden="true" /><p>Company information and openings are published by employers. A profile helps you understand the opportunity; it does not guarantee a placement or endorse every listing.</p></div>
        </div>
      </section>
      <section className="employer-directory-closing"><div className="container"><div><span className="employer-directory-eyebrow">BUILDING YOUR NEXT TEAM?</span><h2>Give people a reason to get to know you.</h2><p>Introduce your business and publish clear opportunities through your recruiter workspace.</p></div><Link to="/register?role=recruiter" className="button button--primary">Get started as an employer<ArrowRight size={17} aria-hidden="true" /></Link></div></section>
    </div>
  );
}

