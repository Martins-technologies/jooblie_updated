import {useState,useEffect} from 'react';
export default function CompanyLogo({ company, size = 'md' }) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[company?.logoUrl]);
  const name = company?.name || '';
  const initials = name ? name.split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') : '•';
  return company?.logoUrl && !failed ? (
    <span className={`company-logo company-logo--${size}`}><img loading="lazy" decoding="async" width="64" height="64" onError={()=>setFailed(true)} src={company.logoUrl} alt={`${name} logo`} /></span>
  ) : (
    <span className={`company-logo company-logo--${size} company-logo--placeholder`} aria-label={name ? `${name} logo placeholder` : 'Company logo placeholder'}>{initials}</span>
  );
}
