import { Link } from 'react-router-dom';
import { IS_HEALTH_PORTAL, SITE_NAME } from '../config/site';

export function BrandMark({ light = false }) {
  if (IS_HEALTH_PORTAL) return <strong style={{ color: 'inherit' }}>{SITE_NAME}</strong>;
  const logoSrc = light ? '/brand/jooblie-white-text.png' : '/brand/jooblie-source.png';
  return <span className="jooblie-brand-image"><img src={logoSrc} alt={SITE_NAME} width="2545" height="837" /></span>;
}

export default function Logo({ variant = 'default', className = '' }) {
  const isLight = variant === 'light' || variant === 'white' || variant === 'inverse';

  return (
    <Link to="/" className={`brand ${className}`.trim()} aria-label={`${SITE_NAME} home`}>
      <BrandMark light={isLight} />
    </Link>
  );
}


