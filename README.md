# Jooblie Full-Stack Platform — Existing DB Aligned

This package has been organized into clear public, Job Seeker, Recruiter and Admin frontend areas while preserving the working React/Vite application and shared backend.


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


## Organized frontend structure

`frontend/src/public` contains public pages and authentication screens.
`frontend/src/seeker` contains job-seeker pages/components/assets.
`frontend/src/recruiter` contains recruiter pages/components/assets.
`frontend/src/admin` contains admin pages/components/assets.
`frontend/src/shared` contains reusable UI, auth, API helpers, config, shared assets and styles.

This is intentionally a single Vite application with role-based routes, not four disconnected copies of the same app. That keeps the existing routing/auth/API integration functional while giving each role a dedicated source area.

## Package hygiene

Production secrets and generated dependency/build folders are intentionally excluded from this ZIP. Copy each `.env.example` to `.env` and supply the real environment values on the deployment server.


## Admin network operations

The administrator surface includes a production-oriented job registry and network portal monitoring. `/admin/jobs` is backed by dedicated admin job list/detail/update/delete endpoints, while `/admin/activity` loads portal records from `sites`, audit activity from `activity_log`, and security events from `security_events`. Selecting a portal opens `/admin/portals/:slug` with portal-specific metrics, jobs, and recent activity; configured `domain` values can also be opened in a new tab.

## Production hiring workflow
The seeker/recruiter workflow is connected end-to-end: profile data includes skills, experience and education; verified PDF resumes can be uploaded privately; seekers apply with their profile resume; recruiters can list/filter candidates, securely open a time-limited resume URL, and move applications through controlled hiring stages.
