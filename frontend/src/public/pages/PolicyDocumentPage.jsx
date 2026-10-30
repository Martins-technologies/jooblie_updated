import PageHero from '../../shared/components/PageHero';
import PageSection from '../../shared/components/PageSection';

export default function PolicyDocumentPage({ title, description, file }) {
  const src = `/policies/${file}`;

  return (
    <>
      <PageHero eyebrow="Legal" title={title} text={description} />
      <PageSection containerClassName="narrow content-card prose-card">
        <div className="policy-document-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <a href={src} target="_blank" rel="noreferrer">Open policy PDF</a>
          <a href={src} download>Download PDF</a>
        </div>
        <iframe
          className="policy-document-frame"
          src={src}
          title={title}
          loading="lazy"
          style={{ display: 'block', width: '100%', minHeight: 'min(78vh, 980px)', border: '1px solid #dce5f1', borderRadius: 12, background: '#fff' }}
        />
        <p className="policy-document-fallback" style={{ color: '#5f718b', fontSize: 14 }}>
          If the document does not display in your browser, use “Open policy PDF” above.
        </p>
      </PageSection>
    </>
  );
}
