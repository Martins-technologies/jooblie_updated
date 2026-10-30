import { Link } from 'react-router-dom';
import { Calendar, FileText, Mail, ShieldCheck } from 'lucide-react';
import Reveal from '../../shared/components/Reveal';
import policyContent from '../content/policyContent.json';

function splitIntoReadableParagraphs(text) {
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z““●])/u)
    .map((part) => part.trim())
    .filter(Boolean);

  const paragraphs = [];
  for (let index = 0; index < sentences.length; index += 3) {
    paragraphs.push(sentences.slice(index, index + 3).join(' '));
  }
  return paragraphs.length ? paragraphs : [text];
}

export default function LegalPolicyPage({ policyKey, eyebrow, related }) {
  const policy = policyContent[policyKey];

  return (
    <div className={`terms-page ${policyKey === 'privacy' ? 'privacy-page' : ''}`}>
      <header className={`terms-hero ${policyKey === 'privacy' ? 'privacy-hero' : ''}`} role="banner">
        <div className="terms-hero__overlay" aria-hidden="true" />
        <div className="container terms-hero__container">
          <Reveal className="terms-hero__content">
            <div className="terms-hero__badge">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>{eyebrow}</span>
            </div>
            <h1 className="terms-hero__title">{policy.title}</h1>
            <p className="terms-hero__subtitle">{policy.subtitle}</p>
            <div className="terms-hero__meta">
              <span className="terms-hero__meta-chip">
                <Calendar size={14} aria-hidden="true" />
                <span>Effective: {policy.effectiveDate}</span>
              </span>
              <span className="terms-hero__meta-chip">
                <FileText size={14} aria-hidden="true" />
                <span>{policy.sections.length} sections</span>
              </span>
            </div>
          </Reveal>
        </div>
      </header>

      <div className="container terms-layout">
        <aside className="terms-toc" aria-label={`${policy.title} navigation`}>
          <div className="terms-toc__card">
            <h2 className="terms-toc__heading">On this page</h2>
            <nav className="terms-toc__nav">
              <ul>
                {policy.sections.map((section) => (
                  <li key={section.number}>
                    <a className="terms-toc__link" href={`#${policyKey}-section-${section.number}`}>
                      <span className="terms-toc__num">{String(section.number).padStart(2, '0')}</span>
                      <span className="terms-toc__label">{section.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="terms-toc__support">
              <h3>Questions about this policy?</h3>
              <p>Contact Jooblie for questions or requests related to this document.</p>
              <a href="mailto:info@jooblie.com" className="terms-toc__support-item">
                <Mail size={13} aria-hidden="true" />
                <span>info@jooblie.com</span>
              </a>
            </div>
          </div>
        </aside>

        <main className="terms-body" id={`${policyKey}-content`}>
          <section className="terms-summary-card" aria-labelledby={`${policyKey}-notice-title`}>
            <div className="terms-summary-card__header">
              <ShieldCheck size={20} className="terms-summary-card__icon" aria-hidden="true" />
              <h2 id={`${policyKey}-notice-title`}>Key Notice</h2>
            </div>
            <p className="terms-summary-card__lead">{policy.notice}</p>
            <p className="terms-policy-meta">{policy.publisherLine}</p>
          </section>

          {policy.sections.map((section) => (
            <article
              id={`${policyKey}-section-${section.number}`}
              className="terms-section"
              key={section.number}
            >
              <header className="terms-section__header">
                <div className="terms-section__title-wrap">
                  <span className="terms-purpose-badge" aria-hidden="true">
                    {String(section.number).padStart(2, '0')}
                  </span>
                  <h2>{section.title}</h2>
                </div>
              </header>
              <div className="terms-section__content">
                {splitIntoReadableParagraphs(section.text).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}

          <nav className="terms-related" aria-label="Related policy pages">
            <span className="terms-related__title">Related information</span>
            <div className="terms-related__links">
              {related.map((item, index) => (
                <span key={item.to}>
                  {index > 0 && <span className="terms-related__sep" aria-hidden="true">·</span>}
                  <Link to={item.to}>{item.label}</Link>
                </span>
              ))}
              <span className="terms-related__sep" aria-hidden="true">·</span>
              <Link to="/contact">Contact Jooblie</Link>
            </div>
          </nav>
        </main>
      </div>
    </div>
  );
}
