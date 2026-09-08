import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signIn } from '../../shared/lib/data';
import Logo from '../../shared/components/Logo';
import Reveal from '../../shared/components/Reveal';
import { useAuth, dashboardPathForRole } from '../../shared/context/AuthContext';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  const submit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError('');

    const { data, error: authError } = await signIn(email, password);

    if (authError || !data?.session) {
      setError('Sign in failed. Check your email and password.');
      setLoading(false);
      return;
    }

    const profile = await auth.refreshProfile(data.session);
    const fallback = dashboardPathForRole(profile?.role);
    const target = location.state?.from || fallback;

    // Loading ko false nahi kar rahe taake spinner chalta rahe jab tak naya page load na ho jaye
    navigate(target, { replace: true });
  };

  return (
    <AuthShell
      title="Welcome back"
      text="Sign in to continue with your Jooblie account."
    >
      {/* Inline CSS for the circular spinner and overlay */}
      <style>{`
        .auth-form-wrapper {
          position: relative;
        }
        .spinner-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(2px);
          z-index: 10;
          border-radius: 8px;
        }
        .circular-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #eef2f9;
          border-top-color: #2557a7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }
        .spinner-overlay p {
          margin: 0;
          color: #2557a7;
          font-weight: 600;
          font-size: 0.95rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .faded-form {
          opacity: 0.4;
          pointer-events: none;
        }
      `}</style>

      <div className="auth-form-wrapper">
        {loading && (
          <div className="spinner-overlay">
            <div className="circular-spinner"></div>
            <p>Authenticating...</p>
          </div>
        )}

        <form onSubmit={submit} className={`auth-form ${loading ? 'faded-form' : ''}`}>
          {error && <div className="error-banner">{error}</div>}

          <label>
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button
            type="submit"
            className="button button--primary"
            disabled={loading}
          >
            Sign In
          </button>

          <p>
            New to Jooblie? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ title, text, children }) {
  return (
    <section className="auth-page">
      <Reveal className="auth-card is-visible">
        <Logo />
        <span className="eyebrow">Account access</span>
        <h1>{title}</h1>
        <p>{text}</p>
        {children}
      </Reveal>
    </section>
  );
}
