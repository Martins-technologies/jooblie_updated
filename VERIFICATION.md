# Delivery verification

Source package reorganized from the uploaded Jooblie full-stack archive.

## Frontend organization
- public: 15 public/auth page modules
- job seeker: 1 dashboard page module(s)
- recruiter: 6 dashboard/job/company modules
- admin: 4 administration modules
- shared: reusable components, auth context, hooks, API helpers, config, assets and styles

## Checks completed
- All frontend relative imports resolve after reorganization.
- All backend `.js` files pass `node --check`.
- Production dependency/build folders and Git metadata are excluded from the delivery ZIP.
- Runtime `.env` files are excluded; `.env.example` files remain.

## Build on the target machine

Frontend:
```bash
cd frontend
npm ci
npm run build
```

Backend:
```bash
cd backend
npm ci
npm run check
npm start
```

Before starting, create `.env` files from the supplied examples and set the real Supabase/CORS configuration.

## Architecture note

The frontend remains one Vite application with role-separated source directories. This preserves the existing router/auth/API contract while keeping public, seeker, recruiter and admin code cleanly separated. It is not four disconnected applications.


## Production admin-network additions

The admin API now includes dedicated job and portal operations:
- `GET /api/v1/admin/jobs` with pagination, status/search, and origin-portal filtering.
- `GET /api/v1/admin/jobs/:jobId` with job, application/view metrics, and all mapped portals.
- `PATCH /api/v1/admin/jobs/:jobId` for controlled administrator job updates.
- `DELETE /api/v1/admin/jobs/:jobId` for audited soft deletion.
- `GET /api/v1/admin/portals` for the configured portal registry plus live job/user counts.
- `GET /api/v1/admin/portals/:slug` for a dedicated portal operations view, recent jobs, and portal-scoped activity.

The Admin **System & Activity** page now renders the registered portals dynamically from the `sites` table. Each portal has a dedicated internal admin detail page and, when its `domain` is configured, an external **Open Website** action. No portal URLs or production metrics are hard-coded.

The frontend build could not be completed in this environment because dependency installation timed out; backend route/controller syntax checks and the existing static import checks were completed. Configure real Supabase credentials and portal domains before production deployment.
