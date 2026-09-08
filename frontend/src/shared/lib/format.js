export function cleanText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

export function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function timeAgo(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  const years = Math.floor(months / 12);
  return `${years} yr${years === 1 ? '' : 's'} ago`;
}

export function formatSalary(job) {
  const min = Number(job.salaryMin);
  const max = Number(job.salaryMax);
  const currency = job.currency || '';
  const formatter = currency
    ? new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 })
    : new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

  const period = job.salaryPeriod ? ` / ${String(job.salaryPeriod).replaceAll('_', ' ')}` : '';
  if (Number.isFinite(min) && Number.isFinite(max)) return `${formatter.format(min)} - ${formatter.format(max)}${period}`;
  if (Number.isFinite(min)) return `From ${formatter.format(min)}${period}`;
  if (Number.isFinite(max)) return `Up to ${formatter.format(max)}${period}`;
  return cleanText(job.salaryText || job.pay || '', '');
}

export function stripHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
