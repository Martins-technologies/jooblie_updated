# Security Deployment Checklist

- [ ] HTTPS is enforced at the edge and origin as appropriate.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` exists only in backend secrets.
- [ ] Frontends contain only the anon/publishable Supabase key.
- [ ] `CORS_ORIGINS` contains every real frontend origin and no wildcard in production.
- [ ] `TRUST_PROXY` exactly matches the real reverse-proxy topology.
- [ ] `database/migrations/001_align_existing_jooblie.sql` has been applied and verified.
- [ ] Public API endpoints explicitly enforce `status=active`, `deleted_at IS NULL` and current `job_sites` visibility even though the server uses a privileged DB client.
- [ ] Recruiter job/company writes are authorized server-side using `company_members`.
- [ ] Specialist-site posting is validated against `category_sites`/sector configuration.
- [ ] Job activation/removal and user role changes remain admin-only API actions.
- [ ] `job_audience_sites` is backend-only and only accepts Aboriginal/Newcomers site IDs.
- [ ] `activity_log` and `security_events` are monitored and retention is defined.
- [ ] `/api/v1/ready` is monitored in addition to `/api/v1/health`.
- [ ] Resume storage bucket policies allow users to upload only authorized paths; the service-role key is never used in the browser.
- [ ] Supabase backups/PITR are enabled as appropriate.
- [ ] Dependencies and Node runtime are patched regularly.
- [ ] Secrets are rotated after suspected exposure.
- [ ] Redis/shared rate-limit storage is added before horizontal multi-instance scaling.

The included controls are a hardened baseline, not a claim that any internet-facing application can be literally “security proof.”
