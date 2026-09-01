# Jooblie Frontend

React/Vite frontend for the shared Jooblie hiring network with public pages and Job Seeker, Recruiter and Admin dashboards.

Every API request sends `X-Site-Slug` from `VITE_SITE_SLUG`. Use the canonical database slugs:

- `jooblie`
- `office-jobs`
- `it-jobs`
- `service-care`
- `health-care`
- `farmerfreight`
- `aboriginal`
- `newcomers`

The database also contains legacy registry rows `hospitality-healthcare` and `transport-farming`.

## Current schema alignment

The posting form writes the real job fields (`province`, `city`, `is_remote`, `employment_type`, salary fields, `skills`, `description`) and sends `audience_sites` only as an API instruction. The backend converts that audience selection into `job_audience_sites`.

The Job Seeker dashboard edits the actual profile fields (`phone`, `headline`, `location_city`, `location_province`, `skills`, `default_resume_path`) and can upload a resume to the existing private `resumes` bucket. Apply with Jooblie uses that stored resume path.

The Recruiter dashboard uses the existing company requirements (`website`, `registration_number`) and current application statuses (`submitted`, `viewed`, `shortlisted`, `interviewing`, `offered`, `hired`, `rejected`, `withdrawn`). The Admin dashboard uses `pending_review`/`active`/`removed` moderation states and displays the current site registry.

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Production:

```bash
npm run build
```

Never place `SUPABASE_SERVICE_ROLE_KEY` or any server secret in a `VITE_*` variable.
