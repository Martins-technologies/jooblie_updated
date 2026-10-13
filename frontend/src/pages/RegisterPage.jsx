import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { signUp } from '../lib/data';
import { AuthShell } from './SignInPage';

export default function RegisterPage() {
  const [params] = useSearchParams();

  const requestedRole = params.get('role');
  const defaultRole = requestedRole === 'recruiter' || requestedRole === 'employer'
    ? 'recruiter'
    : 'job_seeker';

  const [role, setRole] = useState(defaultRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState({
    loading: false,
    error: '',
    success: false,
  });

  const submit = async (event) => {
    event.preventDefault();

    setState({
      loading: true,
      error: '',
      success: false,
    });

    const { error } = await signUp(email, password, {
      name,
      role,
    });

    setState(
      error
        ? {
            loading: false,
            error: error.message || 'Account creation failed. Please review the details and try again.',
            success: false,
          }
        : {
            loading: false,
            error: '',
            success: true,
          },
    );
  };

  return (
    <AuthShell
      title="Create your Jooblie account"
      text="Choose the account type that matches your hiring journey."
    >
      {state.success ? (
        <div className="success-banner">
          Account created. Check your email if confirmation is required, then sign in.
        </div>
      ) : (
        <form onSubmit={submit} className="auth-form">
          {state.error && <div className="error-banner">{state.error}</div>}

          <label>
            Account type
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="job_seeker">Job seeker</option>
              <option value="recruiter">Recruiter / Employer</option>
            </select>
          </label>

          <label>
            Name
            <input
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

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
              minLength="8"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button
            type="submit"
            className="button button--primary"
            disabled={state.loading}
          >
            {state.loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p>
            Already registered? <Link to="/sign-in">Sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
