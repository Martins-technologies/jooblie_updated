import { BriefcaseBusiness } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Logo({ compact = false }) {
  return (
    <Link to="/" className="brand" aria-label="Jooblie home">
      <span className="brand__mark"><BriefcaseBusiness size={18} strokeWidth={2.4} /></span>
      {!compact && <span className="brand__text">Jooblie</span>}
    </Link>
  );
}
