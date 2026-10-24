import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, CircleHelp, HeartHandshake, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { apiRequest } from '../../shared/lib/api';

const goals = [
  'Find a job',
  'Explore employers who may support a work permit',
  'Explore employment related to potential PR pathways',
  'All of the above',
  'Not sure yet',
];
const industries = [
  'Administration & Office', 'Agriculture', 'Construction & Skilled Trades',
  'Healthcare & Support Services', 'Hospitality & Food Services',
  'Manufacturing & Warehousing', 'Retail & Customer Service',
  'Transportation & Logistics', 'Other', 'Open to any industry',
];
const faqItems = [
  ['Is Jooblie really free for job seekers?', 'Yes. Registering with Jooblie and receiving recruitment or job-placement assistance are free for job seekers. We do not charge recruitment fees.'],
  ['Will Jooblie guarantee me a job?', 'No. We can review your registration and explore possible employer-matching opportunities, but employment depends on employer needs, available openings and individual qualifications.'],
  ['Can Jooblie help me find an employer who supports work permits?', 'Jooblie may help you explore employment opportunities with employers who are willing and eligible to support applicable work permit processes. Availability varies, and no work permit outcome is guaranteed.'],
  ['Can a job help me qualify for permanent residence?', 'Certain employment arrangements may be relevant to some Canadian permanent residence programs, but eligibility depends on the rules of the applicable program and your circumstances. Registration with Jooblie does not establish PR eligibility.'],
  ['Do I need an existing work permit to register?', 'You may submit a registration to tell us about your job-search interests. Any employment opportunity will remain subject to the legal authorization and eligibility requirements that apply to you.'],
  ['Do I have to live in Mississauga?', 'Our new location is in Mississauga, Ontario. You may register from another city, but available opportunities and the ability to connect you with employers may depend on location.'],
  ['What happens after I submit the form?', 'Our team receives your registration, reviews the information and contacts you to discuss the next steps. Please ensure your email address and phone number are correct.'],
  ['Will my information be shared with employers?', 'Jooblie uses your information to review and respond to your registration. We will share relevant profile information with potential employers only in accordance with your permission and our Privacy Policy.'],
  ['Does Jooblie provide immigration advice or application services?', 'This registration page is for employment and employer-matching assistance. It does not provide individual immigration advice, confirm program eligibility or offer immigration representation.'],
];

function normalizePhone(value) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return /^\+[1-9]\d{6,14}$/.test(`+${digits}`) ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function sourceContext(marketingConsent) {
  const params = new URLSearchParams(window.location.search);
  const context = { page_path: '/mississauga/register' };
  const sourceKeys = marketingConsent
    ? ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid']
    : ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  for (const key of sourceKeys) {
    const value = params.get(key)?.trim();
    if (value) context[key] = value.slice(0, key === 'fbclid' ? 500 : 250);
  }
  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (['https:', 'http:'].includes(referrer.protocol)) context.referrer = `${referrer.origin}${referrer.pathname}`.slice(0, 1000);
    } catch { /* Ignore malformed referrer values. */ }
  }
  return context;
}

export default function MississaugaRegisterPage() {
  const navigate = useNavigate();
  const { trackEvent } = useOutletContext();
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [stickyCta, setStickyCta] = useState(false);

  useEffect(() => {
    const node = formRef.current;
    if (!node || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setFormVisible(entry.isIntersecting);
      setStickyCta(!entry.isIntersecting);
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const startForm = () => {
    if (started) return;
    setStarted(true);
    trackEvent('registration_form_start');
  };

  const validate = (data) => {
    const next = {};
    const fullName = String(data.get('full_name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const city = String(data.get('current_city') || '').trim();
    const goal = String(data.get('employment_goal') || '');
    if (!fullName) next.full_name = 'This field is required.';
    else if (fullName.length < 2) next.full_name = 'Enter your full name.';
    if (!email) next.email = 'This field is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.';
    if (!phone) next.phone = 'This field is required.';
    else if (!normalizePhone(phone)) next.phone = 'Enter a valid phone number, including country code.';
    if (!city) next.current_city = 'This field is required.';
    if (!goal) next.employment_goal = 'Select what you’re looking for.';
    if (!data.get('privacy_acknowledged')) next.privacy_acknowledged = 'Please review and acknowledge how your information will be used.';
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    trackEvent('registration_submit_attempt');
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextErrors = validate(data);
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) {
      trackEvent('registration_validation_error');
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest('/public/registrations', {
        method: 'POST',
        notifyError: false,
        body: {
          full_name: String(data.get('full_name')).trim(),
          email: String(data.get('email')).trim().toLowerCase(),
          phone_e164: normalizePhone(String(data.get('phone'))),
          current_city: String(data.get('current_city')).trim(),
          employment_goal: String(data.get('employment_goal')),
          preferred_industry: String(data.get('preferred_industry') || '') || null,
          privacy_acknowledged: true,
          employer_sharing_consent: data.get('employer_sharing_consent') === 'on',
          marketing_consent: data.get('marketing_consent') === 'on',
          source_context: sourceContext(data.get('marketing_consent') === 'on'),
        },
      });
      if (!response?.accepted || !response?.record_id) throw new Error('Unconfirmed registration response.');
      trackEvent(response.duplicate ? 'registration_duplicate_resubmitted' : 'registration_success');
      const receipt = { at: Date.now(), duplicate: response.duplicate === true };
      try { sessionStorage.setItem('jooblie_mississauga_registration_accepted', JSON.stringify(receipt)); } catch { /* In-memory route state still confirms success. */ }
      navigate('/mississauga/thank-you', { state: { accepted: true, duplicate: receipt.duplicate } });
    } catch {
      trackEvent('registration_error');
      setFormError('We couldn’t complete your registration right now. Please check your connection and try again.');
      form.querySelector('[role="alert"]')?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const errorProps = (name) => ({ 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined });
  const fieldError = (name) => errors[name] ? <span className="mississauga-field-error" id={`${name}-error`}>{errors[name]}</span> : null;
  const scrollToForm = (event) => {
    trackEvent('cta_to_form');
    if (!formVisible) return;
    event.preventDefault();
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formRef.current?.querySelector('input')?.focus({ preventScroll: true });
  };
  const cta = (label, className = 'mississauga-button') => (
    <a className={className} href="#mississauga-registration" onClick={scrollToForm}>{label}<ArrowRight size={16} aria-hidden="true" /></a>
  );

  return (
    <main className="mississauga-main">
      <section className="mississauga-hero" aria-labelledby="mississauga-title">
        <div className="mississauga-container mississauga-hero__grid">
          <div className="mississauga-hero__copy">
            <p className="mississauga-eyebrow"><MapPin size={15} aria-hidden="true" /> Now welcoming registrations in Mississauga, Ontario</p>
            <h1 id="mississauga-title">Looking for an Employer Who May Support Your Work Permit or PR Pathway?</h1>
            <p className="mississauga-hero__lead">Your next opportunity could start with Jooblie.</p>
            <p className="mississauga-body-lead">Looking for work in Canada? Jooblie helps job seekers connect with potential employers, including those who may be willing to support eligible work permit or permanent residence pathways.</p>
            <div className="mississauga-free-note"><span><Check size={16} aria-hidden="true" /> 100% free for job seekers</span><p>No registration fees. No recruitment fees.</p></div>
            <ul className="mississauga-benefits">
              <li><Check aria-hidden="true" /> Explore potential employment opportunities.</li>
              <li><Check aria-hidden="true" /> Get assistance connecting with suitable employers.</li>
              <li><Check aria-hidden="true" /> Receive follow-up from our recruitment team.</li>
            </ul>
            {cta('Register for free')}
            <p className="mississauga-microcopy">Register online in a few simple steps. Our team will contact you.</p>
          </div>

          <section className="mississauga-form-card" id="mississauga-registration" ref={formRef} aria-labelledby="mississauga-form-title">
            <span className="mississauga-form-card__label"><Sparkles size={14} aria-hidden="true" /> Start a conversation</span>
            <h2 id="mississauga-form-title">Let’s Find Your Next Opportunity.</h2>
            <p>Tell us a little about yourself and the type of work you’re looking for. Registration is free, and our team will contact you about the next steps.</p>
            <form noValidate onSubmit={submit} onFocusCapture={startForm}>
              {formError && <div className="mississauga-form-error" tabIndex={-1} role="alert">{formError}</div>}
              <div className="mississauga-field">
                <label htmlFor="ms-full-name">Full name <span aria-hidden="true">*</span></label>
                <input {...errorProps('full_name')} id="ms-full-name" name="full_name" type="text" autoComplete="name" maxLength={120} placeholder="Enter your first and last name" onChange={() => errors.full_name && setErrors((prev) => ({ ...prev, full_name: undefined }))} />
                {fieldError('full_name')}
              </div>
              <div className="mississauga-field">
                <label htmlFor="ms-email">Email address <span aria-hidden="true">*</span></label>
                <input {...errorProps('email')} id="ms-email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" onChange={() => errors.email && setErrors((prev) => ({ ...prev, email: undefined }))} />
                {fieldError('email')}
              </div>
              <div className="mississauga-field">
                <label htmlFor="ms-phone">Phone number <span aria-hidden="true">*</span></label>
                <input {...errorProps('phone')} id="ms-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={32} placeholder="Enter your mobile number" onChange={() => errors.phone && setErrors((prev) => ({ ...prev, phone: undefined }))} />
                {fieldError('phone')}
              </div>
              <div className="mississauga-field">
                <label htmlFor="ms-city">Current city <span aria-hidden="true">*</span></label>
                <input {...errorProps('current_city')} id="ms-city" name="current_city" type="text" autoComplete="address-level2" maxLength={80} placeholder="e.g., Mississauga" onChange={() => errors.current_city && setErrors((prev) => ({ ...prev, current_city: undefined }))} />
                {fieldError('current_city')}
              </div>
              <div className="mississauga-field">
                <label htmlFor="ms-goal">What are you looking for? <span aria-hidden="true">*</span></label>
                <select {...errorProps('employment_goal')} id="ms-goal" name="employment_goal" defaultValue="" onChange={() => errors.employment_goal && setErrors((prev) => ({ ...prev, employment_goal: undefined }))}>
                  <option value="" disabled>Select your main goal</option>
                  {goals.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
                </select>
                {fieldError('employment_goal')}
              </div>
              <div className="mississauga-field">
                <label htmlFor="ms-industry">Preferred industry <span className="mississauga-optional">Optional</span></label>
                <select id="ms-industry" name="preferred_industry" defaultValue="">
                  <option value="">Select an industry (optional)</option>
                  {industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
                </select>
              </div>
              <p className="mississauga-consent-copy">We use the information you provide to review your registration, contact you about your job search and, where you authorize it, explore potential employer matches. Read our <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a> for more information.</p>
              <fieldset className="mississauga-checks">
                <legend className="visually-hidden">Privacy and optional permissions</legend>
                <label className="mississauga-check" aria-invalid={Boolean(errors.privacy_acknowledged)} aria-describedby={errors.privacy_acknowledged ? 'privacy_acknowledged-error' : undefined}>
                  <input {...errorProps('privacy_acknowledged')} type="checkbox" name="privacy_acknowledged" required onChange={() => errors.privacy_acknowledged && setErrors((prev) => ({ ...prev, privacy_acknowledged: undefined }))} />
                  <span>I understand that Jooblie will use my registration details to respond to my request for job-search and recruitment assistance, as described in the Privacy Policy. <strong>*</strong></span>
                </label>
                {fieldError('privacy_acknowledged')}
                <label className="mississauga-check">
                  <input type="checkbox" name="employer_sharing_consent" />
                  <span>I agree that Jooblie may share relevant information from my job seeker profile with potential employers for employment matching. I understand I can withdraw this permission by contacting Jooblie.</span>
                </label>
                <label className="mississauga-check">
                  <input type="checkbox" name="marketing_consent" />
                  <span>I would also like to receive occasional Jooblie news and promotional job-search updates by email or text. I understand I can unsubscribe at any time.</span>
                </label>
              </fieldset>
              <p className="mississauga-disclaimer">Registration does not guarantee employment, employer sponsorship, a work permit or permanent residence. Eligibility and opportunities vary.</p>
              <button className="mississauga-button mississauga-button--submit" type="submit" disabled={submitting}>
                {submitting ? 'Submitting your registration…' : 'Register for free'} <ArrowRight size={16} aria-hidden="true" />
              </button>
              <p className="mississauga-form-reassurance"><ShieldCheck size={16} aria-hidden="true" /> No payment required. No recruitment fees for job seekers.</p>
            </form>
          </section>
        </div>
        <div className="mississauga-container mississauga-hero__hint"><a href="#how">Built around your next step <ArrowDown size={15} aria-hidden="true" /></a><span>Mississauga, Ontario</span></div>
      </section>

      <section className="mississauga-section mississauga-how" id="how">
        <div className="mississauga-container">
          <div className="mississauga-section-heading"><p className="mississauga-eyebrow">A simpler way to begin</p><h2>Your Job Search Starts with Three Simple Steps.</h2><p>We make it easier to take the first step toward potential employment opportunities.</p></div>
          <div className="mississauga-steps">
            {[
              ['01', 'Register for Free', 'Share your contact details and tell us what type of employment you’re looking for. There’s no charge to register.'],
              ['02', 'Our Team Reviews Your Registration', 'We review your information to understand your interests and what opportunities may be relevant to you.'],
              ['03', 'Explore Potential Employer Matches', 'If suitable opportunities are available, our team may contact you to discuss next steps and potential connections with employers.'],
            ].map(([number, title, body]) => <article className="mississauga-step" key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}
          </div>
          {cta('Start my free registration')}
        </div>
      </section>

      <section className="mississauga-section mississauga-opportunities" id="opportunities">
        <div className="mississauga-container">
          <div className="mississauga-section-heading"><p className="mississauga-eyebrow">More than a job search</p><h2>Explore Employment Opportunities That Match Your Goals.</h2><p>Whether you want to find a job or explore employment that may support your longer-term plans in Canada, Jooblie is a place to begin.</p></div>
          <div className="mississauga-opportunity-grid">
            {[
              ['Find Employment Opportunities', 'Tell us about your interests and preferred industry. Our team can consider your profile for relevant employer-matching opportunities.'],
              ['Explore Work Permit-Related Opportunities', 'Some employers may be willing and eligible to support certain work permit processes. Jooblie can help you explore relevant employment opportunities where available.'],
              ['Explore PR-Related Employment Opportunities', 'Some employment opportunities may be relevant to eligible Canadian permanent residence pathways. Every candidate’s circumstances and program requirements are different.'],
            ].map(([title, body], index) => <article className="mississauga-opportunity" key={title}><span>0{index + 1} / {['Employment', 'Work permit', 'Permanent residence'][index]}</span><BriefcaseBusiness size={21} aria-hidden="true" /><h3>{title}</h3><p>{body}</p>{cta(`Register to explore ${['employment opportunities', 'work permit related opportunities', 'PR related opportunities'][index]}`, 'mississauga-text-link')}</article>)}
          </div>
          <p className="mississauga-important"><ShieldCheck size={19} aria-hidden="true" /><span><strong>Important:</strong> A job, employer introduction or offer of support does not guarantee immigration eligibility, work authorization or permanent residence approval. Government requirements apply.</span></p>
          {cta('Register to explore opportunities')}
        </div>
      </section>

      <section className="mississauga-section mississauga-why">
        <div className="mississauga-container">
          <div className="mississauga-section-heading"><p className="mississauga-eyebrow">Why register?</p><h2>Support for Your Job Search, Without Recruitment Fees.</h2><p>Searching for a new opportunity takes time. Jooblie gives you a simple way to share your employment goals with a team focused on employer matching.</p></div>
          <div className="mississauga-why-grid">
            {[
              ['Always Free for Job Seekers', 'You won’t pay Jooblie a fee to register or for recruitment and job-placement assistance.'],
              ['Opportunities Across Industries', 'Tell us the kind of work you’re interested in so we can consider relevant opportunities when they become available.'],
              ['A Real Team to Follow Up', 'After registration, our team will contact you about your job-search goals and possible next steps.'],
              ['One Simple Starting Point', 'No need to choose an employer before registering. Start by telling us what you’re looking for.'],
            ].map(([title, body], index) => <article className="mississauga-why-card" key={title}><span>0{index + 1} / {['No fees', 'Your interests', 'A real team', 'One starting point'][index]}</span><HeartHandshake size={20} aria-hidden="true" /><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mississauga-location">
        <div className="mississauga-container mississauga-location__inner"><div><p className="mississauga-eyebrow">Jooblie is expanding</p><h2>Hello, Mississauga. Let’s Get Your Job Search Moving.</h2><p>Jooblie is welcoming job seeker registrations for our new Mississauga location. If you’re searching for employment or exploring employers who may support eligible work permit or PR-related opportunities, we’d like to hear from you.</p><span><MapPin size={16} aria-hidden="true" /> Mississauga, Ontario</span></div>{cta('Register for free today')}</div>
      </section>

      <section className="mississauga-section mississauga-faq" id="faq">
        <div className="mississauga-container">
          <div className="mississauga-section-heading"><p className="mississauga-eyebrow">Mississauga / Ontario</p><h2>Questions, Answered.</h2><p>Everything you need to know before you take your first step.</p></div>
          <div className="mississauga-faq-list">
            {faqItems.map(([question, answer], index) => <details key={question} className="mississauga-faq-item"><summary><span>{String(index + 1).padStart(2, '0')}</span>{question}<CircleHelp size={18} aria-hidden="true" /></summary><p>{answer}</p></details>)}
          </div>
        </div>
      </section>

      <section className="mississauga-final-cta">
        <div className="mississauga-container mississauga-final-cta__inner"><p className="mississauga-eyebrow">Your next chapter</p><h2>Your Next Opportunity Could Start Here.</h2><p>Register with Jooblie today and tell us what kind of work you’re looking for. Our team will contact you about the next steps.</p>{cta('Complete my free registration')}<span><Check size={15} aria-hidden="true" /> 100% free for job seekers. No recruitment fees.</span></div>
      </section>
      {stickyCta && !formVisible && <div className="mississauga-sticky-cta">{cta('Register for free')}</div>}
    </main>
  );
}
