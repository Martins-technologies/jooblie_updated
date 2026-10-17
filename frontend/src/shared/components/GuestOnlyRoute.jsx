import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GuestOnlyRoute({ children }) {
  const auth = useAuth();

  /*
   * Not logged in:
   * Homepage / sign-in / register normal open honge.
   */
  // Render guest forms while session restoration runs in the background.
  // Redirect only once authentication has resolved.
  if (auth.loading || !auth.session) {
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