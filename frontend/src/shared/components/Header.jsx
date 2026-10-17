import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard, ArrowRight, UserPlus } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

const publicNavItems = [
  { to: '/all-jobs', label: 'Browse Jobs' },
  { to: '/companies', label: 'Explore Employers' },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const auth = useAuth();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <header className="site-header">
      <div className="container header__inner">
        <Logo />

        <nav className="desktop-nav" aria-label="Primary navigation">
          {publicNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          {(auth.role === 'recruiter' || auth.role === 'admin') && (
            <NavLink
              to="/post-job"
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              Post a Job
            </NavLink>
          )}
        </nav>

        <div className="header__actions">
          {auth.session ? (
            <>
              <Link
                className="button button--secondary button--small desktop-only header-dashboard-btn"
                to={auth.dashboardPath}
              >
                <LayoutDashboard size={15} />
                Dashboard
              </Link>

              <button
                className="text-button desktop-only"
                type="button"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link className="header-login-link desktop-only" to="/sign-in">
                Login
              </Link>
              <Link
                to="/register"
                className="header-cta-btn desktop-only"
              >
                Sign Up Free <ArrowRight size={14} />
              </Link>
            </>
          )}

          <button
            type="button"
            className="mobile-menu-button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-nav-wrap">
          <nav className="container mobile-nav" aria-label="Mobile navigation">
            {publicNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
            {(auth.role === 'recruiter' || auth.role === 'admin') && (
              <NavLink to="/post-job" className="mobile-nav-link">
                Post a Job
              </NavLink>
            )}

            <div className="mobile-nav-divider" />

            {auth.session ? (
              <>
                <Link to={auth.dashboardPath} className="mobile-nav-link mobile-nav-link--highlight">
                  <LayoutDashboard size={16} /> Open Dashboard
                </Link>
                <button type="button" className="mobile-nav-link" onClick={handleSignOut}>
                  Sign Out
                </button>
              </>
            ) : (
              <div className="mobile-nav-auth">
                <Link to="/sign-in" className="mobile-nav-link">
                  Login
                </Link>
                <Link to="/register" className="button button--primary mobile-auth-cta">
                  <UserPlus size={16} /> Sign Up Free
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
