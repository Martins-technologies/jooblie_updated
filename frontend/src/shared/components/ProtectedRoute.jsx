import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLoading from './DashboardLoading';

export default function ProtectedRoute({ roles, children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return <DashboardLoading pathname={location.pathname} role={auth.role || (roles?.length===1?roles[0]:undefined)}/>;
  }

  if (!auth.session) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!auth.role) {
    return (
      <main className="container section" role="alert">
        <h1>We could not load your account</h1>
        <p>Try again to reconnect to your workspace.</p>
        <button className="button button--primary" type="button" onClick={() => auth.refreshProfile()}>Try again</button>
        <button className="button button--secondary" type="button" onClick={() => auth.signOut().catch(() => null)}>Sign out</button>
      </main>
    );
  }

  if (roles?.length && !roles.includes(auth.role)) {
    return <Navigate to={auth.dashboardPath} replace />;
  }

  return children;
}

