import { z } from 'zod';

const optionalText = (max) => z.union([z.string().trim().max(max), z.literal(''), z.null()]).optional();
const optionalUrl = z.union([z.string().trim().url().max(1000), z.literal(''), z.null()]).optional();
const optionalNumber = z.preprocess(
  (value) => value === '' ? null : value,
  z.union([z.coerce.number().nonnegative(), z.null()]),
).optional();
const audienceSite = z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9-]*$/);
const audienceSites = z.array(audienceSite).max(50).refine((sites) => new Set(sites).size === sites.length, {
  message: 'Choose each audience portal only once.',
});
const employmentType = z.enum(['full_time', 'part_time', 'contract', 'temporary', 'internship', 'seasonal']);
const salaryPeriod = z.enum(['hourly', 'weekly', 'monthly', 'yearly']);
const workplaceType = z.enum(['onsite', 'hybrid', 'remote']);
const experienceLevel = z.enum(['entry_level', 'mid_level', 'senior', 'executive']);

export const authSignInSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
});

export const mississaugaRegistrationSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone_e164: z.string().trim().regex(/^\+[1-9][0-9]{6,14}$/),
  current_city: z.string().trim().min(1).max(80),
  employment_goal: z.enum([
    'Find a job',
    'Explore employers who may support a work permit',
    'Explore employment related to potential PR pathways',
    'All of the above',
    'Not sure yet',
  ]),
  preferred_industry: z.enum([
    'Administration & Office', 'Agriculture', 'Construction & Skilled Trades',
    'Healthcare & Support Services', 'Hospitality & Food Services',
    'Manufacturing & Warehousing', 'Retail & Customer Service',
    'Transportation & Logistics', 'Other', 'Open to any industry',
  ]).nullable().optional(),
  terms_accepted: z.literal(true),
  employer_sharing_consent: z.boolean().default(false),
  sms_marketing_consent: z.boolean().default(false),
  email_marketing_consent: z.boolean().default(false),
  source_context: z.object({
    page_path: z.string().max(200).optional(),
    referrer: z.string().max(1000).nullable().optional(),
    utm_source: z.string().max(250).nullable().optional(),
    utm_medium: z.string().max(250).nullable().optional(),
    utm_campaign: z.string().max(250).nullable().optional(),
    utm_content: z.string().max(250).nullable().optional(),
    fbclid: z.string().max(500).nullable().optional(),
  }).strict().default({}),
}).strict();

export const adminRegistrationUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'reviewing', 'closed']).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide a status or owner update.');

export const authSignUpSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(2).max(160),
  role: z.enum(['job_seeker', 'recruiter']),
  company_name: optionalText(180),
  company_website: optionalUrl,
  company_registration_number: optionalText(180),
  terms_accepted: z.boolean().optional().default(false),
}).superRefine((value, ctx) => {
  if (value.role === 'recruiter') {
    if (!value.company_name || !String(value.company_name).trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['company_name'], message: 'Company name is required for recruiter accounts.' });
    }
    if (!value.company_website) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['company_website'], message: 'Company website is required for recruiter accounts.' });
    }
    if (!value.company_registration_number || !String(value.company_registration_number).trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['company_registration_number'], message: 'Company registration number is required for recruiter accounts.' });
    }
  }
});

export const jobCreateSchema = z.object({
  title: z.string().trim().min(3).max(180),
  category_id: z.coerce.number().int().positive().max(32767),
  province: optionalText(120),
  city: optionalText(120),
  is_remote: z.boolean().default(false),
  workplace_type: workplaceType.default('onsite'),
  experience_level: experienceLevel.default('mid_level'),
  salary_min: optionalNumber,
  salary_max: optionalNumber,
  salary_currency: z.string().trim().length(3).default('CAD').transform((value) => value.toUpperCase()),
  salary_period: z.union([salaryPeriod, z.literal(''), z.null()]).optional().transform((value) => value === '' ? null : value),
  employment_type: employmentType,
  skills: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  description: z.string().trim().min(20).max(30_000),
  audience_sites: audienceSites.default([]),
}).superRefine((value, ctx) => {
  if (value.salary_min != null && value.salary_max != null && value.salary_max < value.salary_min) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['salary_max'],
      message: 'Maximum salary cannot be lower than minimum salary.',
    });
  }
});

export const jobUpdateSchema = z.object({
  title: z.string().trim().min(3).max(180).optional(),
  category_id: z.coerce.number().int().positive().max(32767).optional(),
  province: optionalText(120),
  city: optionalText(120),
  is_remote: z.boolean().optional(),
  workplace_type: workplaceType.optional(),
  experience_level: experienceLevel.optional(),
  salary_min: optionalNumber,
  salary_max: optionalNumber,
  salary_currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  salary_period: z.union([salaryPeriod, z.literal(''), z.null()]).optional().transform((value) => value === '' ? null : value),
  employment_type: employmentType.optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  description: z.string().trim().min(20).max(30_000).optional(),
  audience_sites: audienceSites.optional(),
  status: z.enum(['pending_review', 'active', 'closed']).optional(),
});

export const adminJobUpdateSchema = jobUpdateSchema.extend({
  expected_updated_at: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['pending_review', 'active', 'closed', 'expired', 'removed']).optional(),
  moderation_note: z.string().trim().max(5000).optional(),
});

export const notificationPreferencesSchema = z.object({
  email_new_applicant: z.boolean(),
  email_daily_summary: z.boolean(),
  email_marketing: z.boolean(),
}).strict();

export const applicationSchema = z.object({
  cover_letter: optionalText(10_000),
  resume_path: optionalText(1000),
});

const dateValue = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()]).optional();
const experienceItem = z.object({
  title: z.string().trim().min(1).max(180),
  company: z.string().trim().min(1).max(180),
  startDate: dateValue,
  endDate: dateValue,
  current: z.boolean().default(false),
  description: optionalText(4000),
}).superRefine((item, ctx) => {
  if (item.startDate && item.endDate && item.startDate > item.endDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date cannot be before start date.' });
  }
  if (item.current && item.endDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Current roles cannot have an end date.' });
  }
});
const educationItem = z.object({
  degree: z.string().trim().min(1).max(180),
  institution: z.string().trim().min(1).max(180),
  startDate: dateValue,
  endDate: dateValue,
  current: z.boolean().default(false),
  field: optionalText(180),
}).superRefine((item, ctx) => {
  if (item.startDate && item.endDate && item.startDate > item.endDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date cannot be before start date.' });
  }
  if (item.current && item.endDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Current education cannot have an end date.' });
  }
});

export const experienceSchema = z.array(experienceItem).max(20);
export const educationSchema = z.array(educationItem).max(20);

export const resumeRegisterSchema = z.object({
  path: z.string().trim().min(5).max(1000),
  original_name: z.string().trim().min(1).max(255),
  size_bytes: z.coerce.number().int().positive().max(10 * 1024 * 1024),
  content_type: z.string().trim().min(3).max(120),
});

export const applicationStatusSchema = z.object({
  status: z.enum(['submitted', 'viewed', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn']),
  note: z.string().max(2000).optional(),
  interview: z.any().optional(),
  offer: z.any().optional(),
  feedback: z.string().max(2000).optional(),
}).passthrough();

export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(160).optional(),
  phone: optionalText(50),
  headline: optionalText(220),
  location_province: optionalText(120),
  location_city: optionalText(120),
  skills: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  default_resume_path: optionalText(1000),
  experience: experienceSchema.optional(),
  education: educationSchema.optional(),
});

export const companySchema = z.object({
  name: z.string().trim().min(2).max(180),
  website: z.string().trim().url().max(1000),
  registration_number: z.string().trim().min(2).max(180),
  verification_document_path: optionalText(1000),
  logo_path: optionalText(1000),
  description: optionalText(10_000),
});

export const companyUpdateSchema = companySchema.partial();

export const adminJobStatusSchema = z.object({
  status: z.enum(['pending_review', 'active', 'closed', 'expired', 'removed']),
  moderation_note: optionalText(5000),
});

export const adminRoleSchema = z.object({
  previous_role: z.enum(['job_seeker', 'recruiter', 'admin']).optional(),
  role: z.enum(['job_seeker', 'recruiter', 'admin']),
});

export const adminCompanyVerificationSchema = z.object({
  verification_status: z.enum(['pending', 'verified', 'rejected']),
  rejection_reason: optionalText(500),
});

