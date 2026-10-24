import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MississaugaTrackingConsent from './MississaugaTrackingConsent';
import {
  readMississaugaTrackingConsent,
  trackMississaugaEvent,
  trackMississaugaPageView,
  updateMississaugaTrackingConsent,
} from './mississaugaCampaignTracking';
import './mississauga.css';

export default function MississaugaLayout() {
  const location = useLocation();
  const [consent, setConsent] = useState(readMississaugaTrackingConsent);
  const [consentOpen, setConsentOpen] = useState(false);

  useEffect(() => {
    updateMississaugaTrackingConsent(consent);
    trackMississaugaPageView(location.pathname, consent);
  }, [consent, location.pathname]);

  const saveConsent = (next) => {
    setConsent(next);
    setConsentOpen(false);
    updateMississaugaTrackingConsent(next);
  };

  return (
    <div className="mississauga-site">
      <header className="mississauga-header">
        <div className="mississauga-container mississauga-header__inner">
          <Link className="mississauga-brand" to="/" aria-label="Jooblie home">
            <img src="/brand/jooblie-logo.svg" alt="Jooblie - Job Centre" width="148" height="42" />
          </Link>
          <span className="mississauga-header__location">New Mississauga location</span>
          <nav className="mississauga-nav" aria-label="Page navigation">
            <a href="/mississauga/register#how">How it works</a>
            <a href="/mississauga/register#opportunities">Opportunities</a>
            <a href="/mississauga/register#faq">FAQs</a>
          </nav>
          <a className="mississauga-button mississauga-button--header" href="/mississauga/register#mississauga-registration">
            Register for free <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </header>
      <Outlet context={{ trackEvent: trackMississaugaEvent }} />
      <footer className="mississauga-footer">
        <div className="mississauga-container mississauga-footer__inner">
          <div>
            <Link className="mississauga-brand" to="/" aria-label="Jooblie home">
              <img src="/brand/jooblie-logo.svg" alt="Jooblie" width="132" height="38" />
            </Link>
            <p>Jooblie | Helping Job Seekers Connect with Potential Employers</p>
            <p>Now welcoming registrations in Mississauga, Ontario.</p>
          </div>
          <div className="mississauga-footer__links">
            <span>Explore</span>
            <a href="/mississauga/register#how">How it works</a>
            <a href="/mississauga/register#opportunities">Opportunities</a>
            <a href="/mississauga/register#faq">FAQs</a>
          </div>
          <div className="mississauga-footer__links">
            <span>Information</span>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Use</Link>
            <Link to="/contact">Contact</Link>
            <button type="button" className="mississauga-footer__privacy-choice" onClick={() => setConsentOpen(true)}>Privacy choices</button>
          </div>
          <p className="mississauga-footer__disclaimer">
            Employment opportunities depend on availability, employer requirements and individual eligibility. Jooblie does not guarantee job placement, work permits or permanent residence.
          </p>
          <p className="mississauga-footer__copyright">© {new Date().getFullYear()} Jooblie. All rights reserved.</p>
        </div>
      </footer>
      <MississaugaTrackingConsent consent={consent} open={consentOpen} onClose={() => setConsentOpen(false)} onSave={saveConsent} />
    </div>
  );
}
