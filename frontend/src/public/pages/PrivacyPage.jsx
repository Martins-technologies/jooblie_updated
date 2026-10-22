import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Users,
  Database,
  Briefcase,
  FileText,
  MapPin,
  Send,
  Share2,
  Lock,
  Clock,
  UserCheck,
  Cookie,
  Mail,
  Calendar,
  CheckCircle2,
  Phone,
  ArrowUpRight,
  ExternalLink,
  Search,
} from 'lucide-react';
import Reveal from '../../shared/components/Reveal';
import { SITE_NAME } from '../../shared/config/site';

const sections = [
  { id: 'who-we-are', num: '01', title: 'Who We Are & Controller', icon: Building2 },
  { id: 'who-covered', num: '02', title: 'Who This Policy Covers', icon: Users },
  { id: 'data-collected', num: '03', title: 'Data We Collect', icon: Database },
  { id: 'how-used', num: '04', title: 'How We Use Your Data', icon: Briefcase },
  { id: 'lawful-bases', num: '05', title: 'Lawful Bases for Processing', icon: FileText },
  { id: 'location-verification', num: '06', title: 'Verification & Location Data', icon: MapPin },
  { id: 'business-contacts', num: '07', title: 'Business Contacts & Outreach', icon: Send },
  { id: 'data-sharing', num: '08', title: 'Sharing with Third Parties', icon: Share2 },
  { id: 'storage-security', num: '09', title: 'Storage, Transfers & Security', icon: Lock },
  { id: 'retention-periods', num: '10', title: 'Data Retention Schedule', icon: Clock },
  { id: 'your-rights', num: '11', title: 'Your Legal Rights', icon: UserCheck },
  { id: 'cookies-analytics', num: '12', title: 'Cookies & Analytics Table', icon: Cookie },
  { id: 'children-changes', num: '13', title: 'Children & Policy Updates', icon: ShieldCheck },
  { id: 'contact-privacy', num: '14', title: 'Privacy Inquiries & Contact', icon: Mail },
];

const cookiesData = [
  {
    name: 'jooblie_site_cookie_consent',
    provider: 'Jooblie',
    category: 'Essential',
    purpose: 'Stores your cookie and privacy choices across visits',
    duration: 'Until cleared',
  },
  {
    name: '_ga, _ga_*',
    provider: 'Google Analytics',
    category: 'Analytics',
    purpose: 'Anonymous usage statistics and platform performance metrics',
    duration: '13 months',
  },
  {
    name: 'ph_phc_*_posthog',
    provider: 'PostHog (EU)',
    category: 'Analytics',
    purpose: 'Aggregated product analytics and feature interaction patterns',
    duration: '12 months',
  },
  {
    name: '__hstc, hubspotutk',
    provider: 'HubSpot (EU)',
    category: 'Analytics',
    purpose: 'Anonymous visitor interaction and engagement measurement',
    duration: '6 months',
  },
  {
    name: '__hssc, __hssrc',
    provider: 'HubSpot (EU)',
    category: 'Analytics',
    purpose: 'Session tracking and page sequence analysis',
    duration: '30 minutes or session',
  },
  {
    name: 'messagesUtk',
    provider: 'HubSpot (EU)',
    category: 'Functional',
    purpose: 'Helpdesk chat widget visitor continuity and message delivery',
    duration: '6 months',
  },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('who-we-are');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 220;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="privacy-page terms-page">
      {/* HEADER HERO WITH BEST-FIT PRIVACY IMAGE */}
      <header className="privacy-hero terms-hero" role="banner">
        <div className="terms-hero__overlay" aria-hidden="true" />
        <div className="container terms-hero__container">
          <Reveal className="terms-hero__content">
            <div className="terms-hero__badge">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Data Protection, GDPR and Trust Standards</span>
            </div>

            <h1 className="terms-hero__title">Privacy Policy</h1>

            <p className="terms-hero__subtitle">
              This policy explains how {SITE_NAME} collects, protects, processes, and respects personal data across our recruitment platform, applications, and verified services.
            </p>

            <div className="terms-hero__meta">
              <span className="terms-hero__meta-chip">
                <Calendar size={14} aria-hidden="true" />
                <span>Last updated: 16 October 2026</span>
              </span>
              <span className="terms-hero__meta-chip">
                <FileText size={14} aria-hidden="true" />
                <span>ICO Registration: ZC265262</span>
              </span>
              <span className="terms-hero__meta-chip">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>UK GDPR &amp; DPA 2018 Compliant</span>
              </span>
            </div>
          </Reveal>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="container terms-layout">
        {/* STICKY TABLE OF CONTENTS */}
        <aside className="terms-toc" aria-label="Table of contents">
          <div className="terms-toc__card">
            <h2 className="terms-toc__heading">Privacy Navigation</h2>
            <nav className="terms-toc__nav">
              <ul>
                {sections.map(({ id, num, title }) => (
                  <li key={id}>
                    <button
                      type="button"
                      className={`terms-toc__link ${activeSection === id ? 'is-active' : ''}`}
                      onClick={() => scrollTo(id)}
                    >
                      <span className="terms-toc__num">{num}</span>
                      <span className="terms-toc__label">{title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="terms-toc__support">
              <h3>Data Governance Desk</h3>
              <p>For data subject requests, redaction, or privacy concerns:</p>
              <a href="mailto:privacy@jooblie.com" className="terms-toc__support-item">
                <Mail size={13} aria-hidden="true" />
                <span>privacy@jooblie.com</span>
              </a>
              <a href="tel:+18339621150" className="terms-toc__support-item">
                <Phone size={13} aria-hidden="true" />
                <span>+1 833-962-1150</span>
              </a>
              <Link to="/contact" className="terms-toc__support-btn">
                <span>Privacy Request Form</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </aside>

        {/* DETAILED PRIVACY SECTIONS */}
        <main className="terms-body" id="privacy-content">
          {/* AT A GLANCE SUMMARY BOX */}
          <div className="terms-summary-card">
            <div className="terms-summary-card__header">
              <ShieldCheck size={20} className="terms-summary-card__icon" aria-hidden="true" />
              <h2>Summary of Privacy Commitments</h2>
            </div>
            <p className="terms-summary-card__lead">
              Our core privacy principles for job seekers, hiring teams, and platform visitors:
            </p>
            <div className="terms-summary-card__grid">
              <div className="terms-summary-card__item">
                <strong>We Never Sell Your Data</strong>
                <span>Personal data is strictly processed to power candidate discovery and verify platform records. We do not monetize your personal details.</span>
              </div>
              <div className="terms-summary-card__item">
                <strong>Transparent Verification</strong>
                <span>Location checks occur strictly at designated verification moments (such as clock-in/out). We do not track users continuously.</span>
              </div>
              <div className="terms-summary-card__item">
                <strong>Full Data Subject Rights</strong>
                <span>You can access, correct, export, or request deletion of your account and personal records at any time.</span>
              </div>
            </div>
          </div>

          {/* SECTION 1 */}
          <article id="who-we-are" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Building2 size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Who We Are and Data Controller Details</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                {SITE_NAME} Ltd is the data controller of your personal data processed through the platform. We are registered in England and Wales under company number 16336005, with our registered office situated at 20 Wenlock Road, London, England, N1 7GU.
              </p>
              <p>
                <strong>Information Commissioner&rsquo;s Office (ICO) Registration:</strong> ZC265262.
              </p>
              <p>
                You may contact our privacy and data governance team directly regarding data protection matters at <a href="mailto:privacy@jooblie.com">privacy@jooblie.com</a>. We have not formally appointed a Data Protection Officer because applicable UK data protection laws do not mandate one for an organization of our operational size and risk profile; however, senior management oversees all data protection compliance.
              </p>
            </div>
          </article>

          {/* SECTION 2 */}
          <article id="who-covered" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Users size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Who This Policy Covers</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                This Privacy Policy applies to the following categories of individuals:
              </p>
              <ul className="terms-list">
                <li>Job seekers, candidates, and workforce professionals who register an account or browse opportunities.</li>
                <li>Recruiters, hiring managers, and company administrators representing hiring organizations.</li>
                <li>Individuals who contact our support team or submit general platform inquiries.</li>
                <li>Business contacts at partner companies whom we contact regarding enterprise services.</li>
                <li>General visitors browsing the public website.</li>
              </ul>
            </div>
          </article>

          {/* SECTION 3 */}
          <article id="data-collected" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Database size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Data We Collect</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                We collect personal information necessary to deliver transparent recruitment and verification workflows:
              </p>
              <ul className="terms-list">
                <li><strong>Identity and Contact Details:</strong> Full name, professional headline, email address, telephone number, login credentials, and account role.</li>
                <li><strong>Verification and Compliance Checks:</strong> Government-issued identity documents, proof of address, right-to-work verification evidence, and visa status.</li>
                <li><strong>Professional Credentials and Work History:</strong> Resumes, employment history, education, trade certifications, licenses (such as CSCS/NVQ cards), and occupational health information (processed only with explicit consent or statutory obligation).</li>
                <li><strong>Work and Attendance Records:</strong> Shift availability, timestamps, activity logs, timesheets, and expense summaries.</li>
                <li><strong>Platform Communications:</strong> Messages, feedback notes, and inquiries sent through the platform interface.</li>
                <li><strong>Technical and Device Data:</strong> IP address, browser type, operating system, device identifiers, and platform navigation metrics.</li>
              </ul>
            </div>
          </article>

          {/* SECTION 4 */}
          <article id="how-used" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Briefcase size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>How We Use Your Data</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                At {SITE_NAME}, data processing is grounded in transparency, strict purpose limitation, and data minimization. We collect and process personal data exclusively to power the end-to-end recruitment lifecycle, facilitate trusted connections between candidates and employers, verify credentials, and guarantee the technical security and integrity of our marketplace.
              </p>

              {/* CORE PURPOSE PILLARS */}
              <div className="terms-card-grid-3">
                <div className="terms-feature-card">
                  <div className="terms-feature-card__header">
                    <div className="terms-feature-card__icon">
                      <Search size={18} aria-hidden="true" />
                    </div>
                    <h4 className="terms-feature-card__title">Talent &amp; Job Matching</h4>
                  </div>
                  <p className="terms-feature-card__text">
                    Connecting candidates with active job postings based on skills, location, work arrangements, and recruiter criteria.
                  </p>
                </div>

                <div className="terms-feature-card">
                  <div className="terms-feature-card__header">
                    <div className="terms-feature-card__icon">
                      <ShieldCheck size={18} aria-hidden="true" />
                    </div>
                    <h4 className="terms-feature-card__title">Verification &amp; Trust</h4>
                  </div>
                  <p className="terms-feature-card__text">
                    Validating right-to-work status, trade accreditations, and employer legitimacy to eliminate fraudulent listings and spam.
                  </p>
                </div>

                <div className="terms-feature-card">
                  <div className="terms-feature-card__header">
                    <div className="terms-feature-card__icon">
                      <Lock size={18} aria-hidden="true" />
                    </div>
                    <h4 className="terms-feature-card__title">Platform Security</h4>
                  </div>
                  <p className="terms-feature-card__text">
                    Preventing unauthorized access, enforcing session encryption, rate-limiting APIs, and protecting account confidentiality.
                  </p>
                </div>
              </div>

              <h3>
                <span className="terms-purpose-badge">1</span>
                Recruitment, Applications &amp; Job Matching
              </h3>
              <p>
                We use candidate profile information, resumes, and search history to operate our marketplace:
              </p>
              <ul className="terms-list">
                <li>
                  <strong>Application Delivery:</strong> When you apply for a position on {SITE_NAME}, your resume, contact information, cover notes, and relevant qualification documents are transmitted directly to the verified employer or recruiter managing that posting.
                </li>
                <li>
                  <strong>Skill &amp; Preference Alignment:</strong> We index skills, employment history, trade qualifications (such as CSCS cards or licenses), and compensation expectations to suggest relevant job postings to candidates and showcase qualified profiles to hiring organizations.
                </li>
                <li>
                  <strong>Application Lifecycle Tracking:</strong> We maintain structured records of application milestones (submitted, viewed, shortlisted, scheduled, offered, or declined) so both job seekers and recruiters can monitor progress transparently.
                </li>
                <li>
                  <strong>Candidate-Recruiter In-App Messaging:</strong> When candidates and employers communicate via platform tools, messages are stored securely to maintain audit history, prevent harassment, and assist in interview scheduling.
                </li>
              </ul>

              <h3>
                <span className="terms-purpose-badge">2</span>
                Account Administration &amp; Authentication Security
              </h3>
              <p>
                We process credentials and profile attributes to ensure secure account operations:
              </p>
              <ul className="terms-list">
                <li>
                  <strong>Session Management:</strong> Authenticating user logins, managing role-based access controls (Job Seeker, Employer/Recruiter, Portal Admin), and issuing secure, encrypted session tokens via Supabase Auth.
                </li>
                <li>
                  <strong>Security Verification:</strong> Delivering multi-factor authentication (MFA) codes, password reset verification links, and critical security notifications.
                </li>
                <li>
                  <strong>Profile Customization:</strong> Saving search preferences, bookmarking job opportunities, and preserving customized recruiter filter presets across sessions.
                </li>
              </ul>

              <h3>
                <span className="terms-purpose-badge">3</span>
                Identity Verification, Compliance &amp; Quality Standards
              </h3>
              <p>
                To maintain workplace safety, legal compliance, and community trust, we process verification records under strict safeguards:
              </p>
              <ul className="terms-list">
                <li>
                  <strong>Statutory Right-to-Work Checks:</strong> Where required by applicable labor legislation or hiring companies, we facilitate identity and work authorization checks through certified identity verification partners (e.g., Didit). We verify documents without retaining permanent biometric copies.
                </li>
                <li>
                  <strong>Trade &amp; Professional Certifications:</strong> Verifying validity dates for trade cards, safety credentials, and professional licenses to confirm compliance before candidates are deployed to specialized job sites.
                </li>
                <li>
                  <strong>Employer Entity Vetting:</strong> Verifying company registration numbers, official corporate domains, and hiring representative credentials to ensure all posted vacancies represent bona fide employment opportunities.
                </li>
              </ul>

              <h3>
                <span className="terms-purpose-badge">4</span>
                Shift Verification, Attendance &amp; Geofenced Moments
              </h3>
              <p>
                For shift-based and field-placement opportunities, {SITE_NAME} processes location coordinates strictly at designated verification moments:
              </p>
              <ul className="terms-list">
                <li>
                  <strong>Point-in-Time Check-In/Check-Out:</strong> Geographic coordinates are recorded solely when a worker clicks to clock in or clock out to confirm physical presence within the employer&rsquo;s designated job site perimeter.
                </li>
                <li>
                  <strong>No Continuous Tracking:</strong> We never track user locations continuously between shifts or in the background. Once a shift verification event is recorded, location sensors are immediately disengaged.
                </li>
                <li>
                  <strong>Automatic EXIF Metadata Removal:</strong> When photos or workplace documents are uploaded, our ingestion pipeline automatically scrubs embedded camera EXIF coordinates to protect residential and workplace privacy.
                </li>
              </ul>

              <h3>
                <span className="terms-purpose-badge">5</span>
                Communications, Notifications &amp; Service Updates
              </h3>
              <p>
                We use your contact details to keep you informed of critical milestones and optional platform opportunities:
              </p>
              <ul className="terms-list">
                <li>
                  <strong>Transactional Notifications:</strong> Automated notifications for application submissions, recruiter interview requests, subscription renewals, and security incident alerts. These essential operational notices cannot be opted out of while maintaining an active account.
                </li>
                <li>
                  <strong>Tailored Job Alerts:</strong> Optional email digests matching your search criteria, newly posted opportunities in your sector, and career advice dispatches. You can customize frequency or unsubscribe with a single click at any time.
                </li>
                <li>
                  <strong>Customer Support &amp; Inquiries:</strong> Resolving user support requests, handling feedback, and investigating technical issue tickets.
                </li>
              </ul>

              <h3>
                <span className="terms-purpose-badge">6</span>
                Platform Reliability, Analytics &amp; Fraud Prevention
              </h3>
              <p>
                To maintain high availability, detect vulnerabilities, and enhance platform experience:
              </p>
              <ul className="terms-list">
                <li>
                  <strong>Privacy-Preserving Telemetry:</strong> Aggregated page view analytics and job discovery metrics use de-identified fingerprinting to count listing views without persistently profiling individual visitors.
                </li>
                <li>
                  <strong>Automated Log Redaction:</strong> Application log pipelines (powered by Pino redaction standards) sanitize database queries and error dumps, ensuring authorization tokens, passwords, and sensitive PII are never written to diagnostic log files.
                </li>
                <li>
                  <strong>Abuse &amp; Scraping Prevention:</strong> Monitoring traffic patterns, IP reputation, and request velocity to mitigate DDoS attacks, prevent unauthorized web scraping of candidate information, and block brute-force password attempts.
                </li>
              </ul>

              <h3>
                <span className="terms-purpose-badge">7</span>
                Billing, Invoicing &amp; Subscription Fulfillment
              </h3>
              <p>
                For hiring organizations purchasing job listing packages or premium employer portals:
              </p>
              <ul className="terms-list">
                <li>
                  <strong>Secure Transaction Processing:</strong> Payment details are transmitted directly to PCI-DSS Level 1 certified processors (such as Stripe). {SITE_NAME} never sees or stores full credit card numbers or security CVVs on our databases.
                </li>
                <li>
                  <strong>Tax &amp; Accounting Compliance:</strong> Generating VAT/GST invoices, maintaining transaction records for statutory accounting periods (7 years), and managing corporate billing accounts.
                </li>
              </ul>

              {/* SUMMARY PROCESSING MATRIX TABLE */}
              <h3>Summary Matrix: How We Process Your Data Categories</h3>
              <div className="terms-table-wrapper">
                <table className="terms-table">
                  <thead>
                    <tr>
                      <th>Data Category</th>
                      <th>Primary Use &amp; Purpose</th>
                      <th>UK GDPR Lawful Basis</th>
                      <th>Privacy Safeguard</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Candidate Profile &amp; CV</strong></td>
                      <td>Job applications, recruiter matching, skills index</td>
                      <td><span className="terms-table-badge">Contract / Consent</span></td>
                      <td>Visible only to employers for applied roles or active search</td>
                    </tr>
                    <tr>
                      <td><strong>Identity &amp; Right-to-Work</strong></td>
                      <td>Statutory worker compliance and credential verification</td>
                      <td><span className="terms-table-badge">Legal Obligation</span></td>
                      <td>Encrypted transit &amp; storage; no biometric retention</td>
                    </tr>
                    <tr>
                      <td><strong>Shift Coordinates</strong></td>
                      <td>Confirming on-site presence at clock-in/out moments</td>
                      <td><span className="terms-table-badge">Contractual Necessity</span></td>
                      <td>Point-in-time check only; no background tracking</td>
                    </tr>
                    <tr>
                      <td><strong>Communications &amp; Messages</strong></td>
                      <td>Interview coordination, customer support, audit trail</td>
                      <td><span className="terms-table-badge">Legitimate Interests</span></td>
                      <td>Encrypted in transit (TLS 1.3); restricted staff access</td>
                    </tr>
                    <tr>
                      <td><strong>Technical &amp; Log Data</strong></td>
                      <td>Bot defense, platform stability, fraud detection</td>
                      <td><span className="terms-table-badge">Legitimate Interests</span></td>
                      <td>Automated PII redaction (Pino); rolling 1-2 year retention</td>
                    </tr>
                    <tr>
                      <td><strong>Payment &amp; Billing Info</strong></td>
                      <td>Subscription processing, VAT invoicing, accounting</td>
                      <td><span className="terms-table-badge">Contract / Legal Duty</span></td>
                      <td>Tokenized via PCI-DSS Level 1 provider (Stripe)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* NEGATIVE COMMITMENTS: WHAT WE NEVER DO */}
              <div className="terms-never-box">
                <div className="terms-never-box__title">
                  <ShieldCheck size={20} aria-hidden="true" />
                  <span>Our Data Integrity Commitments: What {SITE_NAME} NEVER Does</span>
                </div>
                <div className="terms-never-grid">
                  <div className="terms-never-item">
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <div>
                      <strong>We Never Sell Your Personal Data</strong>
                      <span>We do not sell, rent, monetize, or trade candidate profiles, contact numbers, or resume files to third-party data aggregators or advertisers.</span>
                    </div>
                  </div>
                  <div className="terms-never-item">
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <div>
                      <strong>No Automated Rejection Decisions</strong>
                      <span>We do not use automated algorithms that produce binding legal effects or reject applicants without human review. Final hiring choices always rest with real hiring teams.</span>
                    </div>
                  </div>
                  <div className="terms-never-item">
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <div>
                      <strong>No Continuous Background Tracking</strong>
                      <span>We never monitor your location in the background or track off-platform browsing behavior. Geolocation is restricted to explicit verification moments.</span>
                    </div>
                  </div>
                  <div className="terms-never-item">
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <div>
                      <strong>No Unsolicited Third-Party Cross-Marketing</strong>
                      <span>Your contact details are strictly reserved for platform service delivery and verified employer communications. We do not share emails with third-party marketing brokers.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* SECTION 5 */}
          <article id="lawful-bases" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <FileText size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Lawful Bases for Processing</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                Under UK GDPR and the Data Protection Act 2018, every processing activity is anchored to an approved lawful basis:
              </p>
              <div className="terms-compliance-grid">
                <div className="terms-compliance-item">
                  <h3>Contractual Necessity</h3>
                  <p>Processing required to fulfill our agreement with you, manage your user account, deliver applications, and provide recruitment technology tools.</p>
                </div>
                <div className="terms-compliance-item">
                  <h3>Legal Obligation</h3>
                  <p>Processing necessary to comply with statutory duties, including employment verification records, tax legislation (PAYE/CIS/IR35), and health and safety requirements.</p>
                </div>
                <div className="terms-compliance-item">
                  <h3>Legitimate Interests</h3>
                  <p>Processing necessary for system security, fraud prevention, service improvements, and targeted business-to-business communications. We maintain balanced legitimate interest assessments.</p>
                </div>
                <div className="terms-compliance-item">
                  <h3>Explicit Consent</h3>
                  <p>Where you have given clear affirmative consent, such as for non-essential cookies, optional marketing newsletters, or voluntary health disclosures. You may withdraw consent at any time.</p>
                </div>
              </div>
            </div>
          </article>

          {/* SECTION 6 */}
          <article id="location-verification" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <MapPin size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Verification and Location Data Handling</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                This section explains how {SITE_NAME} handles geographic and location data:
              </p>
              <ul className="terms-list">
                <li><strong>Verification Moments Only:</strong> When workforce members clock in or out, the mobile application records device coordinates (latitude, longitude, and accuracy radius). It records location solely at those specific moments. We do not track your location continuously during shifts.</li>
                <li><strong>Purpose:</strong> To confirm that the worker was physically present at the agreed job location. Participating hiring teams see whether clock-ins were verified against project coordinates.</li>
                <li><strong>If Location is Unavailable:</strong> If GPS is disabled or unavailable, we log the operational reason (such as permission refusal or timeout). Workers can still submit hours, which may be flagged for manual supervisor review.</li>
                <li><strong>EXIF Data Stripping:</strong> When users upload workplace photos or daily log documents, our ingestion pipeline re-encodes images and removes embedded metadata (including camera EXIF geographic coordinates).</li>
                <li><strong>Job Site Address Protection:</strong> Prior to candidate acceptance or formal engagement, job seekers see only general regional information (town, county, first half of postcode, rounded to approximately 1 km) to protect workplace privacy.</li>
              </ul>
            </div>
          </article>

          {/* SECTION 7 */}
          <article id="business-contacts" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Send size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Business Contacts and B2B Outreach</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                This section applies to representatives at corporate organizations who receive communications from our enterprise team:
              </p>
              <ul className="terms-list">
                <li><strong>Source of Information:</strong> Verified professional directories, commercial registries, and public corporate platforms (such as LinkedIn).</li>
                <li><strong>Data Retained:</strong> Name, professional title, corporate email, corporate phone, and company project details.</li>
                <li><strong>Lawful Basis:</strong> Legitimate interests for relevant business-to-business communications. We do not contact sole traders or partnerships without prior consent.</li>
                <li><strong>Opt-Out Mechanism:</strong> You can opt out immediately at any time by replying to any outreach message, clicking the unsubscribe link, or emailing <a href="mailto:privacy@jooblie.com">privacy@jooblie.com</a>. We will honor your opt-out immediately and maintain a suppression list to prevent future contact.</li>
              </ul>
            </div>
          </article>

          {/* SECTION 8 */}
          <article id="data-sharing" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Share2 size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Sharing with Third Parties</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                We share personal information strictly on a need-to-know basis under binding confidentiality and data protection agreements:
              </p>
              <ul className="terms-list">
                <li><strong>Participating Employers:</strong> Hiring teams review candidate applications, verified qualifications, and submitted work logs for opportunities to which you apply.</li>
                <li><strong>Cloud Infrastructure:</strong> Amazon Web Services (AWS London and AWS Stockholm data centers) for encrypted hosting and storage.</li>
                <li><strong>Identity Verification Partners:</strong> Verified identity partners (such as Didit) for processing passport and biometric right-to-work checks.</li>
                <li><strong>Payment Processors:</strong> Regulated payment gateways (such as Stripe) for secure financial transactions.</li>
                <li><strong>Statutory Authorities:</strong> Regulatory bodies (including HMRC, the Health and Safety Executive, and law enforcement agencies) where strictly required by law.</li>
              </ul>
            </div>
          </article>

          {/* SECTION 9 */}
          <article id="storage-security" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Lock size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Storage, Transfers and Security</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                Your data is stored securely in the United Kingdom and the European Economic Area (EEA).
              </p>
              <p>
                Where third-party service providers process data outside the UK or EEA, we ensure appropriate statutory safeguards are in place, including the UK International Data Transfer Agreement (IDTA), standard contractual clauses, or recognized adequacy regulations.
              </p>
              <p>
                All data in transit is encrypted using TLS 1.3, and data at rest is protected with AES-256 encryption alongside strict role-based access controls. In the unlikely event of a security incident that poses a risk to your rights, we will notify affected individuals and the ICO within 72 hours in compliance with legal requirements.
              </p>
            </div>
          </article>

          {/* SECTION 10 */}
          <article id="retention-periods" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Clock size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Data Retention Schedule</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                We retain personal data only for as long as necessary to fulfill statutory requirements and operational purposes:
              </p>
              <ul className="terms-list">
                <li><strong>Account and Financial Records:</strong> Retained for 7 years following account closure to comply with statutory accounting and tax regulations.</li>
                <li><strong>Identity and Right-to-Work Checks:</strong> Retained for 2 years following your last active platform session or engagement.</li>
                <li><strong>Operational Logs and Technical Records:</strong> Retained for 1 to 2 years for fraud prevention and system security.</li>
                <li><strong>Legal Claims and Dispute Records:</strong> Retained for the statutory duration required by applicable limitation acts.</li>
              </ul>
              <p>
                Upon the expiration of applicable retention periods, data is permanently deleted or irreversibly anonymized.
              </p>
            </div>
          </article>

          {/* SECTION 11 */}
          <article id="your-rights" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <UserCheck size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Your Legal Rights</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                Under UK data protection legislation, you enjoy comprehensive rights over your personal data:
              </p>
              <ul className="terms-list">
                <li><strong>Right of Access:</strong> You can request confirmation and a copy of all personal data we hold about you.</li>
                <li><strong>Right to Rectification:</strong> You may correct inaccurate or incomplete personal information.</li>
                <li><strong>Right to Erasure (Right to be Forgotten):</strong> You can request deletion of your account and personal records where statutory retention requirements have expired.</li>
                <li><strong>Right to Restrict or Object:</strong> You can restrict specific processing activities or object to processing based on legitimate interests.</li>
                <li><strong>Right to Data Portability:</strong> You can request your digital records in structured, machine-readable formats (PDF or CSV).</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at <a href="mailto:privacy@jooblie.com">privacy@jooblie.com</a>. You also have the right to lodge a complaint with the UK Information Commissioner&rsquo;s Office at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk <ExternalLink size={12} style={{ display: 'inline' }} /></a>.
              </p>
            </div>
          </article>

          {/* SECTION 12 */}
          <article id="cookies-analytics" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Cookie size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Cookies and Analytics Table</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                Essential cookies required for platform functionality are always active. Non-essential analytical and functional cookies load only if you provide consent through our cookie preferences banner.
              </p>

              <div className="terms-table-wrapper">
                <table className="terms-table">
                  <thead>
                    <tr>
                      <th>Cookie Name</th>
                      <th>Provider</th>
                      <th>Category</th>
                      <th>Purpose</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cookiesData.map((cookie) => (
                      <tr key={cookie.name}>
                        <td><code>{cookie.name}</code></td>
                        <td>{cookie.provider}</td>
                        <td><span className="terms-table-badge">{cookie.category}</span></td>
                        <td>{cookie.purpose}</td>
                        <td>{cookie.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: '16px' }}>
                Disabling analytics or marketing cookies does not impair core platform capabilities, job searching, or application workflows.
              </p>
            </div>
          </article>

          {/* SECTION 13 */}
          <article id="children-changes" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <ShieldCheck size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Children and Policy Updates</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                {SITE_NAME} is intended exclusively for individuals aged 18 and older. We do not knowingly collect personal information from individuals under 18 years of age. If we learn that personal data of a minor has been submitted, we take immediate steps to delete that information.
              </p>
              <p>
                We may periodically update this Privacy Policy to reflect evolving legal, regulatory, or technical standards. Material updates will be highlighted on the platform or communicated directly to registered account holders.
              </p>
            </div>
          </article>

          {/* SECTION 14 */}
          <article id="contact-privacy" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Mail size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Privacy Inquiries and Contact</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                If you have questions, subject access requests, or privacy concerns regarding this policy, please reach out to our privacy team:
              </p>
              <div className="terms-contact-card">
                <div className="terms-contact-card__item">
                  <strong>Privacy Officer</strong>
                  <a href="mailto:privacy@jooblie.com">privacy@jooblie.com</a>
                </div>
                <div className="terms-contact-card__item">
                  <strong>Support Helpdesk</strong>
                  <a href="mailto:Info@jooblie.com">Info@jooblie.com</a>
                </div>
                <div className="terms-contact-card__item">
                  <strong>Telephone Assistance</strong>
                  <a href="tel:+18339621150">+1 833-962-1150</a>
                </div>
                <div className="terms-contact-card__item">
                  <strong>ICO Reference</strong>
                  <span>Registration: ZC265262</span>
                </div>
              </div>
            </div>
          </article>

          {/* RELATED LEGAL & PLATFORM LINKS */}
          <nav className="terms-related" aria-label="Related platform pages">
            <span className="terms-related__title">Explore Legal Documentation:</span>
            <div className="terms-related__links">
              <Link to="/terms">Terms &amp; Conditions</Link>
              <span className="terms-related__sep">&bull;</span>
              <Link to="/contact">Contact Support</Link>
              <span className="terms-related__sep">&bull;</span>
              <Link to="/about">About {SITE_NAME}</Link>
              <span className="terms-related__sep">&bull;</span>
              <Link to="/all-jobs">Browse Opportunities</Link>
            </div>
          </nav>
        </main>
      </div>
    </div>
  );
}
