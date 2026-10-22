import supportImage from '../../shared/assets/images/cta/04_for_employers.webp';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Send, ShieldAlert } from 'lucide-react';
import PageHero from '../../shared/components/PageHero';
import PageSection from '../../shared/components/PageSection';
import Reveal from '../../shared/components/Reveal';
import { apiRequest } from '../../shared/lib/api';

export default function ContactPage() {
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const pending = useRef(false);
  const form = useRef(null);
  const email = import.meta.env.VITE_SUPPORT_EMAIL?.trim();
  const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.consent = data.consent === 'on';
    const next = {};

    if (data.name.trim().length < 2) next.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) next.email = 'Enter a valid email address.';
    if (data.subject.trim().length < 3) next.subject = 'Enter a subject of at least 3 characters.';
    if (data.message.trim().length < 10) next.message = 'Enter a message of at least 10 characters.';
    if (!data.consent) next.consent = 'Please confirm how we may use your message.';

    setErrors(next);
    setStatus('');
    if (Object.keys(next).length) {
      form.current.elements.namedItem(Object.keys(next)[0])?.focus();
      return;
    }

    pending.current = true;
    setBusy(true);
    try {
      const result = await apiRequest('/public/contact', {
        method: 'POST',
        body: data,
        notifyError: false,
      });
      if (!result.accepted) throw new Error('Message was not accepted. Please try again.');
      setStatus('Your message was accepted for delivery. Thank you for contacting Jooblie.');
      form.current.reset();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="A question today."
        accent="A clearer next step."
        imageSrc={supportImage}
        imageAlt="Professional reviewing information at a desk"
        text="Questions about your account, an opening, or hiring with Jooblie? Get in touch with our team."
      />
      <PageSection>
        <div className="contact-layout">
          <Reveal as="aside" className="content-card" direction="left">
            
            <h2>Let’s point you in the right direction.</h2>
            <p>Choose the channel that works for you. Share the details of your question so we can understand what you need.</p>

            {validEmail && (
              <a className="contact-method" href={`mailto:${email}`}>
                <Mail size={19} />
                <span>{email}</span>
              </a>
            )}

            <a className="contact-method" href="tel:+18339621150">
              <Phone size={19} />
              <span>+1 833-962-1150</span>
            </a>

            <div className="contact-topic-links"><Link to="/resources">Application & profile guidance →</Link><Link to="/companies">Explore employer information →</Link><Link to="/account/help">Account help →</Link></div>
            <div style={{ marginTop: '20px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <ShieldAlert size={16} style={{ color: '#64748b', flexShrink: 0, marginTop: '2px' }} />
              <span>Please do not send passwords, identity documents, or financial information through this general form.</span>
            </div>
          </Reveal>

          <form className="content-card contact-form" ref={form} onSubmit={submit} noValidate>
            <h2>Send a message</h2>

            {[
              ['name', 'Your Name', 'text', 100],
              ['email', 'Email Address', 'email', 254],
              ['subject', 'Subject', 'text', 160],
            ].map(([name, label, type, max]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  type={type}
                  maxLength={max}
                  required
                  disabled={busy}
                  autoComplete={name === 'name' ? 'name' : name === 'email' ? 'email' : 'off'}
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={errors[name] ? `${name}-error` : undefined}
                />
                {errors[name] && (
                  <span id={`${name}-error`} className="field-error">
                    {errors[name]}
                  </span>
                )}
              </label>
            ))}

            <label>
              Message
              <textarea
                name="message"
                rows={6}
                required
                maxLength={5000}
                disabled={busy}
                placeholder="How can we help you?"
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
              {errors.message && (
                <span className="field-error" id="message-error">
                  {errors.message}
                </span>
              )}
            </label>

            <label className="contact-trap" aria-hidden="true">
              Leave this blank
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>

            <label className="contact-consent">
              <input
                type="checkbox"
                name="consent"
                disabled={busy}
                aria-describedby={errors.consent ? 'consent-error' : undefined}
              />
              <span>I agree that my contact details and message may be used to respond to this enquiry.</span>
            </label>
            {errors.consent && (
              <span id="consent-error" className="field-error">
                {errors.consent}
              </span>
            )}

            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Read our <Link to="/privacy">Privacy Policy</Link>. Messages are used for support inquiries, not marketing signups.
            </p>

            {errors.submit && (
              <p role="alert" className="field-error" style={{ margin: 0 }}>
                {errors.submit}
              </p>
            )}

            {status && (
              <p role="status" style={{ color: '#059669', fontWeight: 600, margin: 0 }}>
                {status}
              </p>
            )}

            <button type="submit" className="button button--primary" disabled={busy} style={{ justifySelf: 'start', minWidth: '160px' }}>
              <Send size={16} />
              <span>{busy ? 'Sending…' : 'Send Message'}</span>
            </button>
          </form>
        </div>
      </PageSection>
    </>
  );
}
