import { focusCategories } from '../config/site';
import { cleanText, slugify } from './format';

const pick = (obj, keys, fallback = null) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
};

export function normalizeCategory(row = {}) {
  const name = cleanText(pick(row, ['name', 'title', 'category_name']), 'Category');
  const slug = slugify(pick(row, ['slug', 'category_slug'], name));
  return {
    raw: row,
    id: pick(row, ['id', 'category_id'], slug),
    name,
    slug,
    sectorId: pick(row, ['sector_id', 'sectorId']),
  };
}

export function resolveFocusCategory(input = '') {
  const target = slugify(input);
  const exact = focusCategories.find((category) => category.key === target || category.aliases?.some((alias) => slugify(alias) === target));
  if (exact) return exact;

  const rules = [
    ['it-software', ['software', 'developer', 'programmer', 'technology', 'tech', 'data', 'cyber', 'network', 'qa', 'devops', 'cloud']],
    ['office-admin', ['office', 'admin', 'reception', 'customer-service', 'sales', 'marketing', 'finance', 'account', 'human-resource', 'hr', 'clerical', 'legal', 'management']],
    ['restaurant', ['restaurant', 'hospitality', 'food', 'chef', 'cook', 'server', 'kitchen', 'barista', 'catering', 'guest-service']],
    ['agriculture', ['agriculture', 'farm', 'farming', 'crop', 'livestock', 'harvest', 'agri', 'forestry']],
    ['trucking', ['truck', 'trucking', 'transport', 'driver', 'driving', 'delivery', 'logistics', 'freight', 'dispatcher', 'warehouse']],
  ];
  const match = rules.find(([, words]) => words.some((word) => target.includes(word)));
  return match ? focusCategories.find((category) => category.key === match[0]) || null : null;
}

export function normalizeCompany(row = {}) {
  const name = cleanText(pick(row, ['name', 'company_name', 'legal_name']), '');
  const logoPath = pick(row, ['logo_path', 'logo_url', 'logo', 'image_url']);
  return {
    raw: row,
    id: pick(row, ['id', 'company_id']),
    name,
    slug: slugify(name),
    logoUrl: logoPath && (/^https?:\/\//i.test(String(logoPath)) || String(logoPath).startsWith('/')) ? logoPath : null,
    logoPath: logoPath || null,
    website: pick(row, ['website', 'website_url']),
    location: '',
    description: cleanText(pick(row, ['description', 'about', 'bio']), ''),
    industry: '',
    verificationStatus: cleanText(pick(row, ['verification_status']), ''),
    status: cleanText(pick(row, ['status']), ''),
  };
}

function employmentLabel(value) {
  const labels = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    temporary: 'Temporary',
    internship: 'Internship',
    seasonal: 'Seasonal',
  };
  return labels[value] || cleanText(value, '').replaceAll('_', ' ');
}

export function normalizeJob(row = {}, companyMap = new Map(), categoryMap = new Map()) {
  const companyId = pick(row, ['company_id', 'companyId']);
  const categoryId = pick(row, ['category_id', 'categoryId']);
  const rawEmbeddedCompany = row.company || row.companies || null;
  const rawEmbeddedCategory = row.category || row.categories || null;
  const embeddedCompany = Array.isArray(rawEmbeddedCompany) ? rawEmbeddedCompany[0] : rawEmbeddedCompany;
  const embeddedCategory = Array.isArray(rawEmbeddedCategory) ? rawEmbeddedCategory[0] : rawEmbeddedCategory;
  const company = embeddedCompany && typeof embeddedCompany === 'object'
    ? normalizeCompany(embeddedCompany)
    : companyMap.get(String(companyId));
  const category = embeddedCategory && typeof embeddedCategory === 'object'
    ? normalizeCategory(embeddedCategory)
    : categoryMap.get(String(categoryId));

  const categoryName = cleanText(pick(row, ['category_name']), category?.name || '');
  const dbCategorySlug = slugify(pick(row, ['category_slug'], category?.slug || categoryName));
  const focusCategory = resolveFocusCategory(dbCategorySlug) || resolveFocusCategory(categoryName);
  const city = cleanText(pick(row, ['city']), '');
  const province = cleanText(pick(row, ['province', 'state']), '');
  const workplace = pick(row, ['workplace_type'], null);
  const isRemote = workplace ? workplace === 'remote' : Boolean(pick(row, ['is_remote'], false));
  const physicalLocation = [city, province].filter(Boolean).join(', ');
  const location = isRemote
    ? (physicalLocation ? `Remote · ${physicalLocation}` : 'Remote')
    : physicalLocation;
  const status = cleanText(pick(row, ['status', 'job_status']), 'pending_review').toLowerCase();
  const salaryPeriod = cleanText(pick(row, ['salary_period']), '');
  const skills = Array.isArray(row.skills) ? row.skills : [];

  return {
    raw: row,
    id: pick(row, ['id', 'job_id']),
    title: cleanText(pick(row, ['title', 'job_title', 'name']), 'Untitled job'),
    slug: slugify(pick(row, ['title', 'job_title', 'name'], 'job')),
    description: cleanText(pick(row, ['description', 'job_description', 'details']), ''),
    requirements: '',
    responsibilities: '',
    companyId,
    companyName: cleanText(pick(row, ['company_name']), company?.name || ''),
    company,
    categoryId,
    categoryName: category?.name || categoryName || focusCategory?.label || '',
    categorySlug: focusCategory?.key || dbCategorySlug,
    dbCategorySlug,
    location,
    city,
    province,
    country: 'Canada',
    isRemote,
    jobType: employmentLabel(cleanText(pick(row, ['employment_type', 'job_type', 'type']), '')),
    employmentType: cleanText(pick(row, ['employment_type']), ''),
    experience: '',
    workplaceType: workplace === 'hybrid' ? 'Hybrid' : isRemote ? 'Remote' : 'On-site',
    salaryMin: pick(row, ['salary_min', 'min_salary', 'pay_min']),
    salaryMax: pick(row, ['salary_max', 'max_salary', 'pay_max']),
    salaryText: cleanText(pick(row, ['salary', 'salary_text', 'pay']), ''),
    currency: cleanText(pick(row, ['salary_currency', 'currency']), 'CAD'),
    salaryPeriod,
    skills,
    createdAt: pick(row, ['published_at', 'created_at', 'posted_at', 'updated_at']),
    status,
    isActive: status === 'active',
    applicationUrl: null,
    contactEmail: null,
  };
}

