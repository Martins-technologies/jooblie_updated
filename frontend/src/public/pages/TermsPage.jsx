import PageHero from '../../shared/components/PageHero';
import PageSection from '../../shared/components/PageSection';

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of Use" text="Placeholder route for the approved Jooblie terms." />
      <PageSection containerClassName="narrow content-card prose-card">
        <p>The final legal copy has not been provided in the homepage handoff. Replace this placeholder with approved terms before production launch.</p>
      </PageSection>
    </>
  );
}
