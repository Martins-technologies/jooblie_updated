import LegalPolicyPage from './LegalPolicyPage';

export default function TermsPage() {
  return (
    <LegalPolicyPage
      policyKey="terms"
      eyebrow="LEGAL"
      related={[
        { to: '/privacy', label: 'Privacy Policy' },
        { to: '/refund-policy', label: 'Employer Refund Policy' },
      ]}
    />
  );
}
