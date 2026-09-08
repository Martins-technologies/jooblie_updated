# Jooblie Frontend

The frontend is kept as one Vite/React application so all existing routes and auth behavior remain intact, but the source is organized by responsibility:

```text
frontend/
  src/
    public/
      pages/          # public site + sign-in/register
      components/     # public-only components, when needed
      assets/         # public-only assets, when needed
    seeker/
      pages/
      components/
      assets/
    recruiter/
      pages/
      components/
      assets/
    admin/
      pages/
      components/
      assets/
    shared/
      components/     # reusable layout/UI
      context/        # auth state
      hooks/
      lib/            # API, Supabase, formatting
      config/
      assets/         # shared images
      styles/
    App.jsx
    main.jsx
```

Role pages remain protected by the existing `ProtectedRoute` and keep their existing route URLs:

- `/dashboard/job-seeker`
- `/dashboard/recruiter`
- `/dashboard/admin`
- recruiter: `/post-job`, `/my-jobs`, `/candidates`, `/my-company`, `/settings`
- admin: `/admin/moderation`, `/admin/users`, `/admin/activity`

The frontend uses `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SITE_SLUG`.
