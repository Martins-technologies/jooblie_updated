import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, LayoutDashboard } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/all-jobs', label: 'Find Jobs' },
  { to: '/post-job', label: 'Post a Job', roles: ['recruiter', 'admin'] },
  { to: '/companies', label: 'Companies' },
  { to: '/resources', label: 'Resources' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const auth = useAuth();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || (auth.role && item.roles.includes(auth.role)),
  );

  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <header className="site-header">
      <div className="container header__inner">
        <Logo />

        <nav className="desktop-nav" aria-label="Primary navigation">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header__actions">
          {auth.session ? (
            <>
              <Link
                className="nav-link desktop-only header-dashboard-link"
                to={auth.dashboardPath}
              >
                <LayoutDashboard size={16} />
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
            <Link className="nav-link desktop-only" to="/sign-in">
              Sign In
            </Link>
          )}

          {auth.role === 'recruiter' || auth.role === 'admin' ? (
            <Link
              to="/post-job"
              className="button button--primary button--small desktop-only"
            >
              Post a Job <ChevronDown size={15} />
            </Link>
          ) : !auth.session ? (
            <Link
              to="/register?role=recruiter"
              className="button button--primary button--small desktop-only"
            >
              Hire Talent <ChevronDown size={15} />
            </Link>
          ) : null}

          <button
            type="button"
            className="mobile-menu-button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-nav-wrap">
          <nav className="container mobile-nav" aria-label="Mobile navigation">
            {visibleNavItems.map((item) => (
              <Link key={item.to} to={item.to}>
                {item.label}
              </Link>
            ))}

            {auth.session ? (
              <>
                <Link to={auth.dashboardPath}>Dashboard</Link>
                <button type="button" onClick={handleSignOut}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/sign-in">Sign In</Link>
                <Link to="/register?role=recruiter" className="button button--primary">
                  Hire Talent
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
