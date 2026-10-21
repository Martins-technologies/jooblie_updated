import { Link } from 'react-router-dom';
import { Linkedin, Facebook, Instagram, Mail, Phone, ShieldCheck, ArrowUpRight } from 'lucide-react';
import Logo from './Logo';
import Reveal from './Reveal';
import { SITE_NAME } from '../config/site';

const groups = [
  {
    title: 'For Job Seekers',
    links: [
      ['Browse All Jobs', '/all-jobs'],
      ['Explore Employers', '/companies'],
      ['Job Categories', '/categories'],
      ['Career Resources', '/resources'],
      ['Create Seeker Profile', '/register?role=job_seeker'],
    ],
  },
  {
    title: 'For Employers',
    links: [
      ['Post an Opening', '/post-job'],
      ['Register as Employer', '/register?role=recruiter'],
      ['Employer Directory', '/companies'],
      ['Hiring Guidelines', '/resources'],
      ['Contact Sales & Support', '/contact'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About Jooblie', '/about'],
      ['Contact Us', '/contact'],
      ['Career Insights', '/resources'],
      ['Browse Categories', '/categories'],
    ],
  },
  {
    title: 'Trust & Legal',
    links: [
      ['Terms of Use', '/terms'],
      ['Privacy Policy', '/privacy'],
      ['Platform Integrity', '/terms'],
      ['Candidate Support', '/contact'],
    ],
  },
];

export default function Footer() {
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL || 'support@jooblie.com').trim();
  const supportPhone = '+1(403) 000-0000';

  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer__disclaimer-wrap">
        <div className="footer__disclaimer">
          <div className="footer__disclaimer-badge">
            <ShieldCheck size={20} className="footer__disclaimer-icon" aria-hidden="true" />
          </div>
          <div className="footer__disclaimer-body">
            <span className="footer__disclaimer-title">Platform Integrity Notice</span>
            <p className="footer__disclaimer-text">
              Availability depends on openings published by employers. {SITE_NAME} supports platform integrity but does not promise placement or endorse every individual listing.
            </p>
          </div>
          <Link to="/terms" className="footer__disclaimer-link">
            <span>Review Guidelines</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <Reveal className="container footer__grid" stagger>
        <div className="footer__brand">
          <Logo variant="light" className="footer__brand-logo" />
          <p className="footer__tagline">A clearer path from opportunity to application.</p>
          <p className="footer__desc">
            {SITE_NAME} brings job discovery, employer profiles, and applications into one unified recruitment platform.
          </p>

          <div className="footer__contact-info">
            <a href="tel:+14030000000" className="footer__contact-item">
              <Phone size={14} aria-hidden="true" />
              <span>{supportPhone}</span>
            </a>
            {supportEmail && (
              <a href={`mailto:${supportEmail}`} className="footer__contact-item">
                <Mail size={14} aria-hidden="true" />
                <span>{supportEmail}</span>
              </a>
            )}
          </div>

          <div className="footer__socials" aria-label="Social media links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label={`${SITE_NAME} on Facebook`}>
              <Facebook size={16} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label={`${SITE_NAME} on LinkedIn`}>
              <Linkedin size={16} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label={`${SITE_NAME} on Instagram`}>
              <Instagram size={16} />
            </a>
            {supportEmail && (
              <a href={`mailto:${supportEmail}`} aria-label={`Email ${SITE_NAME} Support`}>
                <Mail size={16} />
              </a>
            )}
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.title} className="footer__group">
            <h3>{group.title}</h3>
            <ul>
              {group.links.map(([label, to]) => (
                <li key={to + label}>
                  <Link to={to}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Reveal>

      <div className="container footer__bottom">
        <div className="footer__bottom-left">
          <span>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span>
        </div>

        <div className="footer__bottom-links">
          <Link to="/privacy">Privacy Policy</Link>
          <span className="footer__bottom-sep">·</span>
          <Link to="/terms">Terms of Use</Link>
          <span className="footer__bottom-sep">·</span>
          <Link to="/contact">Support</Link>
        </div>
      </div>
    </footer>
  );
}
