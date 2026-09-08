import PageHero from '../components/PageHero';
import PageSection from '../components/PageSection';

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Jooblie"
        title="One platform for specialist hiring"
        text="Jooblie is the central entry point for job seekers and employers, connected to focused hiring categories."
      />
      <PageSection containerClassName="narrow prose-card content-card">
        <h2>How the ecosystem works</h2>
        <p>Jooblie brings current openings into one searchable experience while specialist category journeys can connect users to focused areas such as IT & Software, Office & Admin, Restaurant, Agriculture, and Trucking.</p>
        <p>Public pages are designed to use live backend data instead of sample company names, salaries, locations, or job totals.</p>
      </PageSection>
    </>
  );
}
