import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import useScrollReveal from '../hooks/useScrollReveal';

export default function SiteLayout() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;

  useScrollReveal(routeKey);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Header />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
