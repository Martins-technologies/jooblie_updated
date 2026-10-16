export function arrayValue(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
export function profileProgress(profile = {}) {
  const filled = value => typeof value === 'string' ? Boolean(value.trim()) : Boolean(value);
  const basic = ['full_name', 'phone', 'headline', 'location_city'].map(key => filled(profile[key]));
  const experience = arrayValue(profile.experience).length > 0;
  const education = arrayValue(profile.education).length > 0;
  const skills = arrayValue(profile.skills).some(filled);
  const resume = filled(profile.default_resume_path);
  return { percent: Math.round([...basic, experience, education, skills, resume].filter(Boolean).length / 8 * 100), basic: basic.every(Boolean), experience, resume };
}
export function companyName(job = {}) { return job.companies?.name || job.company?.name || job.company_name || job.companyName || 'Employer'; }
export function jobLocation(job = {}) { return job.is_remote || job.workplace_type === 'remote' ? 'Remote' : [job.city, job.province].filter(Boolean).join(', ') || job.location || 'Location not specified'; }
export function salaryLabel(job = {}) {
  const min = job.salary_min ?? job.salaryMin, max = job.salary_max ?? job.salaryMax;
  const currency = job.salary_currency || job.currency || 'CAD';
  const format = value => `${Number(value).toLocaleString('en', { maximumFractionDigits: 0 })}`;
  const has = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
  if (!has(min) && !has(max)) return 'Salary not listed';
  return `${currency} ${has(min) ? format(min) : 'Up to ' + format(max)}${has(min) && has(max) && Number(min) !== Number(max) ? ' – ' + format(max) : ''}${job.salary_period ? ' / ' + job.salary_period.replace('ly', '') : ''}`;
}
export function humanize(value = '') { return String(value).replaceAll('_', ' ').replace(/^./, c => c.toUpperCase()); }
