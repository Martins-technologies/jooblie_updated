# Jooblie Production Workflow Update

Implemented end-to-end seeker/recruiter workflow on the existing shared backend:

- Job seeker profile: basic details, skills, work experience, education.
- Private PDF resume workflow: PDF-only, 5 MB limit, storage ownership policy, server-side `%PDF-` validation, database registration, versioned storage paths.
- Job applications: seeker applies using a verified profile resume; application remains tied to the submitting user and site.
- Seeker dashboard: application count, saved jobs, shortlisted count, offers, and recent application statuses.
- Recruiter: post/update jobs, list/filter applications with pagination, view candidate profile information, and open resumes through 5-minute signed URLs after company authorization.
- Recruitment workflow: server-enforced application status transitions through reviewed/shortlisted/interviewing/offered/hired/rejected stages.
- Audit/security logs: business events continue to `activity_log`; security events continue to `security_events`; noisy automatic HTTP request logging is disabled while important audit/security events are logged.

## Database migration
Run `database/migrations/002_production_profile_resume_workflow.sql` after the existing alignment migration.

## Validation performed
- All backend `.js` files passed `node --check`.
- All frontend relative imports were checked and resolved.
- Frontend production build was not executed in this environment because the clean package intentionally excludes `node_modules`; run `npm ci && npm run build` in `frontend` on the deployment machine.
