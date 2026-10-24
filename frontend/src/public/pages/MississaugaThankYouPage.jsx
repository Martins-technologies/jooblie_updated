import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const SUCCESS_KEY = 'jooblie_mississauga_registration_accepted';

export default function MississaugaThankYouPage() {
  const location = useLocation();
  const [receipt, setReceipt] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(SUCCESS_KEY) || 'null');
      if (value && Date.now() - Number(value.at) < 60 * 60 * 1000) {
        setReceipt({ duplicate: value.duplicate === true });
      } else {
        sessionStorage.removeItem(SUCCESS_KEY);
      }
    } catch {
      // Some private browsing modes block session storage; use route state below.
    }
    if (location.state?.accepted === true) setReceipt({ duplicate: location.state.duplicate === true });
    setChecked(true);
  }, [location.state]);

  if (!checked) return <main className="mississauga-thankyou"><p role="status">Loading your confirmation…</p></main>;
  if (!receipt) return <Navigate to="/mississauga/register" replace />;

  return (
    <main className="mississauga-thankyou">
      <section className="mississauga-thankyou__card" aria-labelledby="mississauga-thankyou-title">
        <span className="mississauga-thankyou__icon"><CheckCircle2 size={34} aria-hidden="true" /></span>
        <p className="mississauga-eyebrow">Registration received</p>
        <h1 id="mississauga-thankyou-title">You’re Registered with Jooblie!</h1>
        <p>{receipt.duplicate ? 'It looks like you’ve registered before. Your latest details have been received. Our team will review your registration.' : 'Thank you for registering with Jooblie. We’ve received your details, and our recruitment team will review your information and contact you about the next steps.'}</p>
        <h2>Here’s What Happens Next</h2>
        <ol>
          <li>We review your registration and employment interests.</li>
          <li>Our team contacts you to discuss your job-search goals.</li>
          <li>We explore potentially relevant employer-matching opportunities, where available.</li>
        </ol>
        <strong className="mississauga-thankyou__free">Remember: our recruitment assistance is free for job seekers.</strong>
        <Link className="mississauga-button" to="/">Return to Jooblie.com <ArrowRight size={16} aria-hidden="true" /></Link>
        <small>Submitting a registration does not guarantee employment, an employer match, a work permit or permanent residence.</small>
      </section>
    </main>
  );
}
