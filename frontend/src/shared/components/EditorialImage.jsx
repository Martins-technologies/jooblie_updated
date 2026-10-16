import seeker from '../assets/images/cta/05_for_job_seekers.webp';
import workplace from '../assets/images/cta/04_for_employers.webp';
export default function EditorialImage({kind='workplace'}){return <figure className="editorial-image"><img src={kind==='seeker'?seeker:workplace} alt={kind==='seeker'?'A professional considering their next career opportunity':'Professionals working together in a modern workplace'} width="960" height="640" loading="lazy" decoding="async"/><figcaption>Illustrative workplace photography</figcaption></figure>}
