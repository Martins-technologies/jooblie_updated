import PageHero from '../components/PageHero';
import PageSection from '../components/PageSection';

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" text="Placeholder route for the approved Jooblie privacy policy." />
      <PageSection containerClassName="narrow content-card prose-card">
        <p>The final legal copy has not been provided in the homepage handoff. Replace this placeholder with approved privacy content before production launch.</p>
      </PageSection>
    </>
  );
}
