import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  UserCheck,
  Briefcase,
  FileCheck2,
  ShieldAlert,
  Scale,
  Globe,
  Ban,
  AlertTriangle,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  Phone,
  ArrowUpRight,
  Gavel,
  Landmark,
  CreditCard,
  HardHat,
} from 'lucide-react';
import Reveal from '../../shared/components/Reveal';
import { SITE_NAME } from '../../shared/config/site';

const sections = [
  { id: 'introduction-operator', num: '01', title: 'Introduction & Operator', icon: Building2 },
  { id: 'platform-scope', num: '02', title: 'Platform Role & Scope', icon: Briefcase },
  { id: 'eligibility-accounts', num: '03', title: 'Eligibility & Accounts', icon: UserCheck },
  { id: 'access-availability', num: '04', title: 'Access & Availability', icon: Globe },
  { id: 'verification-records', num: '05', title: 'Verification & Records', icon: FileCheck2 },
  { id: 'projects-rates', num: '06', title: 'Roles, Rates & Engagement', icon: Landmark },
  { id: 'compliance-legal', num: '07', title: 'Compliance & Legal Duties', icon: HardHat },
  { id: 'payments-finance', num: '08', title: 'Payments & Financial Matters', icon: CreditCard },
  { id: 'acceptable-use', num: '09', title: 'Acceptable Use & Security', icon: ShieldAlert },
  { id: 'intellectual-property', num: '10', title: 'Intellectual Property', icon: Scale },
  { id: 'liability-indemnity', num: '11', title: 'Limitation of Liability', icon: AlertTriangle },
  { id: 'termination-closure', num: '12', title: 'Termination & Closure', icon: Ban },
  { id: 'disputes-law', num: '13', title: 'Dispute Resolution & Law', icon: Gavel },
  { id: 'contact-notices', num: '14', title: 'Legal Notices & Contact', icon: Mail },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('introduction-operator');

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
    <div className="terms-page">
      {/* HEADER HERO WITH BEST-FIT IMAGE */}
      <header className="terms-hero" role="banner">
        <div className="terms-hero__overlay" aria-hidden="true" />
        <div className="container terms-hero__container">
          <Reveal className="terms-hero__content">
            <div className="terms-hero__badge">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Platform Agreement and Operational Rules</span>
            </div>

            <h1 className="terms-hero__title">Terms &amp; Conditions</h1>

            <p className="terms-hero__subtitle">
              These Terms and Conditions govern access to and use of the {SITE_NAME} recruitment and structured opportunity access platform operated by {SITE_NAME} Ltd.
            </p>

            <div className="terms-hero__meta">
              <span className="terms-hero__meta-chip">
                <Calendar size={14} aria-hidden="true" />
                <span>Last updated: 28 February 2026</span>
              </span>
              <span className="terms-hero__meta-chip">
                <FileText size={14} aria-hidden="true" />
                <span>Version 2.4 (Current)</span>
              </span>
              <span className="terms-hero__meta-chip">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Legally Binding Agreement</span>
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
            <h2 className="terms-toc__heading">Table of Contents</h2>
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
              <h3>Legal &amp; Compliance Desk</h3>
              <p>For questions regarding terms, operational standards, or user compliance:</p>
              <a href="mailto:legal@jooblie.com" className="terms-toc__support-item">
                <Mail size={13} aria-hidden="true" />
                <span>legal@jooblie.com</span>
              </a>
              <a href="tel:+18339621150" className="terms-toc__support-item">
                <Phone size={13} aria-hidden="true" />
                <span>+1 833-962-1150</span>
              </a>
              <Link to="/contact" className="terms-toc__support-btn">
                <span>Contact Helpdesk</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </aside>

        {/* DETAILED LEGAL SECTIONS */}
        <main className="terms-body" id="terms-content">
          {/* AT A GLANCE SUMMARY BOX */}
          <div className="terms-summary-card">
            <div className="terms-summary-card__header">
              <ShieldCheck size={20} className="terms-summary-card__icon" aria-hidden="true" />
              <h2>Summary of Core Commitments</h2>
            </div>
            <p className="terms-summary-card__lead">
              A clear overview of how {SITE_NAME} operates for job seekers, workforce professionals, and hiring organizations:
            </p>
            <div className="terms-summary-card__grid">
              <div className="terms-summary-card__item">
                <strong>Neutral Technology Gateway</strong>
                <span>{SITE_NAME} provides digital infrastructure connecting candidates and companies directly. We are not an employment agency or labour supplier.</span>
              </div>
              <div className="terms-summary-card__item">
                <strong>Transparent Hiring Terms</strong>
                <span>Employers set accurate roles, rates, and scopes. All agreements and engagements remain solely between the participating parties.</span>
              </div>
              <div className="terms-summary-card__item">
                <strong>Strict Legal Compliance</strong>
                <span>All users must uphold statutory employment laws, tax responsibilities (PAYE/IR35/CIS), safety standards, and verified right to work.</span>
              </div>
            </div>
          </div>

          {/* SECTION 1 */}
          <article id="introduction-operator" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Building2 size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Introduction and Operator</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                These Terms and Conditions govern your access to and use of the {SITE_NAME} platform, including all related websites, applications, software, and services operated by {SITE_NAME} Ltd, a private limited company registered in England and Wales (company number 16336005, registered office: 20 Wenlock Road, London, England, N1 7GU) (&ldquo;{SITE_NAME}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
              </p>
              <p>
                {SITE_NAME} is an operating system for modern opportunity access. It provides digital infrastructure that enables companies and the workforce to connect directly around structured opportunities and project work. {SITE_NAME} is not an employment agency, labour supplier, recruiter, payroll provider, or intermediary under IR35 or CIS regulations.
              </p>
              <p>
                By registering, accessing, or using {SITE_NAME} (including clicking &ldquo;I Agree&rdquo; or similar), you agree to be bound by these Terms and Conditions. If you are accessing on behalf of a company, you represent that you have authority to bind that entity. We may update these Terms from time to time; continued use constitutes acceptance. Significant changes will be notified via email or in-app notices.
              </p>
              <div className="terms-callout terms-callout--info">
                <strong>Binding Agreement:</strong> These Terms form a legally binding agreement between you and {SITE_NAME} Ltd. If you do not agree to these Terms, you must not access or use the platform.
              </div>
            </div>
          </article>

          {/* SECTION 2 */}
          <article id="platform-scope" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Briefcase size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Platform Role and Scope</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                {SITE_NAME} provides a technology platform only, facilitating direct connections without active matching or intervention.
              </p>
              <p>
                <strong>We enable:</strong>
              </p>
              <ul className="terms-list">
                <li>Companies to structure opportunities, define roles, compensation rates, and operational timeframes.</li>
                <li>Workforce users and job seekers to access opportunities and manage availability.</li>
                <li>Attendance verification, activity logging, and record-keeping tools.</li>
                <li>Centralised project, application, and talent records.</li>
              </ul>
              <p>
                <strong>{SITE_NAME} does not:</strong>
              </p>
              <ul className="terms-list">
                <li>Employ workers (unless explicitly engaged under a direct written contract with {SITE_NAME} Ltd).</li>
                <li>Supply agency labour or temporary workforce.</li>
                <li>Act as an agent for either party.</li>
                <li>Guarantee work, engagement, interviews, or income.</li>
                <li>Control on-site working conditions, workplace supervision, or direction.</li>
                <li>Provide legal advice or assume responsibility for user compliance.</li>
              </ul>
              <p>
                {SITE_NAME}&rsquo;s tools (for example, status tracking or timesheet logs) are provided for operational support only and do not constitute formal legal determinations. The platform is designed as a neutral facilitator, and all interactions, contracts, or agreements are solely between users.
              </p>
            </div>
          </article>

          {/* SECTION 3 */}
          <article id="eligibility-accounts" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <UserCheck size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Eligibility and Accounts</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                You must be at least 18 years old, have the legal right to work in the relevant jurisdiction (such as the UK), and hold any required professional certifications (such as trade or CSCS cards where applicable) to use {SITE_NAME}.
              </p>
              <p>
                <strong>You are responsible for:</strong>
              </p>
              <ul className="terms-list">
                <li>Maintaining accurate account information, including right-to-work verification.</li>
                <li>Safeguarding login credentials, passwords, and multi-factor authentication tokens.</li>
                <li>All activity conducted through your account, including by authorized sub-users (such as company admins or hiring managers).</li>
              </ul>
              <p>
                {SITE_NAME} reserves the right to suspend or terminate accounts that provide false information, misuse the platform, or breach these Terms, with reasonable notice where feasible. We may require additional identity verification at any time to ensure compliance with applicable employment and immigration laws.
              </p>
            </div>
          </article>

          {/* SECTION 4 */}
          <article id="access-availability" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Globe size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Access and Platform Availability</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                Access to {SITE_NAME} may be limited, staged, or invitation-based during specific feature rollouts. During staged releases, access may be modified or revoked if it no longer aligns with operational goals, with notice provided where possible.
              </p>
              <p>
                We do not guarantee uninterrupted availability and may modify, suspend, or discontinue features to improve performance, security, or compliance. Downtime due to force majeure events (such as strikes, natural disasters, telecommunications outages, supply chain disruptions, pandemics, or extreme weather) carries no liability. We strive to maintain high availability but are not responsible for any losses arising from unexpected service unavailability.
              </p>
            </div>
          </article>

          {/* SECTION 5 */}
          <article id="verification-records" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <FileCheck2 size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Workforce Verification and Records</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                {SITE_NAME} may collect and display verification information, including:
              </p>
              <ul className="terms-list">
                <li>Identity checks and photographic documentation.</li>
                <li>Professional certifications, trade qualifications, and card credentials.</li>
                <li>Attendance records, shift logs, and verification timestamps.</li>
                <li>Candidate ratings, evaluations, and historical work records.</li>
              </ul>
              <p>
                Verification on the platform does not constitute an endorsement, warranty, or guarantee of candidate performance, suitability, or statutory compliance.
              </p>
              <p>
                Records generated through {SITE_NAME} are user-input digital representations and do not replace legal, contractual, or statutory obligations. Users can request to export records via the platform (in standard formats such as PDF or CSV, processed within 7 business days where feasible). These records are provided as-is, and users must independently verify their accuracy before using them for audit or legal purposes.
              </p>
            </div>
          </article>

          {/* SECTION 6 */}
          <article id="projects-rates" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Landmark size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Roles, Rates and Engagement</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                Hiring organizations define project roles, compensation rates, and commercial terms within the platform, including any relevant tax classifications (such as IR35 or CIS considerations).
              </p>
              <p>
                {SITE_NAME} does not set rates, negotiate terms, or enforce payments between users. Any disputes relating to engagement, payment, performance, or termination must be resolved directly between the parties involved. {SITE_NAME} may, at its discretion, provide optional mediation tools but is under no obligation to intervene. Users are encouraged to document all contractual agreements independently.
              </p>
            </div>
          </article>

          {/* SECTION 7 */}
          <article id="compliance-legal" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <HardHat size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Compliance and Legal Responsibilities</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                Users are solely responsible for ensuring compliance with all applicable statutory laws, regulations, and industry standards. This includes, without limitation, the following detailed obligations:
              </p>

              <div className="terms-compliance-grid">
                <div className="terms-compliance-item">
                  <h3>Employment Law Compliance</h3>
                  <p>
                    You must comply with all applicable employment laws, including the Employment Rights Act 1996, Working Time Regulations 1998, and National Minimum Wage Act 1998. For workforce members classified as employees or workers, this includes ensuring appropriate rest breaks, holiday entitlements, and statutory protections. Companies must not misclassify workers to avoid employment obligations. {SITE_NAME} does not determine employment status and disclaims liability for misclassification claims.
                  </p>
                </div>

                <div className="terms-compliance-item">
                  <h3>Tax Obligations</h3>
                  <p>
                    You are responsible for all tax-related matters, including self-assessment, PAYE, and National Insurance contributions under the Social Security Contributions and Benefits Act 1992. Workers must report income accurately to HMRC, and companies must withhold statutory taxes where required. {SITE_NAME}&rsquo;s tools assist in record-keeping but do not fulfill tax filing duties.
                  </p>
                </div>

                <div className="terms-compliance-item">
                  <h3>IR35 and Off-Payroll Working Rules</h3>
                  <p>
                    Under the Income Tax (Earnings and Pensions) Act 2003 (as amended), companies must assess IR35 status for each engagement and provide a Status Determination Statement (SDS). Workforce users must challenge inaccurate SDS via official HMRC processes. {SITE_NAME} does not perform IR35 determinations, issue SDS, or act as an intermediary. Users must retain audit records for at least 6 years.
                  </p>
                </div>

                <div className="terms-compliance-item">
                  <h3>Construction Industry Scheme (CIS)</h3>
                  <p>
                    Companies engaging subcontractors must register as contractors under the Finance Act 2004 and deduct CIS tax unless gross payment status applies. Workers must provide verified CIS details. {SITE_NAME} does not handle CIS deductions or HMRC returns. Users must submit required returns and retain records for 3 years post-contract.
                  </p>
                </div>

                <div className="terms-compliance-item">
                  <h3>Health and Safety Requirements</h3>
                  <p>
                    Compliance with the Health and Safety at Work etc. Act 1974, Construction (Design and Management) Regulations 2015 (CDM), and relevant standards is mandatory. Companies must conduct risk assessments, provide PPE, and maintain safe environments. Workers must report hazards and observe site rules. {SITE_NAME} disclaims liability for on-site safety incidents.
                  </p>
                </div>

                <div className="terms-compliance-item">
                  <h3>Right-to-Work and Immigration</h3>
                  <p>
                    Under the Immigration, Asylum and Nationality Act 2006, companies must verify right to work in the UK before engagement, retaining copies for at least 2 years post-engagement. Workers must provide valid proof (passports, share codes, biometric permits). Non-compliance may result in civil penalties up to statutory maximums.
                  </p>
                </div>

                <div className="terms-compliance-item">
                  <h3>Anti-Modern Slavery Standards</h3>
                  <p>
                    In accordance with the Modern Slavery Act 2015, qualifying commercial organizations must maintain supply chains free from forced labour and human trafficking. All users must immediately report suspected exploitation. {SITE_NAME} maintains zero tolerance for modern slavery.
                  </p>
                </div>

                <div className="terms-compliance-item">
                  <h3>VAT, Invoicing and Insurance</h3>
                  <p>
                    Users must comply with the Value Added Tax Act 1994, including reverse charge mechanisms and issuing VAT invoices within 30 days. Companies must maintain compulsory employers&rsquo; liability insurance (minimum &pound;5 million) and public liability insurance. {SITE_NAME} does not verify coverage.
                  </p>
                </div>
              </div>

              <div className="terms-callout terms-callout--disclaimer">
                <strong>Independent Legal Advice:</strong> {SITE_NAME} provides workflow tools but assumes no legal responsibility for regulatory compliance outcomes. Users must obtain independent legal, accounting, and tax counsel.
              </div>
            </div>
          </article>

          {/* SECTION 8 */}
          <article id="payments-finance" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <CreditCard size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Payments and Financial Matters</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                {SITE_NAME} does not guarantee payment, timing, or settlement of funds between employers and candidates unless explicitly set forth in a separate written corporate agreement.
              </p>
              <p>
                Any financial processing services made available through third-party partners (such as Stripe or verified banking gateways) are governed exclusively by those partners&rsquo; operating terms, and {SITE_NAME} disclaims liability for partner delays or errors. Users are responsible for managing financial arrangements directly and keeping banking credentials secure.
              </p>
            </div>
          </article>

          {/* SECTION 9 */}
          <article id="acceptable-use" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <ShieldAlert size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Acceptable Use and Platform Security</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                You agree not to engage in any activity that undermines the integrity, security, or fair operation of the platform. You specifically agree not to:
              </p>
              <ul className="terms-list">
                <li>Misuse the platform through harassment, abusive conduct, discrimination, or threats.</li>
                <li>Circumvent platform authentication, security controls, or user privacy protections.</li>
                <li>Harvest, scrape, or extract candidate contact details or resumes without authorization.</li>
                <li>Misrepresent identity, professional certifications, right-to-work status, or company authority.</li>
                <li>Use {SITE_NAME} for unlawful purposes, including sharing unauthorized confidential project drawings or proprietary data.</li>
                <li>Engage in spamming, phishing, distributing malware, or infringing third-party intellectual property rights.</li>
              </ul>
              <p>
                {SITE_NAME} reserves the right to investigate and take action against misuse, including immediate account termination without refund and reporting unlawful conduct to law enforcement or statutory regulators.
              </p>
            </div>
          </article>

          {/* SECTION 10 */}
          <article id="intellectual-property" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Scale size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Intellectual Property</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                All platform software, user interface designs, logos, trademarks, database structures, and proprietary materials belong exclusively to {SITE_NAME} Ltd.
              </p>
              <p>
                Users retain full ownership of their personal content, resumes, and project documentation. By submitting content through the platform, you grant {SITE_NAME} a worldwide, perpetual, royalty-free license to use, host, store, process, and display that content solely for platform operation, continuous improvement, and statutory compliance. This includes generating anonymized, aggregated data for product analytics. Users must not upload content that infringes third-party rights.
              </p>
            </div>
          </article>

          {/* SECTION 11 */}
          <article id="liability-indemnity" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <AlertTriangle size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Limitation of Liability and Indemnity</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                To the fullest extent permitted by applicable law, {SITE_NAME} shall not be liable for:
              </p>
              <ul className="terms-list">
                <li>Loss of income, profits, contracts, or business opportunities.</li>
                <li>Disputes, conflicts, or broken agreements between platform users.</li>
                <li>On-site accidents, personal injuries, or property damage during engagements.</li>
                <li>Business interruption or data loss resulting from maintenance or force majeure.</li>
                <li>Indirect, special, or consequential damages of any kind.</li>
              </ul>
              <p>
                Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, fraud, or fraudulent misrepresentation, or any other liability that cannot be excluded under UK law (including the Consumer Rights Act 2015). Use of the platform is at your sole risk. Total aggregate liability is limited to the fees paid by you to {SITE_NAME} in the 12 months preceding the claim.
              </p>
              <p>
                <strong>Indemnity:</strong> You agree to indemnify, defend, and hold harmless {SITE_NAME} Ltd, its directors, officers, and employees against any claims, fines, liabilities, losses, or legal expenses arising from your misuse of the platform, breach of these Terms, or violation of third-party rights.
              </p>
            </div>
          </article>

          {/* SECTION 12 */}
          <article id="termination-closure" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Ban size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Termination and Account Closure</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                You may close your account at any time, with data export available upon request in accordance with our Privacy Policy. {SITE_NAME} may suspend or terminate your access with notice (where feasible) for breach of these Terms, legal risk, fraudulent activity, or prolonged inactivity.
              </p>
              <p>
                Post-termination, records may be retained as required by tax, employment, and statutory regulations. Certain clauses (including intellectual property licenses, indemnity, limitation of liability, and dispute resolution) survive termination. Upon termination, all rights granted to access the platform immediately cease.
              </p>
            </div>
          </article>

          {/* SECTION 13 */}
          <article id="disputes-law" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Gavel size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Dispute Resolution and Governing Law</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                Any dispute arising out of or in connection with these Terms shall first be addressed through good-faith negotiation between the parties. If unresolved within 30 days, the parties agree to consider mediation (such as through the Centre for Effective Dispute Resolution, CEDR) before initiating court proceedings.
              </p>
              <p>
                These Terms, and any non-contractual obligations arising from them, are governed by and construed in accordance with the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction to settle any dispute. Users agree to waive any class action participation.
              </p>
              <p>
                <strong>Amendments:</strong> We may amend these Terms with at least 30 days notice for material changes, provided via email or in-platform announcement. Continued use following the effective date constitutes acceptance of amended Terms.
              </p>
            </div>
          </article>

          {/* SECTION 14 */}
          <article id="contact-notices" className="terms-section">
            <div className="terms-section__header">
              <div className="terms-section__title-wrap">
                <Mail size={22} className="terms-section__icon" aria-hidden="true" />
                <h2>Legal Notices and Contact</h2>
              </div>
            </div>
            <div className="terms-section__content">
              <p>
                For legal inquiries, regulatory questions, or compliance notifications regarding these Terms:
              </p>
              <div className="terms-contact-card">
                <div className="terms-contact-card__item">
                  <strong>Legal Department</strong>
                  <a href="mailto:legal@jooblie.com">legal@jooblie.com</a>
                </div>
                <div className="terms-contact-card__item">
                  <strong>Support Helpdesk</strong>
                  <a href="mailto:support@jooblie.com">support@jooblie.com</a>
                </div>
                <div className="terms-contact-card__item">
                  <strong>Telephone Assistance</strong>
                  <a href="tel:+18339621150">+1 833-962-1150</a>
                </div>
                <div className="terms-contact-card__item">
                  <strong>Registered Office</strong>
                  <span>20 Wenlock Road, London, England, N1 7GU</span>
                </div>
              </div>
            </div>
          </article>

          {/* RELATED LEGAL & PLATFORM LINKS */}
          <nav className="terms-related" aria-label="Related platform pages">
            <span className="terms-related__title">Explore Legal Documentation:</span>
            <div className="terms-related__links">
              <Link to="/privacy">Privacy Policy</Link>
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
