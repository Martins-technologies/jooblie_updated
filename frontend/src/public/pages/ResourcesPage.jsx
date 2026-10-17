import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bookmark, Building2, Check, ChevronDown, Compass, FileCheck2, Search, ShieldCheck } from 'lucide-react';
import seekerImage from '../../shared/assets/images/cta/05_for_job_seekers.webp';
import employerImage from '../../shared/assets/images/cta/04_for_employers.webp';
import '../../shared/styles/resources.css';

const seekerGuides = [
  {
    id: 'search-guide', title: 'Build a search that works for you', label: 'Discover',
    intro: 'Start with the work you want to do, then narrow the details that matter.',
    steps: ['Try a specific role title or a skill you use. Compare related titles if the results are too narrow.', 'Combine location with a work arrangement: remote, hybrid or on-site. Read the listing for any location requirements.', 'Check the date posted, job type and salary information. Save relevant roles so you can return to the full details.'],
    to: '/all-jobs', action: 'Put your search into practice',
  },
  {
    id: 'application-guide', title: 'Make your application easy to understand', label: 'Prepare',
    intro: 'A clear, relevant introduction helps a hiring team understand what you can bring.',
    steps: ['Read the responsibilities and requirements before deciding whether to apply. Look for examples from your own experience that relate to the work.', 'Keep your profile, contact details and resume current. Use concrete examples and check spelling, dates and attachment names.', 'Follow the application instructions and review everything before submitting. Return to your workspace to see recorded application updates.'],
    to: '/register?role=job_seeker', action: 'Create your job-seeker profile',
  },
  {
    id: 'employer-research-guide', title: 'Get to know the company behind the role', label: 'Consider',
    intro: 'The job is one part of the decision. The employer and working context matter too.',
    steps: ['Visit the company profile and compare its description, location and published openings.', 'Write down questions about the team, responsibilities, working arrangements and recruitment process.', 'Review any offer and the employer’s identity carefully. If a listing looks suspicious or asks for unexpected payments, pause and contact support.'],
    to: '/companies', action: 'Explore employer profiles',
  },
];

const employerGuides = [
  {
    id: 'company-guide', title: 'Give candidates a useful company introduction', label: 'Introduce',
    intro: 'Help people understand your business before they decide to apply.',
    steps: ['Use a recognisable company name and logo, an accurate description and up-to-date contact information.', 'Describe the work your company does and the environment a candidate can expect. Keep claims specific and supportable.', 'Check your location and remote-work information before publishing. Review your public profile after updating it.'],
    to: '/register?role=recruiter', action: 'Get started as an employer',
  },
  {
    id: 'listing-guide', title: 'Write a role people can make sense of', label: 'Publish',
    intro: 'A strong job listing sets clear expectations, without making people search for the essentials.',
    steps: ['Choose a familiar job title and outline the main responsibilities in plain language.', 'Separate essential requirements from helpful experience. Include the location, work arrangement, employment type and available pay details.', 'Explain how to apply and what candidates should prepare. Proofread the listing and keep its status current when hiring changes.'],
    to: '/post-job', action: 'Prepare a job opening',
  },
  {
    id: 'review-guide', title: 'Keep candidate review organised', label: 'Review',
    intro: 'A consistent process helps your team make informed decisions.',
    steps: ['Agree on the role’s assessment criteria before reviewing applications, and use the same criteria consistently.', 'Review the materials candidates submit and keep application statuses current in your recruiter workspace.', 'Handle candidate information carefully. Limit access to people involved in recruitment and follow your organisation’s privacy and retention policies.'],
    to: '/contact', action: 'Ask a platform question',
  },
];

function Guide({ guide, index }) {
  return (
    <details className="resources-guide" id={guide.id} open={index === 0}>
      <summary>
        <span className="resources-guide-number">0{index + 1}</span>
        <h3 className="resources-guide-heading"><span>{guide.label}</span>{guide.title}</h3>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className="resources-guide-content">
        <p>{guide.intro}</p>
        <ol>{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
        <Link className="resources-text-link" to={guide.to}>{guide.action}<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </details>
  );
}

export default function ResourcesPage() {
  return (
    <div className="resources-page">
      <section className="resources-hero" aria-labelledby="resources-title">
        <div className="container resources-hero-grid">
          <div className="resources-hero-copy">
            <span className="resources-eyebrow">THE JOOBLIE RESOURCE HUB</span>
            <h1 id="resources-title">A little preparation.<br /><em>A clearer next step.</em></h1>
            <p>Make your next move with more confidence. Practical guidance for finding a role, preparing an application and building your next team.</p>
            <div className="resources-hero-actions"><a className="button button--primary" href="#job-seeker-guides">I’m looking for a role<ArrowRight size={17} aria-hidden="true" /></a><a className="resources-text-link" href="#employer-guides">I’m here to hire<ArrowRight size={16} aria-hidden="true" /></a></div>
            <div className="resources-hero-note"><Compass size={15} aria-hidden="true" /><span>Useful guidance. At your own pace.</span></div>
          </div>
          <figure className="resources-hero-visual">
            <img src={seekerImage} alt="Professional taking time to plan their next career move" width="960" height="640" fetchpriority="high" />
            <figcaption><span className="resources-visual-icon"><Bookmark size={21} aria-hidden="true" /></span><div><strong>Start with what matters to you.</strong><span>Explore · prepare · move forward</span></div></figcaption>
          </figure>
        </div>
      </section>

      <nav className="container resources-shortcuts" aria-label="Resource topics">
        {[{ icon: Search, title: 'Find your direction', text: 'Search and employer research', href: '#job-seeker-guides' }, { icon: FileCheck2, title: 'Apply with clarity', text: 'Profiles and application preparation', href: '#application-guide' }, { icon: Building2, title: 'Build your next team', text: 'Company profiles and clear job listings', href: '#employer-guides' }].map(({ icon: Icon, title, text, href }) => <a href={href} key={title}><span className="resources-shortcut-icon"><Icon size={21} aria-hidden="true" /></span><span><strong>{title}</strong><span>{text}</span></span><ArrowUpRight size={17} aria-hidden="true" /></a>)}
      </nav>

      <section className="resources-library" id="job-seeker-guides" aria-labelledby="seeker-guides-title">
        <div className="container resources-library-grid">
          <div className="resources-library-intro"><span className="resources-eyebrow">FOR JOB SEEKERS</span><h2 id="seeker-guides-title">Your search.<br />With a little more direction.</h2><p>Turn a long list of possibilities into considered next steps. Start wherever you are in your search.</p><div className="resources-preflight"><span><FileCheck2 size={19} aria-hidden="true" />Before you apply</span><ul>{['Read the full role description', 'Check your profile and resume', 'Review the employer’s information'].map(text => <li key={text}><Check size={15} aria-hidden="true" />{text}</li>)}</ul></div><Link className="resources-text-link" to="/all-jobs">Explore current opportunities<ArrowRight size={16} aria-hidden="true" /></Link></div>
          <div className="resources-guide-list">{seekerGuides.map((guide, index) => <Guide key={guide.id} guide={guide} index={index} />)}</div>
        </div>
      </section>

      <section className="resources-employers" id="employer-guides" aria-labelledby="employer-guides-title">
        <div className="container resources-library-grid">
          <div className="resources-library-intro"><span className="resources-eyebrow">FOR EMPLOYERS</span><h2 id="employer-guides-title">Better information.<br />A better place to begin.</h2><p>Present your company clearly, explain the opportunity and give candidates the details they need.</p><figure className="resources-employer-visual"><img src={employerImage} alt="Professional preparing recruitment information at a desk" width="960" height="640" loading="lazy" decoding="async" /><figcaption>Workplace photography is illustrative.</figcaption></figure></div>
          <div className="resources-guide-list">{employerGuides.map((guide, index) => <Guide key={guide.id} guide={guide} index={index} />)}</div>
        </div>
      </section>

      <section className="resources-support" aria-labelledby="resources-support-title"><div className="container"><div className="resources-support-inner"><span className="resources-support-icon"><ShieldCheck size={26} strokeWidth={1.6} aria-hidden="true" /></span><div><span className="resources-eyebrow">A MORE INFORMED EXPERIENCE</span><h2 id="resources-support-title">Good questions are part of the process.</h2><p>Need help with the platform or want to raise a concern about a listing? Tell us what you need. Keep passwords and sensitive documents out of support messages.</p><div className="resources-policy-links"><Link to="/privacy">Privacy information<ArrowUpRight size={13} aria-hidden="true" /></Link><Link to="/terms">Platform guidelines<ArrowUpRight size={13} aria-hidden="true" /></Link></div></div><Link to="/contact" className="button button--primary">Get in touch<ArrowRight size={17} aria-hidden="true" /></Link></div></div></section>
    </div>
  );
}
