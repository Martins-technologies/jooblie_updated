import LegalPolicyPage from './LegalPolicyPage';

export default function PrivacyPage() {
  return (
    <LegalPolicyPage
      policyKey="privacy"
      eyebrow="LEGAL"
      related={[
        { to: '/terms', label: 'Terms and Conditions' },
        { to: '/refund-policy', label: 'Employer Refund Policy' },
      ]}
    />
  );
}
