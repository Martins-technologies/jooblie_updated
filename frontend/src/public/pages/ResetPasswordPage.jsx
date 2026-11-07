import { BrandMark } from '../../shared/components/Logo';
import { useRef, useState } from 'react';
import { SITE_NAME } from '../../shared/config/site';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { showErrorToast, showSuccessToast } from '../../shared/lib/toast';
import { applyFormErrors, clearFieldError, validateForm } from '../../shared/lib/formValidation';
import { 
  ArrowLeft, 
  Briefcase, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import resetHeroImg from '../../assets/images/forgot-hero.jpg';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const pending = useRef(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pending.current || !validateForm(e.currentTarget)) return;

    if (password !== confirmPassword) {
      applyFormErrors(e.currentTarget, { details: { fieldErrors: { confirmPassword: ['Passwords do not match.'] } } });
      return;
    }

    if (!supabase) {
      showErrorToast('Supabase authentication is not configured.');
      return;
    }

    pending.current = true;
    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        showErrorToast(updateError, 'Failed to update password. Your reset link may have expired.');
      } else {
        showSuccessToast('Password updated successfully! You can now sign in.');
        setSuccess(true);
      }
    } catch (err) {
      showErrorToast(err, 'An unexpected error occurred. Please try again.');
    } finally {
      pending.current = false;
      setLoading(false);
    }
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

      {/* Main Workspace Layout */}
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
                Set your<br />
                <span className="jb-hero-accent">new password</span><br />
                securely.
              </h1>
              <p className="jb-hero-desc">
                Choose a strong password to protect your {SITE_NAME} account and candidate profile.
              </p>
            </div>

            {/* Photo Card */}
            <div className="jb-visual-frame">
              <img width="960" height="1100" decoding="async" src={resetHeroImg} 
                alt="Professional working in modern tech office" 
                className="jb-visual-img"
              />
            </div>

            {/* Creative Micro-Pill Feature Badges */}
            <div className="jb-badges-bar">
              <div className="jb-badge-pill jb-badge-pill--blue">
                <div className="jb-badge-ico jb-badge-ico--blue">
                  <ShieldCheck size={17} strokeWidth={2.4} />
                </div>
                <div className="jb-badge-labels">
                  <span className="jb-badge-sub">Enhanced</span>
                  <span className="jb-badge-main">Session Security</span>
                </div>
              </div>

              <div className="jb-badge-pill jb-badge-pill--emerald">
                <div className="jb-badge-ico jb-badge-ico--emerald">
                  <KeyRound size={16} strokeWidth={2.4} />
                </div>
                <div className="jb-badge-labels">
                  <span className="jb-badge-sub">Encrypted</span>
                  <span className="jb-badge-main">Password Storage</span>
                </div>
              </div>

              <div className="jb-badge-pill jb-badge-pill--purple">
                <div className="jb-badge-ico jb-badge-ico--purple">
                  <Briefcase size={16} strokeWidth={2.4} />
                </div>
                <div className="jb-badge-labels">
                  <span className="jb-badge-sub">Immediate</span>
                  <span className="jb-badge-main">Account Restore</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Reset Password Card */}
          <section className="jb-card-panel">
            <div className="jb-auth-card">
              <div className="jb-card-head">
                <span className="jb-eyebrow-tag">CREDENTIAL UPDATE</span>
                <h2 className="jb-card-heading">Choose new password</h2>
                <p className="jb-card-subtext">
                  Enter your new password below. It must be at least 8 characters long.
                </p>
              </div>

              {success ? (
                <div className="jb-success-box">
                  <div className="jb-success-icon-wrap">
                    <CheckCircle2 size={44} color="#16a34a" strokeWidth={2.4} />
                  </div>
                  <h3 className="jb-success-title">Password Updated</h3>
                  <p className="jb-success-text">
                    Your password has been changed successfully. You can now access your {SITE_NAME} workspace with your new credentials.
                  </p>
                  <Link to="/sign-in" className="jb-primary-action-btn" style={{ textDecoration: 'none', display: 'flex', marginTop: '22px' }}>
                    Proceed to Sign In
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="jb-card-form">
                  <div className="jb-field-block">
                    <label htmlFor="new-pass" className="jb-field-label">New password</label>
                    <div className="jb-control-wrap">
                      <Lock size={16} strokeWidth={2} className="jb-control-icon" />
                      <input
                        id="new-pass"
                        name="password"
                        autoComplete="new-password"
                        maxLength={200}
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearFieldError(e.currentTarget.form?.elements.namedItem('confirmPassword')); }}
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

                  <div className="jb-field-block">
                    <label htmlFor="conf-pass" className="jb-field-label">Confirm new password</label>
                    <div className="jb-control-wrap">
                      <Lock size={16} strokeWidth={2} className="jb-control-icon" />
                      <input
                        id="conf-pass"
                        name="confirmPassword"
                        autoComplete="new-password"
                        maxLength={200}
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="jb-control-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="jb-eye-toggle"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="jb-primary-action-btn"
                    style={{ marginTop: '8px' }}
                  >
                    {loading ? (
                      <span className="jb-btn-loading">
                        <span className="jb-spinner" />
                        Updating password...
                      </span>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              )}

              <div className="jb-card-foot">
                <Link to="/sign-in" className="jb-back-action-link">
                  <ArrowLeft size={14} strokeWidth={2.2} />
                  <span>Return to sign in</span>
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
          margin-bottom: 22px;
        }

        .jb-eyebrow-tag {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.1px;
          color: #0066f5;
          text-transform: uppercase;
          background: #edf5ff;
          padding: 3px 8px;
          border-radius: 6px;
          margin-bottom: 10px;
        }

        .jb-card-heading {
          font-size: 25px;
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

        .jb-success-box {
          text-align: center;
          padding: 12px 6px;
        }

        .jb-success-icon-wrap {
          margin-bottom: 12px;
        }

        .jb-success-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .jb-success-text {
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }

        .jb-card-form {
          display: flex;
          flex-direction: column;
        }

        .jb-field-block {
          margin-bottom: 18px;
        }

        .jb-field-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
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
          margin-top: 22px;
          font-size: 13.5px;
        }

        .jb-back-action-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .jb-back-action-link:hover {
          color: #0066f5;
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
            padding: 16px 20px;
          }

          .jb-app-workspace {
            padding: 10px 20px 30px;
          }

          .jb-auth-card {
            padding: 30px 22px;
            border-radius: 20px;
          }

          .jb-badges-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}

