# Database alignment

This folder does **not** recreate the Jooblie database. It targets the existing shared Supabase schema already containing `profiles`, `companies`, `company_members`, `jobs`, `job_sites`, `category_sites`, `applications`, `saved_jobs`, `job_views`, `activity_log`, `categories`, `sectors`, and `sites`.

Run `migrations/001_align_existing_jooblie.sql` once from the Supabase SQL Editor after backing up the project. The migration is idempotent and aligns cross-publishing, audience portals, daily privacy-preserving view de-duplication, and the backend security event log.

The application treats `jobs.origin_site_id` as provenance only. Public visibility always comes from `job_sites`.

For recruiter signup/company bootstrap, also run `migrations/003_recruiter_company_binding.sql` and `migrations/004_recruiter_company_schema_compat.sql`. The compatibility migration ensures the company fields used by onboarding exist on older Jooblie schemas.
