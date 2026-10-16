import { BriefcaseBusiness } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../config/site';

export default function Logo({ compact = false }) {
  return (
    <Link to="/" className="brand" aria-label={`${SITE_NAME} home`}>
      <span className="brand__mark"><BriefcaseBusiness size={18} strokeWidth={2.4} /></span>
      {!compact && <span className="brand__text">{SITE_NAME}</span>}
    </Link>
  );
}
