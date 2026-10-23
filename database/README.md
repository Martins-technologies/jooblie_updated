# Database alignment

This folder does **not** recreate the Jooblie database. It targets the existing shared Supabase schema already containing `profiles`, `companies`, `company_members`, `jobs`, `job_sites`, `category_sites`, `applications`, `saved_jobs`, `job_views`, `activity_log`, `categories`, `sectors`, and `sites`.

Run `migrations/001_align_existing_jooblie.sql` once from the Supabase SQL Editor after backing up the project. The migration is idempotent and aligns cross-publishing, audience portals, daily privacy-preserving view de-duplication, and the backend security event log.

The application treats `jobs.origin_site_id` as provenance only. Public visibility always comes from `job_sites`.

## Mississauga landing-page registrations (migration 008)

`migrations/008_mississauga_registration_intake.sql` adds a private intake table for the landing-page form. The public API inserts through the backend service role only. The table is not readable by anonymous or authenticated browser clients; admins review and assign leads in `/admin/registrations`. Apply the migration before enabling the landing-page form. This is the internal Jooblie intake queue; it does not replace an approved GoHighLevel synchronization or receipt-email workflow.

`migrations/009_mississauga_registration_notification_type.sql` adds the notification enum value used to alert active administrators when a new landing-page lead is received. Apply it to the shared Supabase project before relying on registration notifications.

For recruiter signup/company bootstrap, also run `migrations/003_recruiter_company_binding.sql` and `migrations/004_recruiter_company_schema_compat.sql`. The compatibility migration ensures the company fields used by onboarding exist on older Jooblie schemas.

## Portal workflow integrity (migration 006)

Run `tests/006_portal_workflow_preflight.sql` first. It is read-only and reports
installed functions/triggers, FK actions, indexes, application duplicates, salary
range problems, storage policies, portal publication states, and visibility drift.
Review unexpected legacy triggers before applying 006. Do not rerun the historical
alignment migration to repair a production project that already contains it.

Apply `migrations/006_portal_workflow_integrity.sql` once the preflight is reviewed.
The migration is transactional and repeatable. It rebuilds exact `job_sites`
destinations from active origin/Jooblie/category/audience sites, handles direct
category/audience UPDATEs, and removes destinations for soft-deleted jobs. Closed,
pending, and removed listings retain their destinations but public status/expiry
filters control display. The backfill changes mappings, not moderation decisions.
New recruiter posts publish as active; editing an active post keeps it active.
If an existing BEFORE INSERT trigger first derives pending_review for an unverified
company, the RPC promotes that new row to active in the same transaction, preserving
the application's established publishing behavior. It leaves the legacy derive
function and existing moderation history intact. A verified company's existing
60-day expiration is preserved. Existing status-transition triggers still apply
(for example, a deployment may reject active-to-pending changes with JB007).

`public.save_portal_job(p_actor_id uuid, p_job_id uuid, p_site_id smallint,
p_payload jsonb, p_audience_slugs text[] DEFAULT NULL,
p_is_admin boolean DEFAULT false)` returns `SETOF public.jobs` and is executable
only by `service_role`. A NULL job ID creates a job using the actor's bound company
(or their sole legacy membership); a job ID updates under a row lock. Recruiter
and admin actors using recruiter routes must belong to the active owning company.
`p_is_admin=true` permits only admin updates. Admin updates may pass a NULL site;
the source comes from the existing job. Role, active actor, company access, source
category compatibility, salary range, and audience validity are checked in SQL.
The job and all explicit audience writes commit or roll back together.

The payload accepts title, category_id, province, city, is_remote, workplace_type,
experience_level, salary_min/max/currency/period, employment_type, skills,
description, and status. Only the admin path accepts removed_reason. Actor,
company, source, deletion, and publication timestamp fields are derived by the
server; unexpected fields fail. NULL audience preserves targeting on update;
an empty array clears explicit targeting, and audience-origin visibility remains.
The SQL function returns SQLSTATE 42501 for permission failures, P0002 for a missing
job, 22023 for invalid inputs/configuration, and 23514 for an invalid salary range.
The message contains a stable code such as JOB_FORBIDDEN, JOB_NOT_FOUND,
COMPANY_FORBIDDEN, SITE_CATEGORY_MISMATCH, AUDIENCE_SITE_INVALID, or SALARY_RANGE_INVALID.

The application uniqueness index covers `(job_id, applicant_id)` for nondeleted
applications, including withdrawn applications. It prevents duplicate applications
through another portal. Historical duplicates abort the migration for review; no
application is silently removed. Historical invalid salary ranges keep the new
range constraint NOT VALID with a notice; new writes are still checked. Fix reviewed
historical ranges, then VALIDATE CONSTRAINT jobs_salary_range_valid separately.
The migration restores the private resume bucket and verifies that the existing
`resumes_select_own` owner policy exists without replacing it. Review other storage
policies in the preflight. Notification preferences use a service-role-only RLS
table with the existing three email flags; this persists preferences and does not
implement email delivery.

### Isolated SQL tests

`tests/006_portal_workflow_integrity.test.mjs` runs actual PostgreSQL using PGlite
with synthetic data. It never reads .env files or connects to a live project.
Install `@electric-sql/pglite` in a scratch directory, set `PGLITE_MODULE` to that
package's absolute `dist/index.js` path, then run:

```powershell
node database/tests/006_portal_workflow_integrity.test.mjs
```

The tests execute migration 006 twice and cover atomic audience failure, final
category mapping removal, category/audience key updates, publication transitions,
soft deletion, inactive portals, permissions including a NULL admin flag, merged
salary edits, workplace normalization, application uniqueness, storage privacy,
and preference defaults. The fixture includes the production legacy status derive,
status transition, and initial job_sites population triggers. Review live
preflight output and run post-deployment smoke checks against the deployed backend
as well. Two separate PostgreSQL sessions are needed to exercise real concurrent
updates; the fixture verifies row-lock SQL and resulting single-session behavior.
