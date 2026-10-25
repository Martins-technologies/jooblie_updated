export function safeWebsite(value) {
  try { const url = new URL(/^https?:\/\//i.test(value || '') ? value : `https://${value}`); return ['http:','https:'].includes(url.protocol) && url.hostname.includes('.') && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function safePortalWebsite(value) {
  const href = safeWebsite(value);
  if (!href) return null;
  const hostname = new URL(href).hostname.toLowerCase();
  return hostname === 'placeholder.jooblie.com' || hostname.endsWith('.placeholder.jooblie.com') || hostname.endsWith('.invalid') || hostname.endsWith('.example') ? null : href;
}
export function displayDate(value, time = false) {
  const date = value && new Date(value);
  return date && Number.isFinite(date.getTime()) ? time ? date.toLocaleString(undefined,{ dateStyle:'medium',timeStyle:'short' }):date.toLocaleDateString(undefined,{ dateStyle:'medium' }) : '—';
}
export function activityLabel(value) {
  const labels = { 'admin.job.moderate':'Job reviewed','admin.job.update':'Job details updated','admin.job.delete':'Job deleted','admin.user.role.update':'Account role updated','profile.update':'Profile updated' };
  return labels[value] || String(value || 'Activity recorded').replace(/[._]+/g,' ').replace(/^./,letter=>letter.toUpperCase());
}
