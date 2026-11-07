import { BrandMark } from './Logo';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CircleHelp, LayoutDashboard, BriefcaseBusiness, Bookmark, FileText, Building2, Users, ScrollText, Search, UserRound, Settings, LogOut, Menu, X, ChevronDown, ExternalLink, Globe2, Laptop, HeartHandshake, Stethoscope, Tractor, UserPlus, ArrowRight, Bell, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SITE_NAME } from '../config/site';
import WorkspaceAccountTools from './WorkspaceAccountTools';
import DashboardSearch from './DashboardSearch';
import '../../admin/styles/admin.css';
import '../styles/dashboard.css';
import '../styles/workspace.css';
import '../styles/tables.css';

const homes = { job_seeker: '/dashboard/job-seeker', recruiter: '/dashboard/recruiter', admin: '/dashboard/admin' };
const roleLabels = { job_seeker: 'Job seeker', recruiter: 'Recruiter', admin: 'Administrator' };
const navigation = {
  job_seeker: [['Overview', '/dashboard/job-seeker', LayoutDashboard], ['Find jobs', '/dashboard/job-seeker/jobs', Search], ['My applications', '/dashboard/job-seeker/applications', FileText], ['Saved jobs', '/dashboard/job-seeker/saved', Bookmark], ['My profile', '/dashboard/job-seeker/profile', UserRound]],
  recruiter: [['Overview', '/dashboard/recruiter', LayoutDashboard], ['My jobs', '/my-jobs', BriefcaseBusiness], ['Candidates', '/candidates', Users], ['Post a job', '/post-job', FileText], ['Company profile', '/my-company', Building2]],
  admin: [['Overview', '/dashboard/admin', LayoutDashboard], ['Jobs', '/admin/jobs', BriefcaseBusiness], ['Review queue', '/admin/moderation', FileText], ['Mississauga leads', '/admin/registrations', UserPlus], ['Users', '/admin/users', Users], ['Companies', '/admin/companies', Building2], ['Portals', '/admin/portals', Globe2], ['Applications', '/admin/applications', FileText], ['Activity log', '/admin/activity', ScrollText], ['Security events', '/admin/security', ShieldCheck]],
};
const portals = [
  ['Office Jobline', Building2, import.meta.env.VITE_OFFICE_JOBS_URL], ['IT Jobline', Laptop, import.meta.env.VITE_IT_JOBS_URL],
  ['ServiceCare', HeartHandshake, import.meta.env.VITE_SERVICE_CARE_URL], ['Health Care', Stethoscope, import.meta.env.VITE_HEALTH_CARE_URL],
  ['FarmerFreight', Tractor, import.meta.env.VITE_FARMERFREIGHT_URL], ['Aboriginal Jobline', Users, import.meta.env.VITE_ABORIGINAL_URL],
  ['Newcomer Jobline', UserPlus, import.meta.env.VITE_NEWCOMERS_URL],
].filter(([, , url]) => /^https?:\/\//i.test(url || ''));

export default function DashboardLayout({ title, subtitle, children, actions, overrideRole }) {
  const { profile, role: authRole, signOut } = useAuth();
  const location = useLocation();
  const role = overrideRole || authRole || (location.pathname.startsWith('/admin') ? 'admin' : (location.pathname.startsWith('/dashboard/recruiter') || ['/my-jobs', '/candidates', '/post-job', '/my-company'].some(p => location.pathname.startsWith(p))) ? 'recruiter' : 'job_seeker');
  const [mobileOpen, setMobileOpen] = useState(false), [networkOpen, setNetworkOpen] = useState(false), [signingOut, setSigningOut] = useState(false);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 800);
  const sidebar = useRef(null), menuButton = useRef(null);
  const home = homes[role] || homes.job_seeker;
  const settings = role === 'job_seeker' ? '/dashboard/job-seeker/settings' : '/settings';
  const name = profile?.full_name?.trim() || profile?.email?.split('@')[0] || 'Your account';
  const overview = location.pathname === home;
  const activeLabel = (navigation[role] || []).find(([, path]) => location.pathname === path || (path !== home && location.pathname.startsWith(path + '/')))?.[0] || title || 'Workspace';
  const cta = role === 'recruiter' ? { title: 'Build your next great team.', text: 'Connect your next opportunity with the right people.', label: 'Post a job', to: '/post-job' } : role === 'admin' ? { title: 'A trusted jobs network.', text: 'Keep opportunities relevant and the community growing.', label: 'Review jobs', to: '/admin/moderation' } : { title: 'Your next chapter starts here.', text: 'Find an opportunity that moves you forward.', label: 'Explore jobs', to: '/dashboard/job-seeker/jobs' };
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { const resize = () => { setNarrow(window.innerWidth <= 800); if (window.innerWidth > 800) setMobileOpen(false); }; window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const first = sidebar.current?.querySelector('a,button'); first?.focus();
    const keyboard = event => {
      if (event.key === 'Escape') { setMobileOpen(false); menuButton.current?.focus(); }
      if (event.key !== 'Tab') return;
      const focusable = [...sidebar.current.querySelectorAll('a,button:not(:disabled)')].filter(el => el.getClientRects().length);
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0]?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); };
  }, [mobileOpen]);
  const logout = async () => { if (signingOut) return; setSigningOut(true); try { await signOut(); } catch { /* shared auth reports failures */ } finally { setSigningOut(false); } };
  return <div className={`jd-app workspace workspace--${role || 'account'}`}>
    {mobileOpen && <button className="jd-overlay" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside ref={sidebar} className={`jd-sidebar${mobileOpen ? ' is-open' : ''}`} aria-label="Workspace navigation" aria-hidden={narrow && !mobileOpen ? true : undefined} inert={narrow && !mobileOpen ? '' : undefined}>
      <div className="jd-sidebar-brand"><Link to={home} className="jd-brand"><BrandMark /></Link><button type="button" className="jd-close-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
      <div className="jd-workspace-label"><span className="workspace-dot" />{roleLabels[role] || 'Your'} workspace</div>
      <div className="jd-sidebar-scroll">
        <span className="jd-section-label">Workspace</span><nav className="jd-nav" aria-label="Main navigation">{(navigation[role] || []).map(([label, path, Icon], index) => <NavLink key={path} to={path} end={index === 0} className={({ isActive }) => `jd-nav-link${isActive ? ' is-active' : ''}`}><Icon size={19} strokeWidth={1.8} /><span>{label}</span><ChevronRight className="jd-nav-arrow" size={14} /></NavLink>)}</nav>
        <section className="jd-network-section"><button type="button" className="jd-network-toggle" aria-expanded={networkOpen} onClick={() => setNetworkOpen(value => !value)}><span><Globe2 size={16} />Jooblie network</span><ChevronDown size={14} className={networkOpen ? 'is-open' : ''} /></button>{networkOpen && <div className="jd-network-list"><Link className="jd-network-item" to="/all-jobs"><Globe2 size={16} /><span>Explore all jobs</span><ArrowRight size={13} /></Link>{portals.map(([label, Icon, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="jd-network-item"><Icon size={16} /><span>{label}</span><ExternalLink size={12} /></a>)}</div>}</section>
      </div>
      <div className="jd-sidebar-footer jd-account-footer"><h2 className="jd-account-heading">My account</h2><Link to="/account/profile" className="jd-account-link"><span className="jd-user-avatar">{name.slice(0,1).toUpperCase()}</span><span className="jd-account-name">{name}</span></Link><Link to="/account/help" className="jd-footer-link"><CircleHelp size={17}/><span>Help</span></Link><NavLink to={settings} className="jd-footer-link"><Settings size={17}/><span>Settings</span></NavLink><button type="button" className="jd-signout" disabled={signingOut} onClick={logout}><LogOut size={17}/><span>{signingOut?'Logging out…':'Log Out'}</span></button></div>
    </aside>
    <div className="jd-main">
      <header className="workspace-topbar"><div className="workspace-topbar__trail"><button ref={menuButton} className="workspace-menu" type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={22} /></button><span className="workspace-topbar__section">Workspace</span><ChevronRight size={13} /><strong>{activeLabel}</strong></div><div className="workspace-topbar__tools"><DashboardSearch key={`${role}:${profile?.id || 'account'}`} role={role} pages={[...(navigation[role] || []),['Settings',settings,Settings]]}/><WorkspaceAccountTools key={profile?.id || role} name={name} settings={settings} onSignOut={logout} signingOut={signingOut}/></div></header>
      <main className="jd-content"><div className="jd-page-heading jd-page-heading--compact"><div className="jd-page-heading-copy"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="jd-page-actions">{actions || (overview && <Link className="button button--primary" to={cta.to}>{role === 'job_seeker' ? <Search size={17} /> : <BriefcaseBusiness size={17} />}{cta.label}</Link>)}</div></div><div className="jd-body">{children}</div><footer className="workspace-footer"><span>Â© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span><Link to="/account/help">Help & support<ArrowRight size={12} /></Link></footer></main>
    </div>
  </div>;
}
export const DashboardIcons = { Bookmark, FileText, Users, ScrollText, BriefcaseBusiness, Building2 };

