import PageHero from '../components/PageHero';
import PageSection from '../components/PageSection';

const faqs = [
  ['How do I find a job?', 'Open Find Jobs, enter keywords or a company, add a location if useful, then apply the supported filters.'],
  ['Why can’t I see a job?', 'The public frontend only shows active openings. Closed, paused, archived, or unavailable jobs are hidden.'],
  ['How do employers post?', 'Use Post a Job. The frontend submits a pending opening and the backend remains responsible for approval and channel rules.'],
  ['Where do category jobs come from?', 'Category pages filter the shared backend data and can also be configured to point to specialist portal destinations.'],
];

export default function HelpPage() {
  return (
    <>
      <PageHero
        eyebrow="Help center"
        title="Using Jooblie"
        text="Quick answers for the main job seeker and employer flows."
      />
      <PageSection containerClassName="faq-grid" stagger>
        {faqs.map(([q, a]) => <Faq key={q} q={q} a={a} />)}
      </PageSection>
    </>
  );
}

function Faq({ q, a }) {
  return <article className="content-card faq-card"><h2>{q}</h2><p>{a}</p></article>;
}
