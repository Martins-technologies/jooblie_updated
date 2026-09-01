# Jooblie Shared Backend

Single Express + Supabase API aligned with the existing Jooblie database and shared by Jooblie plus all Jobline frontends.

## Important database fields

Jobs use `origin_site_id`, `category_id`, `employment_type`, `is_remote`, `salary_currency`, `salary_period` and the current `job_status` enum (`pending_review`, `active`, `closed`, `expired`, `removed`). Cross-site visibility is read from `job_sites`; origin is not used as the public visibility filter.

Audience targeting is stored in `job_audience_sites`, not inside the jobs row. Applications use `resume_path` and `applied_via_site_id`. Audit events go to the existing `activity_log` table.

## API areas

- `/api/v1/public/*` — public reads scoped through `X-Site-Slug` + `job_sites`
- `/api/v1/auth/*` — sign-in, sign-up and exact-schema profile management
- `/api/v1/job-seeker/*` — dashboard, save/unsave, applications
- `/api/v1/recruiter/*` — company onboarding, job posting/update, applications
- `/api/v1/admin/*` — moderation, roles, activity/security logs
- `/api/v1/health` and `/api/v1/ready`

## Security

Supabase token validation, server-side RBAC, account status checks, company membership authorization, category/source-site validation, admin-only activation, Helmet, HPP, strict CORS, request/body limits, separate auth/write/general rate limiting, Pino redaction, request/client/server IP context, `activity_log`, `security_events`, and privacy-preserving daily view fingerprinting are included.

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Apply `../database/migrations/001_align_existing_jooblie.sql` to the existing Supabase project before production rollout.
