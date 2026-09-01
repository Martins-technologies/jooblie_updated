import { z } from 'zod';

const optionalText = (max) => z.union([z.string().trim().max(max), z.literal(''), z.null()]).optional();
const optionalUrl = z.union([z.string().trim().url().max(1000), z.literal(''), z.null()]).optional();
const optionalNumber = z.preprocess(
  (value) => value === '' ? null : value,
  z.union([z.coerce.number().nonnegative(), z.null()]),
).optional();
const audienceSite = z.enum(['aboriginal', 'newcomers']);
const employmentType = z.enum(['full_time', 'part_time', 'contract', 'temporary', 'internship', 'seasonal']);
const salaryPeriod = z.enum(['hourly', 'weekly', 'monthly', 'yearly']);

export const authSignInSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
});

export const authSignUpSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(2).max(160),
  role: z.enum(['job_seeker', 'recruiter']),
});

export const jobCreateSchema = z.object({
  title: z.string().trim().min(3).max(180),
  company_id: z.string().uuid(),
  category_id: z.coerce.number().int().positive().max(32767),
  province: optionalText(120),
  city: optionalText(120),
  is_remote: z.boolean().default(false),
  salary_min: optionalNumber,
  salary_max: optionalNumber,
  salary_currency: z.string().trim().length(3).default('CAD').transform((value) => value.toUpperCase()),
  salary_period: z.union([salaryPeriod, z.literal(''), z.null()]).optional().transform((value) => value === '' ? null : value),
  employment_type: employmentType,
  skills: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  description: z.string().trim().min(20).max(30_000),
  audience_sites: z.array(audienceSite).max(2).default([]),
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
  company_id: z.string().uuid().optional(),
  category_id: z.coerce.number().int().positive().max(32767).optional(),
  province: optionalText(120),
  city: optionalText(120),
  is_remote: z.boolean().optional(),
  salary_min: optionalNumber,
  salary_max: optionalNumber,
  salary_currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  salary_period: z.union([salaryPeriod, z.literal(''), z.null()]).optional().transform((value) => value === '' ? null : value),
  employment_type: employmentType.optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  description: z.string().trim().min(20).max(30_000).optional(),
  audience_sites: z.array(audienceSite).max(2).optional(),
  status: z.enum(['pending_review', 'closed']).optional(),
});

export const applicationSchema = z.object({
  cover_letter: optionalText(10_000),
  resume_path: optionalText(1000),
});

export const applicationStatusSchema = z.object({
  status: z.enum(['submitted', 'viewed', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn']),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(160).optional(),
  phone: optionalText(50),
  headline: optionalText(220),
  location_province: optionalText(120),
  location_city: optionalText(120),
  skills: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  default_resume_path: optionalText(1000),
});

export const companySchema = z.object({
  name: z.string().trim().min(2).max(180),
  website: z.string().trim().url().max(1000),
  registration_number: z.string().trim().min(2).max(180),
  verification_document_path: optionalText(1000),
  logo_path: optionalText(1000),
  description: optionalText(10_000),
});

export const adminJobStatusSchema = z.object({
  status: z.enum(['pending_review', 'active', 'closed', 'expired', 'removed']),
  moderation_note: optionalText(5000),
});

export const adminRoleSchema = z.object({
  role: z.enum(['job_seeker', 'recruiter', 'admin']),
});
