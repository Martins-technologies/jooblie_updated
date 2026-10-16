import { ArrowRight, Bookmark, BriefcaseBusiness, Check, ChevronRight, MapPin, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { companyName, jobLocation, salaryLabel, humanize } from '../lib/dashboardPresentation';

export function MetricCard({ icon: Icon, value, label, hint, tone = 'blue' }) {
  return <article className={`workspace-metric workspace-metric--${tone}`}><span className="workspace-metric__icon"><Icon size={22} strokeWidth={1.8} /></span><div><strong>{value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString()}</strong><span className="workspace-metric__label">{label}</span>{hint && <small>{hint}</small>}</div></article>;
}
export function PanelHeading({ title, description, to, link = 'View all' }) {
  return <div className="workspace-panel__heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{to && <Link className="workspace-text-link" to={to}>{link}<ArrowRight size={14} /></Link>}</div>;
}
export function Monogram({ name = '', index = 0 }) { return <span className={`workspace-monogram workspace-monogram--${index % 4}`} aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || 'J'}</span>; }
export function JobPreviewCard({ job, index, saved, saving, onSave }) {
  const name = companyName(job);
  return <article className="workspace-job"><div className="workspace-job__top"><Monogram name={name} index={index} /><span className="workspace-job__company">{name}</span><button type="button" className="workspace-save" aria-label={`${saved ? 'Unsave' : 'Save'} ${job.title}`} aria-pressed={saved} disabled={saving} onClick={() => onSave(job.id)}>{saved ? <Check size={15} /> : <Bookmark size={15} />}</button></div><h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3><div className="workspace-job__meta"><span><MapPin size={12} />{jobLocation(job)}</span><span><BriefcaseBusiness size={12} />{humanize(job.employment_type) || 'Job'}</span></div><div className="workspace-job__footer"><strong>{salaryLabel(job)}</strong><Link to={`/jobs/${job.id}`} className="workspace-text-link">View job<ArrowRight size={13} /></Link></div></article>;
}
export function StatusBadge({ status }) { return <span className={`workspace-status workspace-status--${status || 'unknown'}`}>{humanize(status || 'submitted')}</span>; }
export function WorkspaceEmpty({ children, to, action }) { return <div className="workspace-empty"><Search size={25} /><span>{children}</span>{to && <div style={{ marginTop: 12 }}><Link to={to} className="workspace-text-link">{action || 'Explore jobs'}<ChevronRight size={13} /></Link></div>}</div>; }
