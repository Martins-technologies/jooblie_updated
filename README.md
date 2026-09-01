# Jooblie Full-Stack Platform — Existing DB Aligned

This delivery keeps the existing folder layout and aligns the React frontend + shared Express backend with the **current Jooblie Supabase schema**.

- `frontend/` — public Jooblie UI plus Job Seeker, Recruiter and Admin dashboards.
- `backend/` — one shared API for Jooblie and every connected Jobline frontend.
- `database/migrations/` — idempotent alignment migration for the existing database (not a destructive schema rebuild).
- `deploy/` — example Nginx/systemd production configuration.

## Current data contract

The backend now uses the real database fields:

- `jobs.origin_site_id`
- `jobs.category_id`
- `jobs.employment_type`
- `jobs.is_remote`
- `jobs.salary_currency` / `jobs.salary_period`
- `jobs.status = pending_review | active | closed | expired | removed`
- `category_sites`
- `job_sites`
- `job_audience_sites`
- `profiles.location_city` / `profiles.location_province`
- `profiles.default_resume_path`
- `applications.resume_path` / `applications.applied_via_site_id`
- `company_members.role = owner | member`
- `activity_log`

## Cross-publishing rule

A job is stored once in `jobs`; visibility is represented by `job_sites`.

- Every job is visible on Jooblie.
- The origin site is retained.
- Category mappings add the correct specialist portal(s).
- Aboriginal/Newcomers are audience channels stored in `job_audience_sites`.
- `(job_id, site_id)` prevents duplicate visibility rows.

Examples:

- Software job posted on Jooblie → `jooblie + it-jobs`.
- Software job posted on IT Jobs → `it-jobs + jooblie`.
- HR job posted on Office Jobline → `office-jobs + jooblie`.
- Nursing job posted on Health Care → `health-care + jooblie`.
- Food & Beverage posted on ServiceCare → `service-care + jooblie`.
- Driving job posted on FarmerFreight → `farmerfreight + jooblie`.
- Any job explicitly targeted to Newcomers/Aboriginal gains that audience portal as an additional mapping.

`origin_site_id` is provenance; public visibility is always checked through `job_sites`.

## Current site slugs

Primary frontend deployments:

- `jooblie`
- `office-jobs`
- `it-jobs`
- `service-care`
- `health-care`
- `farmerfreight`
- `aboriginal`
- `newcomers`

The database also contains legacy/configured rows `hospitality-healthcare` and `transport-farming`; the API supports them using their site registry/sector configuration.

## Setup

### 1. Existing Supabase database

Back up the project, then run:

```text
database/migrations/001_align_existing_jooblie.sql
```

The migration is designed for the existing database. It aligns category/site mappings, job-site synchronization, audience channels, privacy-preserving view de-duplication and `security_events`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Keep `SUPABASE_SERVICE_ROLE_KEY` only on the backend.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Each frontend deployment uses the same API/Supabase project and changes only `VITE_SITE_SLUG` (plus its domain-specific public env values).

## Security baseline

Included controls: Supabase Auth, server-side RBAC, company membership checks, site/category validation, admin-only activation, CORS allowlist, Helmet, HPP, request/body limits, auth/write/general rate limits, request IDs, client/server IP logging, `activity_log`, `security_events`, protected browser routes, backend-only service key, and SHA-256 daily job-view fingerprinting.

A production system still requires HTTPS, backups/PITR, secret rotation, dependency patching, monitoring, firewall/proxy configuration and a shared rate-limit store (for example Redis) if the API is horizontally scaled.

## Validation

The delivery is checked for:

- backend JavaScript syntax with `node --check`
- frontend JSX/JS parse validity
- relative-import resolution
- accidental `.env`, `node_modules`, build output and common secret patterns before packaging

Run dependency-aware builds after extraction:

```bash
cd frontend && npm ci && npm run build
cd ../backend && npm install && npm run check
```
"# jooblie_updated" 
