import { useState } from 'react';

import {
  Link,
  NavLink,
} from 'react-router-dom';

import {
  LayoutDashboard,
  BriefcaseBusiness,
  Bookmark,
  FileText,
  Building2,
  Users,
  ScrollText,
  Search,
  UserRound,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  Globe2,
  Laptop,
  HeartHandshake,
  Stethoscope,
  Tractor,
  UserPlus,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import '../styles/dashboard.css';

const homeByRole = {
  job_seeker: '/dashboard/job-seeker',
  recruiter: '/dashboard/recruiter',
  admin: '/dashboard/admin',
};

const roleLabels = {
  job_seeker: 'Job Seeker',
  recruiter: 'Recruiter',
  admin: 'Administrator',
};

const linksByRole = {
  job_seeker: [
    {
      to: '/dashboard/job-seeker',
      label: 'Overview',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/dashboard/job-seeker/jobs',
      label: 'Find Jobs',
      icon: Search,
    },
    {
      to: '/dashboard/job-seeker/applications',
      label: 'My Applications',
      icon: FileText,
    },
    {
      to: '/dashboard/job-seeker/saved',
      label: 'Saved Jobs',
      icon: Bookmark,
    },
    {
      to: '/dashboard/job-seeker/profile',
      label: 'My Profile',
      icon: UserRound,
    },
  ],

  recruiter: [
    {
      to: '/dashboard/recruiter',
      label: 'Overview',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/my-jobs',
      label: 'My Jobs',
      icon: BriefcaseBusiness,
    },
    {
      to: '/candidates',
      label: 'Candidates',
      icon: Users,
    },
    {
      to: '/post-job',
      label: 'Post a Job',
      icon: FileText,
    },
    {
      to: '/my-company',
      label: 'Company Profile',
      icon: Building2,
    },
  ],

  // YAHAN ADMIN KE LINKS UPDATE KIYE HAIN
  admin: [
    {
      to: '/dashboard/admin',
      label: 'Overview',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/admin/moderation',
      label: 'Job Moderation',
      icon: BriefcaseBusiness,
    },
    {
      to: '/admin/users',
      label: 'Users',
      icon: Users,
    },
    {
      to: '/admin/registrations',
      label: 'Mississauga Leads',
      icon: UserPlus,
    },
    {
      to: '/admin/activity',
      label: 'System & Activity',
      icon: ScrollText,
    },
  ],
};

// YAHAN ADMIN KA SETTINGS PATH BHI UPDATE KIYA HAI
const settingsByRole = {
  job_seeker: '/dashboard/job-seeker/settings',
  recruiter: '/settings', 
  admin: '/settings',
};

const networkPortals = [
  {
    key: 'jooblie',
    label: 'Jooblie',
    subtitle: 'All Jobs',
    icon: Globe2,
    internal: true,
  },
  {
    key: 'office-jobs',
    label: 'Office Jobline',
    subtitle: 'Office & Administration',
    icon: Building2,
    url: import.meta.env.VITE_OFFICE_JOBS_URL || '',
  },
  {
    key: 'it-jobs',
    label: 'IT Jobline',
    subtitle: 'Technology Jobs',
    icon: Laptop,
    url: import.meta.env.VITE_IT_JOBS_URL || '',
  },
  {
    key: 'service-care',
    label: 'ServiceCare',
    subtitle: 'Hospitality & Service',
    icon: HeartHandshake,
    url: import.meta.env.VITE_SERVICE_CARE_URL || '',
  },
  {
    key: 'health-care',
    label: 'Health Care',
    subtitle: 'Healthcare Jobs',
    icon: Stethoscope,
    url: import.meta.env.VITE_HEALTH_CARE_URL || '',
  },
  {
    key: 'farmerfreight',
    label: 'FarmerFreight',
    subtitle: 'Transport & Farming',
    icon: Tractor,
    url: import.meta.env.VITE_FARMERFREIGHT_URL || '',
  },
  {
    key: 'aboriginal',
    label: 'Aboriginal Jobline',
    subtitle: 'Audience Portal',
    icon: Users,
    url: import.meta.env.VITE_ABORIGINAL_URL || '',
  },
  {
    key: 'newcomers',
    label: 'Newcomer Jobline',
    subtitle: 'Audience Portal',
    icon: UserPlus,
    url: import.meta.env.VITE_NEWCOMERS_URL || '',
  },
];

export default function DashboardLayout({
  title,
  subtitle,
  children,
  actions,
}) {
  const {
    profile,
    role,
    signOut,
  } = useAuth();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    networkOpen,
    setNetworkOpen,
  ] = useState(true);

  const links =
    linksByRole[role] || [];

  const dashboardHome =
    homeByRole[role] ||
    '/dashboard/job-seeker';

  const settingsPath =
    settingsByRole[role] ||
    dashboardHome;

  const fullName =
    profile?.full_name?.trim() ||
    profile?.email?.split('@')?.[0] ||
    'Jooblie User';

  const avatarLetter =
    fullName
      .slice(0, 1)
      .toUpperCase();

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error(
        'Sign out failed:',
        error
      );
    }
  };

  const handleSectionClick = (
    event,
    href
  ) => {
    closeMobile();

    if (!href?.startsWith('#')) {
      return;
    }

    const target =
      document.querySelector(href);

    if (!target) {
      return;
    }

    event.preventDefault();

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="jd-app">

      {/* MOBILE HEADER */}
      <header className="jd-mobile-header">
        <Link
          to={dashboardHome}
          className="jd-mobile-brand"
          onClick={closeMobile}
        >
          <span className="jooblie-brand-image"><img src="/brand/jooblie-source.png" alt="Jooblie" width="4500" height="4500"/></span>
        </Link>

        <button
          type="button"
          className="jd-menu-button"
          onClick={() =>
            setMobileOpen(true)
          }
        >
          <Menu size={23} />
        </button>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="jd-overlay"
          onClick={closeMobile}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={
          `jd-sidebar${
            mobileOpen
              ? ' is-open'
              : ''
          }`
        }
      >
        {/* LOGO */}
        <div className="jd-sidebar-brand">
          <Link
            to={dashboardHome}
            className="jd-brand"
            onClick={closeMobile}
          >
            <span className="jooblie-brand-image"><img src="/brand/jooblie-source.png" alt="Jooblie" width="4500" height="4500"/></span>
          </Link>

          <button
            type="button"
            className="jd-close-button"
            onClick={closeMobile}
          >
            <X size={21} />
          </button>
        </div>

        {/* USER */}
        <div className="jd-user">
          <span className="jd-user-avatar">
            {avatarLetter}
          </span>
          <div className="jd-user-copy">
            <strong>
              {fullName}
            </strong>
            <span>
              {roleLabels[role] || 'Account'}
            </span>
          </div>
        </div>

        {/* NAV */}
        <div className="jd-sidebar-scroll">
          <section className="jd-menu-section">
            <span className="jd-section-label">
              Workspace
            </span>

            <nav className="jd-nav">
              {links.map(
                ({
                  to,
                  href,
                  label,
                  icon: Icon,
                  end = false,
                }) => {
                  if (href) {
                    return (
                      <a
                        key={href}
                        href={href}
                        className="jd-nav-link"
                        onClick={(event) =>
                          handleSectionClick(
                            event,
                            href
                          )
                        }
                      >
                        <Icon size={18} />
                        <span>
                          {label}
                        </span>
                      </a>
                    );
                  }

                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={closeMobile}
                      className={({ isActive }) =>
                        `jd-nav-link${
                          isActive
                            ? ' is-active'
                            : ''
                        }`
                      }
                    >
                      <Icon size={18} />
                      <span>
                        {label}
                      </span>
                    </NavLink>
                  );
                }
              )}
            </nav>
          </section>

          {/* NETWORK */}
          <section className="jd-menu-section">
            <button
              type="button"
              className="jd-network-toggle"
              onClick={() =>
                setNetworkOpen(
                  (current) => !current
                )
              }
            >
              <span>
                <Globe2 size={15} />
                Jooblie Network
              </span>
              <ChevronDown
                size={15}
                className={
                  networkOpen
                    ? 'is-open'
                    : ''
                }
              />
            </button>

            {networkOpen && (
              <div className="jd-network-list">
                {networkPortals.map(
                  ({
                    key,
                    label,
                    subtitle: portalSubtitle,
                    icon: Icon,
                    url,
                    internal,
                  }) => {
                    if (internal) {
                      return (
                        <Link
                          key={key}
                          to={dashboardHome}
                          className="jd-network-item"
                          onClick={closeMobile}
                        >
                          <span className="jd-network-icon">
                            <Icon size={16} />
                          </span>

                          <span className="jd-network-copy">
                            <strong>
                              {label}
                            </strong>
                            <small>
                              {portalSubtitle}
                            </small>
                          </span>
                        </Link>
                      );
                    }

                    if (!url) {
                      return null;
                    }

                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="jd-network-item"
                      >
                        <span className="jd-network-icon">
                          <Icon size={16} />
                        </span>

                        <span className="jd-network-copy">
                          <strong>
                            {label}
                          </strong>
                          <small>
                            {portalSubtitle}
                          </small>
                        </span>

                        <ExternalLink
                          size={12}
                          className="jd-external-icon"
                        />
                      </a>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>

        {/* SIMPLE FOOTER */}
        <div className="jd-sidebar-footer">
          <NavLink
            to={settingsPath}
            onClick={closeMobile}
            className={({ isActive }) =>
              `jd-footer-link${isActive ? ' is-active' : ''}`
            }
          >
            <Settings size={18} />
            <span>
              Settings
            </span>
          </NavLink>

          <button
            type="button"
            className="jd-signout"
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            <span>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="jd-main">
        <div className="jd-content">
          <div className="jd-page-heading">
            <div className="jd-page-heading-copy">
              <span className="jd-eyebrow">
                Jooblie Dashboard
              </span>
              <h1>
                {title}
              </h1>
              {subtitle && (
                <p>
                  {subtitle}
                </p>
              )}
            </div>

            {actions && (
              <div className="jd-page-actions">
                {actions}
              </div>
            )}
          </div>

          <div className="jd-body">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}

export const DashboardIcons = {
  Bookmark,
  FileText,
  Users,
  ScrollText,
  BriefcaseBusiness,
  Building2,
};
