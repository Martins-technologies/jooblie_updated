import LegalPolicyPage from './LegalPolicyPage';

export default function RefundPolicyPage() {
  return (
    <LegalPolicyPage
      policyKey="refund"
      eyebrow="LEGAL"
      related={[
        { to: '/terms', label: 'Terms and Conditions' },
        { to: '/privacy', label: 'Privacy Policy' },
      ]}
    />
  );
}
