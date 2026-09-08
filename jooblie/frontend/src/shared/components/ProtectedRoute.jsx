import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return (
      <div className="route-loader" role="status">
        <span className="route-loader__spinner" />
        <span>Loading your account...</span>
      </div>
    );
  }

  if (!auth.session) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(auth.role)) {
    return <Navigate to={auth.dashboardPath} replace />;
  }

  return children;
}
