import { BriefcaseBusiness, FileCheck2, Search, UserRoundCheck } from 'lucide-react';
import PageHero from '../../shared/components/PageHero';
import PageSection from '../../shared/components/PageSection';

const resources = [
  { icon: Search, title: 'Searching for jobs', text: 'Use clear keywords, location, job type, work arrangement, and date filters to narrow current openings.' },
  { icon: FileCheck2, title: 'Preparing to apply', text: 'Keep your profile and application materials aligned with the role requirements before you submit.' },
  { icon: UserRoundCheck, title: 'Employer readiness', text: 'Publish clear role details, location, work setup, requirements, and application instructions.' },
  { icon: BriefcaseBusiness, title: 'Specialist categories', text: 'Use category routes to reach focused hiring areas while Jooblie remains the central all-category platform.' },
];

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Guidance"
        title="Jooblie resources"
        text="Simple guidance for job seekers and employers using the platform."
      />
      <PageSection containerClassName="resource-grid" stagger>
        {resources.map(({ icon: Icon, title, text }) => (
          <article className="content-card resource-card" key={title}>
            <span><Icon size={23} /></span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </PageSection>
    </>
  );
}
