import PageHero from '../../shared/components/PageHero';
import PageSection from '../../shared/components/PageSection';

export default function ContactPage() {
  const email = import.meta.env.VITE_SUPPORT_EMAIL?.trim();

  return (
    <>
      <PageHero
        eyebrow="Support"
        title="Contact Jooblie"
        text="Use the configured support channel for account, job, or employer questions."
      />
      <PageSection containerClassName="narrow content-card prose-card">
        <h2>Get in touch</h2>
        {email ? (
          <p>Email us at <a href={`mailto:${email}`}>{email}</a>.</p>
        ) : (
          <p>No public support email is configured yet. Add <code>VITE_SUPPORT_EMAIL</code> to the frontend environment when the approved address is available.</p>
        )}
      </PageSection>
    </>
  );
}
