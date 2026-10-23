import { Link } from 'react-router-dom';
import { SITE_NAME } from '../config/site';

export default function Logo({ variant = 'default', className = '' }) {
  const isLight = variant === 'light' || variant === 'white' || variant === 'inverse';
  const logoSrc = isLight ? '/brand/jooblie-white-text.png' : '/brand/jooblie-source.png';

  return (
    <Link to="/" className={`brand ${className}`.trim()} aria-label={`${SITE_NAME} home`}>
      <span className="jooblie-brand-image">
        <img src={logoSrc} alt={SITE_NAME} width="2545" height="837" />
      </span>
    </Link>
  );
}

