import { useEffect, useState } from 'react';

export default function MississaugaTrackingConsent({ consent, open, onClose, onSave }) {
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (open) {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
      setPreferencesOpen(true);
    }
  }, [open, consent.analytics, consent.marketing]);

  if (consent.decided && !open && !preferencesOpen) return null;

  const save = (next) => {
    onSave({ ...next, decided: true });
    setPreferencesOpen(false);
    onClose?.();
  };

  return (
    <aside className="mississauga-consent" aria-label="Optional tracking preferences">
      <div className="mississauga-consent__copy">
        <strong>Your privacy choices</strong>
        <p>Necessary storage supports this page. With your permission, Jooblie can use analytics to understand visits and marketing measurement to count completed registrations. Form details and job or immigration interests are never sent to these tools.</p>
        {preferencesOpen && (
          <div className="mississauga-consent__options">
            <label><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /> Allow analytics measurement</label>
            <label><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /> Allow marketing measurement</label>
          </div>
        )}
      </div>
      <div className="mississauga-consent__actions">
        {preferencesOpen ? (
          <>
            <button type="button" className="mississauga-consent__text" onClick={() => { setPreferencesOpen(false); onClose?.(); }}>Cancel</button>
            <button type="button" className="mississauga-consent__button" onClick={() => save({ analytics, marketing })}>Save choices</button>
          </>
        ) : (
          <>
            <button type="button" className="mississauga-consent__text" onClick={() => save({ analytics: false, marketing: false })}>Necessary only</button>
            <button type="button" className="mississauga-consent__text" onClick={() => { setAnalytics(consent.analytics); setMarketing(consent.marketing); setPreferencesOpen(true); }}>Manage choices</button>
            <button type="button" className="mississauga-consent__button" onClick={() => save({ analytics: true, marketing: true })}>Allow all optional</button>
          </>
        )}
      </div>
    </aside>
  );
}
