import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail } from 'lucide-react';
import Logo from './Logo';
import Reveal from './Reveal';

const groups = [
  {
    title: 'For Job Seekers',
    links: [
      ['Find Jobs', '/jobs'],
      ['Browse Categories', '/categories'],
      ['Create Profile', '/register?role=job_seeker'],
      ['Career Resources', '/resources'],
    ],
  },
  {
    title: 'For Employers',
    links: [
      ['Post a Job', '/post-job'],
      ['Hire Talent', '/hire-talent'],
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
      ['Jooblie Categories', '/categories'],
    ],
  },
  {
    title: 'Support',
    links: [
      ['Help Center', '/help'],
      ['Contact Support', '/contact'],
      ['Terms of Use', '/terms'],
      ['Privacy Policy', '/privacy'],
      ['Employer Refund Policy', '/refund-policy'],
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
          <p>Jooblie connects job seekers and employers across specialist hiring categories through one central platform.</p>
          <div className="footer__socials" aria-label="Social links">
            <a href="https://www.facebook.com/profile.php?id=61595095425308" target="_blank" rel="noopener noreferrer" aria-label="Jooblie on Facebook">
              <Facebook size={17} />
            </a>
            <a href="https://www.instagram.com/joob_lie/" target="_blank" rel="noopener noreferrer" aria-label="Jooblie on Instagram">
              <Instagram size={17} />
            </a>
            {supportEmail && <a href={`mailto:${supportEmail}`} aria-label="Email Jooblie"><Mail size={17} /></a>}
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
        <span>© {new Date().getFullYear()} Jooblie. All rights reserved.</span>
        <span>One platform. Specialist hiring journeys.</span>
      </div>
    </footer>
  );
}
