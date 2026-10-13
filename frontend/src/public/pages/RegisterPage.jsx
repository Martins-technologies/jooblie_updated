import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { signUp } from '../../shared/lib/data';
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
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
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
      company_name: companyName,
      company_website: companyWebsite,
      company_registration_number: companyRegistrationNumber,
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

          {role === 'recruiter' && (
            <div className="recruiter-signup-company">
              <h3>Company details</h3>
              <p>Jobs posted from this account will always belong to this company. The company cannot be changed from the job posting form.</p>
              <label>
                Company name
                <input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Acme Technologies Inc." />
              </label>
              <label>
                Company website
                <input required type="url" value={companyWebsite} onChange={(event) => setCompanyWebsite(event.target.value)} placeholder="https://example.com" />
              </label>
              <label>
                Company registration number
                <input required value={companyRegistrationNumber} onChange={(event) => setCompanyRegistrationNumber(event.target.value)} placeholder="Business registration / incorporation number" />
              </label>
            </div>
          )}

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
            {state.loading ? <><span className="spinner spinner--light" /> Creating account...</> : 'Create Account'}
          </button>

          <p>
            Already registered? <Link to="/sign-in">Sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
