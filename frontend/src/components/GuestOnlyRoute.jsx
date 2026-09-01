import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GuestOnlyRoute({ children }) {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="route-loader" role="status">
        <span className="route-loader__spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  /*
   * Not logged in:
   * Homepage / sign-in / register normal open honge.
   */
  if (!auth.session) {
    return children;
  }

  /*
   * Logged in:
   * Homepage/sign-in/register access nahi.
   * Direct dashboard.
   */
  return (
    <Navigate
      to={auth.dashboardPath}
      replace
    />
  );
}