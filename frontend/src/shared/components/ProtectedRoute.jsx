import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SkeletonContent from './Skeleton';
import DashboardLoading from './DashboardLoading';

export default function ProtectedRoute({ roles, children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return <DashboardLoading pathname={location.pathname} role={auth.role || (roles?.length===1?roles[0]:undefined)}/>;
  }

  if (!auth.session) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(auth.role)) {
    return <Navigate to={auth.dashboardPath} replace />;
  }

  return children;
}
