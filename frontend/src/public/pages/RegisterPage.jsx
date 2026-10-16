import { useRef, useState } from 'react';
import { SITE_NAME } from '../../shared/config/site';
import { Link, useSearchParams } from 'react-router-dom';
import { signUp } from '../../shared/lib/data';
import { showErrorToast, showSuccessToast } from '../../shared/lib/toast';
import { validateCompanyForm } from '../../shared/lib/companyForm';
import { applyFormErrors, validateForm } from '../../shared/lib/formValidation';
import { 
  ArrowLeft, 
  ArrowRight,
  Briefcase, 
  ShieldCheck, 
  TrendingUp, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  Globe, 
  FileText,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import registerHeroImg from '../../assets/images/register-hero.jpg';

export default function RegisterPage() {
  const [params] = useSearchParams();

  // Job Seeker is always the default checked tab
  const [role, setRole] = useState('job_seeker');
  const [step, setStep] = useState(1); // Step 1: Account credentials, Step 2: Company details (if recruiter)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
  const pending = useRef(false);
  
  const [state, setState] = useState({
    loading: false,
    success: false,
  });

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setStep(1);
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!validateForm(e.currentTarget.form || e.currentTarget)) return;
    setStep(2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current || !validateForm(event.currentTarget)) return;
    if (role === 'recruiter' && step === 1) { handleNextStep(event); return; }
    if (role === 'recruiter') {
      const fieldErrors = validateCompanyForm({ name: companyName, website: companyWebsite, registration_number: companyRegistrationNumber });
      if (Object.keys(fieldErrors).length) {
        const names = { name: 'company_name', website: 'company_website', registration_number: 'company_registration_number' };
        applyFormErrors(event.currentTarget, { code: 'VALIDATION_ERROR', details: { fieldErrors: Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [names[key] || key, value])) } });
        return;
      }
    }

    pending.current = true;
    setState({
      loading: true,
      success: false,
    });

    try {
      const { error } = await signUp(email.trim(), password, {
        name: name.trim(),
        role,
        company_name: role === 'recruiter' ? companyName.trim() : undefined,
        company_website: role === 'recruiter' ? companyWebsite.trim() : undefined,
        company_registration_number: role === 'recruiter' ? companyRegistrationNumber.trim() : undefined,
      });

      if (error) {
        showErrorToast(error, 'Account creation failed. Please check your details and try again.');
        setState({
          loading: false,
          success: false,
        });
      } else {
        showSuccessToast('Account created successfully! Please check your email to verify.');
        setState({
          loading: false,
          success: true,
        });
      }
    } catch (err) {
      showErrorToast(err, 'An unexpected network error occurred.');
      setState({
        loading: false,
        success: false,
      });
    } finally { pending.current = false; }
  };


  return (
    <div className="jb-app-auth">
      {/* Top Application Header */}
      <header className="jb-app-nav">
        <Link to="/" className="jb-app-brand" aria-label={`${SITE_NAME} Home`}>
          <span className="jooblie-brand-image"><img src="/brand/jooblie-source.png" alt="Jooblie" width="4500" height="4500"/></span>
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
                Start your<br />
                <span className="jb-hero-accent">dream career</span><br />
                with {SITE_NAME}.
              </h1>
              <p className="jb-hero-desc">
                Join our modern talent ecosystem where top candidates connect with innovative employers.
              </p>
            </div>

            {/* Photo Card */}
            <div className="jb-visual-frame">
              <img 
                src={registerHeroImg} 
                alt="Talent specialist smiling in bright modern office" 
                className="jb-visual-img"
              />
            </div>

            {/* Creative Micro-Pill Feature Badges */}
            <div className="jb-badges-bar">
              <div className="jb-badge-pill jb-badge-pill--blue">
                <div className="jb-badge-ico jb-badge-ico--blue">
                  <Sparkles size={16} strokeWidth={2.4} />
                </div>
                <div className="jb-badge-labels">
                  <span className="jb-badge-sub">Streamlined</span>
                  <span className="jb-badge-main">Application Process</span>
                </div>
              </div>

              <div className="jb-badge-pill jb-badge-pill--emerald">
                <div className="jb-badge-ico jb-badge-ico--emerald">
                  <ShieldCheck size={17} strokeWidth={2.4} />
                </div>
                <div className="jb-badge-labels">
                  <span className="jb-badge-sub">Verified</span>
                  <span className="jb-badge-main">Top Employers</span>
                </div>
              </div>

              <div className="jb-badge-pill jb-badge-pill--purple">
                <div className="jb-badge-ico jb-badge-ico--purple">
                  <TrendingUp size={16} strokeWidth={2.4} />
                </div>
                <div className="jb-badge-labels">
                  <span className="jb-badge-sub">Tailored</span>
                  <span className="jb-badge-main">Career Growth</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Web App Register Card */}
          <section className="jb-card-panel">
            <div className="jb-auth-card">
              <div className="jb-card-head">
                <span className="jb-eyebrow-tag">
                  {role === 'recruiter' ? `RECRUITER ONBOARDING (STEP ${step}/2)` : 'TALENT REGISTRATION'}
                </span>
                <h2 className="jb-card-heading">
                  {role === 'recruiter' && step === 2 ? 'Company Details' : 'Create your account'}
                </h2>
                <p className="jb-card-subtext">
                  {role === 'recruiter' && step === 2 
                    ? 'Enter company details to verify your hiring workspace.' 
                    : 'Select your account type and start in seconds.'}
                </p>
              </div>

              {state.success ? (
                <div className="jb-success-box">
                  <div className="jb-success-icon-wrap">
                    <CheckCircle2 size={44} color="#16a34a" strokeWidth={2.4} />
                  </div>
                  <h3 className="jb-success-title">Account Created Successfully</h3>
                  <p className="jb-success-text">
                    We've initialized your {SITE_NAME} account. Please check your inbox to confirm your email, then sign in to your workspace.
                  </p>
                  <Link to="/sign-in" className="jb-primary-action-btn" style={{ textDecoration: 'none', display: 'flex', marginTop: '20px' }}>
                    Proceed to Sign In
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="jb-card-form">
                  {/* Role Selector (only in step 1) */}
                  {step === 1 && (
                    <div className="jb-role-selector" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={role === 'job_seeker'}
                        onClick={() => handleRoleChange('job_seeker')}
                        className={`jb-role-btn ${role === 'job_seeker' ? 'jb-role-btn--active' : ''}`}
                      >
                        <span className={`jb-role-dot ${role === 'job_seeker' ? 'jb-role-dot--active' : ''}`} />
                        <span>Job Seeker</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={role === 'recruiter'}
                        onClick={() => handleRoleChange('recruiter')}
                        className={`jb-role-btn ${role === 'recruiter' ? 'jb-role-btn--active' : ''}`}
                      >
                        <span className={`jb-role-dot ${role === 'recruiter' ? 'jb-role-dot--active' : ''}`} />
                        <span>Recruiter / Employer</span>
                      </button>
                    </div>
                  )}

                  {/* Step 1 Fields (Name, Email, Password) */}
                  {step === 1 && (
                    <>
                      <div className="jb-field-block">
                        <label htmlFor="reg-name" className="jb-field-label">Full name</label>
                        <div className="jb-control-wrap">
                          <User size={16} strokeWidth={2} className="jb-control-icon" />
                          <input
                            id="reg-name"
                            name="name"
                            minLength={2}
                            maxLength={160}
                            type="text"
                            required
                            placeholder="Sarah Jenkins"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="jb-control-input"
                          />
                        </div>
                      </div>

                      <div className="jb-field-block">
                        <label htmlFor="reg-email" className="jb-field-label">
                          {role === 'recruiter' ? 'Work email' : 'Email address'}
                        </label>
                        <div className="jb-control-wrap">
                          <Mail size={16} strokeWidth={2} className="jb-control-icon" />
                          <input
                            id="reg-email"
                            name="email"
                            maxLength={320}
                            type="email"
                            required
                            placeholder="sarah@company.com"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="jb-control-input"
                          />
                        </div>
                      </div>

                      <div className="jb-field-block">
                        <label htmlFor="reg-password" className="jb-field-label">Password (min. 8 characters)</label>
                        <div className="jb-control-wrap">
                          <Lock size={16} strokeWidth={2} className="jb-control-icon" />
                          <input
                            id="reg-password"
                            name="password"
                            maxLength={200}
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            placeholder="••••••••"
                            autoComplete="new-password"
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

                      {role === 'recruiter' ? (
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="jb-primary-action-btn"
                          style={{ marginTop: '6px' }}
                        >
                          Next: Company Details
                          <ArrowRight size={16} strokeWidth={2.4} style={{ marginLeft: '6px' }} />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={state.loading}
                          className="jb-primary-action-btn"
                          style={{ marginTop: '6px' }}
                        >
                          {state.loading ? (
                            <span className="jb-btn-loading">
                              <span className="jb-spinner" />
                              Creating account...
                            </span>
                          ) : (
                            'Create Account'
                          )}
                        </button>
                      )}
                    </>
                  )}

                  {/* Step 2 Fields for Recruiter: Company Information without page scroll */}
                  {role === 'recruiter' && step === 2 && (
                    <>
                      <div className="jb-step-back-row">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="jb-step-back-btn"
                        >
                          <ArrowLeft size={14} strokeWidth={2.2} />
                          <span>Back to credentials</span>
                        </button>
                        <span className="jb-step-pill">Step 2 of 2</span>
                      </div>

                      <div className="jb-field-block">
                        <label htmlFor="reg-company" className="jb-field-label">Company name</label>
                        <div className="jb-control-wrap">
                          <Building2 size={16} strokeWidth={2} className="jb-control-icon" />
                          <input
                            id="reg-company"
                            name="company_name"
                            minLength={2}
                            maxLength={180}
                            type="text"
                            required
                            placeholder="Acme Technologies Inc."
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="jb-control-input"
                          />
                        </div>
                      </div>

                      <div className="jb-field-block">
                        <label htmlFor="reg-website" className="jb-field-label">Company website</label>
                        <div className="jb-control-wrap">
                          <Globe size={16} strokeWidth={2} className="jb-control-icon" />
                          <input
                            id="reg-website"
                            name="company_website"
                            maxLength={1000}
                            type="url"
                            required
                            placeholder="https://company.com"
                            value={companyWebsite}
                            onChange={(e) => setCompanyWebsite(e.target.value)}
                            className="jb-control-input"
                          />
                        </div>
                      </div>

                      <div className="jb-field-block">
                        <label htmlFor="reg-regno" className="jb-field-label">Company registration / Tax ID</label>
                        <div className="jb-control-wrap">
                          <FileText size={16} strokeWidth={2} className="jb-control-icon" />
                          <input
                            id="reg-regno"
                            name="company_registration_number"
                            minLength={2}
                            maxLength={180}
                            type="text"
                            required
                            placeholder="e.g. US-9874523"
                            value={companyRegistrationNumber}
                            onChange={(e) => setCompanyRegistrationNumber(e.target.value)}
                            className="jb-control-input"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={state.loading}
                        className="jb-primary-action-btn"
                        style={{ marginTop: '6px' }}
                      >
                        {state.loading ? (
                          <span className="jb-btn-loading">
                            <span className="jb-spinner" />
                            Creating workspace...
                          </span>
                        ) : (
                          'Complete Registration'
                        )}
                      </button>
                    </>
                  )}
                </form>
              )}

              <div className="jb-card-foot">
                <span className="jb-foot-muted">Already registered? </span>
                <Link to="/sign-in" className="jb-foot-link">
                  Sign in
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
          max-width: 450px;
          background: #ffffff;
          border-radius: 24px;
          padding: 36px 36px 30px;
          box-shadow: 
            0 24px 60px -15px rgba(15, 23, 42, 0.09),
            0 2px 10px rgba(15, 23, 42, 0.02);
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .jb-card-head {
          margin-bottom: 20px;
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
          margin: 0 0 5px;
        }

        .jb-card-subtext {
          font-size: 13.5px;
          color: #64748b;
          margin: 0;
          line-height: 1.45;
        }

        .jb-role-selector {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 16px;
          gap: 6px;
        }

        .jb-role-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          background: transparent;
          color: #64748b;
          border-radius: 9px;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .jb-role-btn--active {
          background: #ffffff;
          color: #0066f5;
          box-shadow: 0 2px 8px rgba(0, 102, 245, 0.08);
        }

        .jb-role-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #cbd5e1;
          transition: all 0.18s ease;
          flex-shrink: 0;
        }

        .jb-role-dot--active {
          background: #0066f5;
          box-shadow: 0 0 0 3px rgba(0, 102, 245, 0.22);
        }

        .jb-step-back-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f1f5f9;
        }

        .jb-step-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #0066f5;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }

        .jb-step-back-btn:hover {
          text-decoration: underline;
        }

        .jb-step-pill {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          background: #f1f5f9;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .jb-alert-banner {
          padding: 10px 14px;
          border-radius: 9px;
          font-size: 13px;
          margin-bottom: 16px;
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
          margin-bottom: 15px;
        }

        .jb-field-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 5px;
        }

        .jb-control-wrap {
          display: flex;
          align-items: center;
          height: 45px;
          padding: 0 13px;
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
            padding: 16px 20px;
          }

          .jb-app-workspace {
            padding: 10px 20px 30px;
          }

          .jb-auth-card {
            padding: 28px 20px;
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
