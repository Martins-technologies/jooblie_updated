import {Link} from 'react-router-dom';
import {SITE_NAME} from '../config/site';
export default function Logo(){return <Link to="/" className="brand" aria-label={`${SITE_NAME} home`}><span className="jooblie-brand-image"><img src="/brand/jooblie-source.png" alt={SITE_NAME} width="4500" height="4500"/></span></Link>}
