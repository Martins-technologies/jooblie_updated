import { BrandMark } from '../../shared/components/Logo';
import { useRef, useState } from 'react';
import { SITE_NAME } from '../../shared/config/site';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signIn } from '../../shared/lib/data';
import { useAuth, dashboardPathForRole } from '../../shared/context/AuthContext';
import { showErrorToast, showSuccessToast } from '../../shared/lib/toast';
import { validateForm } from '../../shared/lib/formValidation';
import { 
  ArrowLeft, 
  Briefcase, 
  ShieldCheck, 
  TrendingUp, 
  Mail, 
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import loginHeroImg from '../../assets/images/login-hero.jpg';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current || !validateForm(event.currentTarget)) return;
    pending.current = true;

    setLoading(true);

    try {
      const { data, error: authError } = await signIn(email.trim(), password);

      if (authError || !data?.session) {
        showErrorToast(authError, 'Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }

      showSuccessToast('Signed in successfully! Welcome back.');
      const profile = await auth.refreshProfile(data.session);
      const fallback = dashboardPathForRole(profile?.role);
      const target = location.state?.from || fallback;

      navigate(target, { replace: true });
    } catch (err) {
      showErrorToast(err, 'Could not complete sign in. Please try again.');
      setLoading(false);
    } finally { pending.current = false; }
  };

  return (
    <div className="jb-app-auth">
      {/* Top Application Header */}
      <header className="jb-app-nav">
        <Link to="/" className="jb-app-brand" aria-label={`${SITE_NAME} Home`}>
          <BrandMark />
        </Link>

        <Link to="/" className="jb-nav-back">
          <ArrowLeft size={15} strokeWidth={2.2} />
          <span>Back to website</span>
        </Link>
      </header>

      {/* Main App Workspace Layout */}
      <main className="jb-app-workspace">
        <div className="jb-app-stage">
          {/* Left Column: Visual Showcase */}
          <section className="jb-visual-panel">
            <div className="jb-ambient-glow" aria-hidden="true" />
            <div className="jb-dot-matrix" aria-hidden="true">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="jb-dot" />
              ))}
            </div>

            <div className="jb-headline-wrap">
              <h1 className="jb-hero-title">
                Your next<br />
                <span className="jb-hero-accent">opportunity</span><br />
                starts here.
              </h1>
              <p className="jb-hero-desc">
                Sign in to your {SITE_NAME} workspace to manage applications and access matched roles.
              </p>
            </div>

            {/* Photo Card */}
            <div className="jb-visual-frame">
              <img width="960" height="1100" decoding="async" src={loginHeroImg} 
                alt="Two professionals collaborating at a modern desk" 
                className="jb-visual-img"
              />
            </div>

            {/* Creative Micro-Pill Feature Badges */}
            <div className="jb-badges-bar">
              <div className="jb-badge-pill jb-badge-pill--blue">
                <div className="jb-badge-ico jb-badge-ico--blue">
                  <Briefcase size={16} strokeWidth={2.4} />
                </div>
                <div className="jb-badge-labels">
                  <span className="jb-badge-sub">Discover</span>
                  <span className="jb-badge-main">Opportunities</span>
                </div>
              </div>

              <div className="jb-badge-pill jb-badge-pill--emerald">
                <div className="jb-badge-ico jb-badge-ico--emerald">
                  <ShieldCheck size={17} strokeWidth={2.4} />
                </div>
                <div className="jb-badge-labels">
                  <span className="jb-badge-sub">Explore company profiles</span>
                  <span className="jb-badge-main">Employer profiles</span>
                </div>
              </div>

              <div className="jb-badge-pill jb-badge-pill--purple">
                <div className="jb-badge-ico jb-badge-ico--purple">
                  <TrendingUp size={16} strokeWidth={2.4} />
                </div>
                <div className="jb-badge-labels">
                  <span className="jb-badge-sub">Accelerated</span>
                  <span className="jb-badge-main">Career Growth</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Web App Login Card */}
          <section className="jb-card-panel">
            <div className="jb-auth-card">
              <div className="jb-card-head">
                <span className="jb-eyebrow-tag">WORKSPACE LOGIN</span>
                <h2 className="jb-card-heading">Sign in to {SITE_NAME}</h2>
                <p className="jb-card-subtext">Enter your credentials to access your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="jb-card-form">
                <div className="jb-field-block">
                  <label htmlFor="signin-email" className="jb-field-label">Email address</label>
                  <div className="jb-control-wrap">
                    <Mail size={16} strokeWidth={2} className="jb-control-icon" />
                    <input
                      id="signin-email"
                      name="email"
                      maxLength={320}
                      type="email"
                      required
                      placeholder="name@company.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="jb-control-input"
                    />
                  </div>
                </div>

                <div className="jb-field-block">
                  <label htmlFor="signin-password" className="jb-field-label">Password</label>
                  <div className="jb-control-wrap">
                    <Lock size={16} strokeWidth={2} className="jb-control-icon" />
                    <input
                      id="signin-password"
                      name="password"
                      minLength={8}
                      maxLength={200}
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="jb-control-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="jb-eye-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="jb-primary-action-btn"
                >
                  {loading ? (
                    <span className="jb-btn-loading">
                      <span className="jb-spinner" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="jb-card-foot">
                <span className="jb-foot-muted">New to {SITE_NAME}? </span>
                <Link to="/register" className="jb-foot-link">
                  Create an account
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Scoped CSS Styles */}
      <style>{`
        .jb-app-auth {
          min-height: 100vh;
          background: linear-gradient(145deg, #f8faff 0%, #f1f6fe 100%);
          color: #0f172a;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* Top Bar */
        .jb-app-nav {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
          padding: 20px 44px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 10;
        }

        .jb-app-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .jb-brand-mark {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #0066f5 0%, #004ecc 100%);
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 102, 245, 0.25);
        }

        .jb-brand-title {
          font-size: 21px;
          font-weight: 800;
          color: #0066f5;
          letter-spacing: -0.03em;
        }

        .jb-nav-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #475569;
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(226, 232, 240, 0.8);
          backdrop-filter: blur(8px);
          transition: all 0.18s ease;
        }

        .jb-nav-back:hover {
          color: #0066f5;
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        /* Workspace Grid Layout */
        .jb-app-workspace {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 44px 40px;
          position: relative;
          z-index: 5;
        }

        .jb-app-stage {
          width: 100%;
          max-width: 1240px;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 56px;
          align-items: center;
        }

        /* Visual Panel */
        .jb-visual-panel {
          position: relative;
          padding-right: 10px;
        }

        .jb-ambient-glow {
          position: absolute;
          top: 10%;
          left: -15%;
          width: 110%;
          height: 80%;
          background: radial-gradient(circle, rgba(200, 225, 255, 0.6) 0%, rgba(225, 240, 255, 0.1) 70%);
          border-radius: 50%;
          filter: blur(40px);
          z-index: 0;
          pointer-events: none;
        }

        .jb-dot-matrix {
          position: absolute;
          top: 60px;
          right: 28px;
          display: grid;
          grid-template-columns: repeat(6, 5px);
          grid-gap: 12px;
          z-index: 1;
          pointer-events: none;
        }

        .jb-dot {
          width: 5px;
          height: 5px;
          background-color: #93c5fd;
          border-radius: 50%;
          opacity: 0.6;
        }

        .jb-headline-wrap {
          position: relative;
          z-index: 2;
          margin-bottom: 22px;
        }

        .jb-hero-title {
          font-size: clamp(2.3rem, 3.6vw, 3.25rem);
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -0.035em;
          color: #091325;
          margin: 0;
        }

        .jb-hero-accent {
          color: #0066f5;
        }

        .jb-hero-desc {
          margin: 12px 0 0;
          font-size: 14.5px;
          color: #55647c;
          font-weight: 400;
          line-height: 1.45;
        }

        .jb-visual-frame {
          position: relative;
          z-index: 2;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 16px 40px -12px rgba(15, 23, 42, 0.1);
          background: #ffffff;
          aspect-ratio: 16 / 10.2;
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .jb-visual-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Creative Micro-Pill Feature Badges */
        .jb-badges-bar {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 22px;
          flex-wrap: wrap;
        }

        .jb-badge-pill {
          flex: 1;
          min-width: 150px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 13px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(226, 232, 240, 0.85);
          box-shadow: 0 4px 14px -3px rgba(15, 23, 42, 0.04);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .jb-badge-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px -4px rgba(15, 23, 42, 0.08);
        }

        .jb-badge-ico {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .jb-badge-ico--blue {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #0066f5;
        }

        .jb-badge-ico--emerald {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #059669;
        }

        .jb-badge-ico--purple {
          background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
          color: #7c3aed;
        }

        .jb-badge-labels {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
        }

        .jb-badge-sub {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }

        .jb-badge-main {
          font-size: 12.5px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        /* Right Column Card */
        .jb-card-panel {
          position: relative;
          z-index: 3;
          display: flex;
          justify-content: center;
        }

        .jb-auth-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border-radius: 24px;
          padding: 40px 38px 34px;
          box-shadow: 
            0 24px 60px -15px rgba(15, 23, 42, 0.09),
            0 2px 10px rgba(15, 23, 42, 0.02);
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .jb-card-head {
          margin-bottom: 24px;
        }

        .jb-eyebrow-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: #0066f5;
          text-transform: uppercase;
          background: #edf5ff;
          padding: 3px 9px;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .jb-card-heading {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #0f172a;
          margin: 0 0 6px;
        }

        .jb-card-subtext {
          font-size: 13.5px;
          color: #64748b;
          margin: 0;
          line-height: 1.45;
        }

        .jb-alert-banner {
          padding: 10px 14px;
          border-radius: 9px;
          font-size: 13px;
          margin-bottom: 18px;
          background-color: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          line-height: 1.4;
        }

        .jb-card-form {
          display: flex;
          flex-direction: column;
        }

        .jb-field-block {
          margin-bottom: 18px;
        }

        .jb-field-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .jb-field-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }

        .jb-field-label-row .jb-field-label {
          margin-bottom: 0;
        }

        .jb-forgot-action {
          font-size: 12.5px;
          color: #0066f5;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .jb-forgot-action:hover {
          text-decoration: underline;
        }

        .jb-control-wrap {
          display: flex;
          align-items: center;
          height: 46px;
          padding: 0 14px;
          background-color: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 11px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .jb-control-wrap:focus-within {
          border-color: #0066f5;
          box-shadow: 0 0 0 3px rgba(0, 102, 245, 0.14);
        }

        .jb-control-icon {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .jb-control-input {
          flex: 1;
          height: 100%;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          color: #0f172a;
          padding: 0 8px 0 10px;
        }

        .jb-control-input:-webkit-autofill,
        .jb-control-input:-webkit-autofill:hover, 
        .jb-control-input:-webkit-autofill:focus, 
        .jb-control-input:-webkit-autofill:active,
        .jb-control-input:autofill {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #0f172a !important;
          caret-color: #0f172a !important;
          transition: background-color 50000s ease-in-out 0s;
        }

        .jb-control-input::placeholder {
          color: #94a3b8;
          font-size: 13.5px;
        }

        .jb-eye-toggle {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .jb-eye-toggle:hover {
          color: #0066f5;
          background: #f1f5f9;
        }

        .jb-primary-action-btn {
          width: 100%;
          height: 46px;
          margin-top: 6px;
          background: linear-gradient(180deg, #0066f5 0%, #0056d6 100%);
          color: #ffffff;
          border: none;
          border-radius: 11px;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0, 102, 245, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .jb-primary-action-btn:hover:not(:disabled) {
          background: linear-gradient(180deg, #005ce0 0%, #004bc2 100%);
          box-shadow: 0 6px 18px rgba(0, 102, 245, 0.35);
          transform: translateY(-1px);
        }

        .jb-primary-action-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0, 102, 245, 0.25);
        }

        .jb-primary-action-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .jb-btn-loading {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .jb-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: jb-spin 0.8s linear infinite;
        }

        @keyframes jb-spin {
          to { transform: rotate(360deg); }
        }

        .jb-card-foot {
          text-align: center;
          margin-top: 24px;
          font-size: 13.5px;
        }

        .jb-foot-muted {
          color: #64748b;
        }

        .jb-foot-link {
          color: #0066f5;
          font-weight: 600;
          text-decoration: none;
        }

        .jb-foot-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 1024px) {
          .jb-app-stage {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .jb-visual-panel {
            padding-right: 0;
          }

          .jb-dot-matrix {
            display: none;
          }

          .jb-auth-card {
            max-width: 480px;
          }
        }

        @media (max-width: 640px) {
          .jb-app-nav {
            width: 100%;
            gap: 12px;
            padding: 12px 16px;
          }

          .jb-app-workspace {
            width: 100%;
            padding: 4px 16px 24px;
          }

          .jb-app-auth,
          .jb-app-stage,
          .jb-visual-panel,
          .jb-card-panel,
          .jb-auth-card {
            width: 100%;
            min-width: 0;
            max-width: 100%;
          }

          .jb-app-stage {
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
            align-items: stretch;
          }

          .jb-visual-panel {
            padding: 0;
          }

          .jb-headline-wrap {
            margin-bottom: 0;
          }

          .jb-hero-title {
            font-size: clamp(26px, 8vw, 32px);
            line-height: 1.16;
          }

          .jb-hero-desc {
            margin-top: 6px;
            font-size: 13px;
            line-height: 1.5;
          }

          .jb-visual-frame,
          .jb-badges-bar,
          .jb-dot-matrix,
          .jb-ambient-glow {
            display: none;
          }

          .jb-card-panel {
            justify-content: stretch;
          }

          .jb-auth-card {
            padding: 22px 18px;
            border-radius: 18px;
          }

          .jb-card-head {
            margin-bottom: 16px;
          }

          .jb-card-heading {
            font-size: 20px;
            line-height: 1.3;
          }

          .jb-card-subtext,
          .jb-field-label,
          .jb-auth-card p,
          .jb-auth-card a,
          .jb-auth-card button {
            overflow-wrap: anywhere;
          }

          .jb-nav-back {
            min-width: 0;
            max-width: 145px;
            flex-shrink: 1;
            gap: 6px;
            padding: 8px 10px;
            font-size: 12px;
          }
        }

        @media (max-width: 380px) {
          .jb-app-nav {
            padding-inline: 12px;
            gap: 8px;
          }

          .jb-app-workspace {
            padding-inline: 12px;
          }

          .jb-auth-card {
            padding: 20px 15px;
          }

          .jb-nav-back {
            max-width: 132px;
            padding-inline: 8px;
          }
        }
      `}</style>
    </div>
  );
}

// Backwards compatibility export
export function AuthShell({ title, text, children }) {
  return (
    <div className="jb-legacy-auth-shell">
      {children}
    </div>
  );
}

