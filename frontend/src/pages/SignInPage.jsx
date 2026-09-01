import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signIn } from '../lib/data';
import Logo from '../components/Logo';
import Reveal from '../components/Reveal';
import { useAuth, dashboardPathForRole } from '../context/AuthContext';

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

    setLoading(false);
    navigate(target, { replace: true });
  };

  return (
    <AuthShell
      title="Welcome back"
      text="Sign in to continue with your Jooblie account."
    >
      <form onSubmit={submit} className="auth-form">
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
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p>
          New to Jooblie? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, text, children }) {
  return (
    <section className="auth-page">
      <Reveal className="auth-card">
        <Logo />
        <span className="eyebrow">Account access</span>
        <h1>{title}</h1>
        <p>{text}</p>
        {children}
      </Reveal>
    </section>
  );
}
