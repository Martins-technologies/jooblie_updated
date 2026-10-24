import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const pages = {
  '/': ['A clearer path from opportunity to application', 'Jooblie brings job discovery, employer profiles, and applications into one recruitment platform. Search by role, location, and supported work preferences.'],
  '/all-jobs': ['Browse Jobs', 'Search current openings by title, location, salary, and supported work preferences on Jooblie.'],
  '/jobs': ['Recent Job Openings', 'Explore recently published employment opportunities on Jooblie.'],
  '/companies': ['Explore Employers', 'Discover company profiles and their current openings on Jooblie.'],
  '/categories': ['Job Categories', 'Explore specialist hiring categories and current openings on Jooblie.'],
  '/contact': ['Contact Jooblie', 'Get in touch with Jooblie regarding accounts, job listings, and hiring solutions.'],
  '/about': ['About Jooblie', 'Learn how Jooblie creates a clearer path from opportunity to application for candidates and employers.'],
  '/resources': ['Career & Hiring Resources', 'Practical guides for job searches, applications, company profiles, and clear job listings on Jooblie.'],
  '/terms': ['Terms of Use', 'Review the Jooblie platform terms of use, account guidelines, and hiring responsibilities.'],
  '/privacy': ['Privacy Policy', 'Read how Jooblie handles account information, recruitment data, and privacy requests.'],
  '/privacy-policy': ['Privacy Policy', 'Read how Jooblie handles account information, recruitment data, and privacy requests.'],
  '/mississauga/register': ['Free Job Seeker Registration in Mississauga | Jooblie', 'Register free with Jooblie in Mississauga, Ontario. Tell our team about your job search and explore potential employer opportunities. No job placement or immigration outcome is guaranteed.'],
  '/mississauga/thank-you': ['Registration Received | Jooblie', 'Your Jooblie Mississauga registration has been received. Learn what to expect next.'],
};

const mississaugaFaq = [
  ['Is Jooblie really free for job seekers?', 'Yes. Registering with Jooblie and receiving recruitment or job-placement assistance are free for job seekers. We do not charge recruitment fees.'],
  ['Will Jooblie guarantee me a job?', 'No. We can review your registration and explore possible employer-matching opportunities, but employment depends on employer needs, available openings and individual qualifications.'],
  ['Can Jooblie help me find an employer who supports work permits?', 'Jooblie may help you explore employment opportunities with employers who are willing and eligible to support applicable work permit processes. Availability varies, and no work permit outcome is guaranteed.'],
  ['Can a job help me qualify for permanent residence?', 'Certain employment arrangements may be relevant to some Canadian permanent residence programs, but eligibility depends on the rules of the applicable program and your circumstances. Registration with Jooblie does not establish PR eligibility.'],
  ['Do I need an existing work permit to register?', 'You may submit a registration to tell us about your job-search interests. Any employment opportunity will remain subject to the legal authorization and eligibility requirements that apply to you.'],
  ['Do I have to live in Mississauga?', 'Our new location is in Mississauga, Ontario. You may register from another city, but available opportunities and the ability to connect you with employers may depend on location.'],
  ['What happens after I submit the form?', 'Our team receives your registration, reviews the information and contacts you to discuss the next steps. Please ensure your email address and phone number are correct.'],
  ['Will my information be shared with employers?', 'Jooblie uses your information to review and respond to your registration. We will share relevant profile information with potential employers only in accordance with your permission and our Privacy Policy.'],
  ['Does Jooblie provide immigration advice or application services?', 'This registration page is for employment and employer-matching assistance. It does not provide individual immigration advice, confirm program eligibility or offer immigration representation.'],
];

export default function RouteMetadata() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const isPrivate = /^\/(dashboard|admin|account|settings|my-|candidates|post-job)/.test(pathname);
    const isCampaign = pathname.startsWith('/mississauga/');
    const item = pages[pathname] || [
      pathname.startsWith('/jobs/') ? 'Job details' : pathname.startsWith('/companies/') ? 'Company profile' : 'Jooblie',
      'Explore opportunities and employers on Jooblie.',
    ];
    document.title = item[0].endsWith('| Jooblie') ? item[0] : `${item[0]} | Jooblie`;
    const added = [];

    const setMeta = (attribute, name, content) => {
      let node = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute(attribute, name);
        document.head.append(node);
        added.push(node);
      }
      node.content = content;
    };

    setMeta('name', 'description', item[1]);
    const noIndex = isPrivate || pathname === '/mississauga/thank-you' || (!isCampaign && (Boolean(search) || ['/terms', '/privacy', '/privacy-policy'].includes(pathname)));
    setMeta('name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow');
    setMeta('property', 'og:title', document.title);
    setMeta('property', 'og:description', item[1]);
    setMeta('property', 'og:type', 'website');
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', document.title);
    setMeta('name', 'twitter:description', item[1]);

    const configuredBase = import.meta.env.VITE_PUBLIC_SITE_URL;
    const base = configuredBase || (isCampaign ? 'https://www.jooblie.com' : '');
    if (base) {
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = new URL(pathname, base).href;
      document.head.append(canonical);
      added.push(canonical);
      setMeta('property', 'og:url', canonical.href);
    }

    if (pathname === '/mississauga/register') {
      const structuredData = document.createElement('script');
      structuredData.type = 'application/ld+json';
      structuredData.dataset.jooblieCampaign = 'mississauga';
      structuredData.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: mississaugaFaq.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      });
      document.head.append(structuredData);
      added.push(structuredData);
    }

    return () => added.forEach((node) => node.remove());
  }, [pathname, search]);

  return null;
}
