import { Link } from 'react-router-dom';
import { Linkedin, Facebook, Instagram, Mail } from 'lucide-react';
import Logo from './Logo';
import Reveal from './Reveal';
import { SITE_NAME } from '../config/site';

const groups = [
  {
    title: 'For Job Seekers',
    links: [
      ['Find Jobs', '/all-jobs'],
      ['Browse Categories', '/categories'],
      ['Create Profile', '/register?role=job_seeker'],
      ['Career Resources', '/resources'],
    ],
  },
  {
    title: 'For Employers',
    links: [
      ['Post a Job', '/post-job'],
      ['Hire Talent', '/register?role=recruiter'],
      ['Companies', '/companies'],
      ['Employer Help', '/help'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About Us', '/about'],
      ['Contact Us', '/contact'],
      ['Resources', '/resources'],
      ['Job Categories', '/categories'],
    ],
  },
  {
    title: 'Support',
    links: [
      ['Help Center', '/help'],
      ['Contact Support', '/contact'],
      ['Terms of Use', '/terms'],
      ['Privacy Policy', '/privacy'],
    ],
  },
];

export default function Footer() {
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim();

  return (
    <footer className="footer">
      <Reveal className="container footer__grid" stagger>
        <div className="footer__brand">
          <Logo />
          <p>{SITE_NAME} connects job seekers and employers across specialist hiring categories through one central platform.</p>
          <div className="footer__socials" aria-label="Social links">
            <span aria-hidden="true"><Facebook size={17} /></span>
            <span aria-hidden="true"><Linkedin size={17} /></span>
            <span aria-hidden="true"><Instagram size={17} /></span>
            {supportEmail && <a href={`mailto:${supportEmail}`} aria-label={`Email ${SITE_NAME}`}><Mail size={17} /></a>}
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.title} className="footer__group">
            <h3>{group.title}</h3>
            {group.links.map(([label, to]) => <Link key={to + label} to={to}>{label}</Link>)}
          </div>
        ))}
      </Reveal>

      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span>
        <span>One platform. Specialist hiring journeys.</span>
      </div>
    </footer>
  );
}
