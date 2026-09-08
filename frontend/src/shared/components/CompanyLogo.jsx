export default function CompanyLogo({ company, size = 'md' }) {
  const name = company?.name || '';
  const initials = name ? name.split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') : '•';
  return company?.logoUrl ? (
    <span className={`company-logo company-logo--${size}`}><img src={company.logoUrl} alt={`${name} logo`} /></span>
  ) : (
    <span className={`company-logo company-logo--${size} company-logo--placeholder`} aria-label={name ? `${name} logo placeholder` : 'Company logo placeholder'}>{initials}</span>
  );
}
