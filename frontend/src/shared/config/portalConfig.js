const portalNames = {
  jooblie: 'Jooblie',
  'office-jobs': 'Office Jobline',
  'it-jobs': 'IT Jobs Jobline',
  'service-care': 'ServiceCare Jobline',
  'health-care': 'Health Care Jobline',
  farmerfreight: 'FarmerFreight Jobline',
  aboriginal: 'Aboriginal Jobline',
  newcomers: 'Newcomer Jobline',
  'hospitality-healthcare': 'Hospitality & Healthcare Jobline',
  'transport-farming': 'Transportation & Farming Jobline',
};

export function resolvePortalConfig(env = {}) {
  const configuredSlug = env.VITE_SITE_SLUG?.trim();
  if (env.PROD && !configuredSlug) throw new Error('Set VITE_SITE_SLUG explicitly for this portal before building.');
  const slug = configuredSlug || 'jooblie';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('VITE_SITE_SLUG must be a canonical lowercase portal slug.');
  }
  const name = env.VITE_SITE_NAME?.trim() || portalNames[slug];
  if (!name) throw new Error('Set VITE_SITE_NAME for this custom portal slug.');
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim();
  if (env.PROD && !apiBaseUrl) throw new Error('Set VITE_API_BASE_URL to the shared API before building.');
  if (apiBaseUrl) {
    let valid = false;
    try { valid = ['http:', 'https:'].includes(new URL(apiBaseUrl).protocol); } catch { /* validation below */ }
    if (!valid) throw new Error('VITE_API_BASE_URL must be an absolute HTTP or HTTPS URL.');
  }
  return { slug, name, description: `${name} — search jobs, connect with employers, and hire talent.` };
}
