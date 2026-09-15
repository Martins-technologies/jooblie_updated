# Jooblie Shared Backend API Reference

This document describes the **shared Express API** at `backend/` (package name `jooblie-shared-backend`). All specialist Jobline frontends call the same `/api/v1` surface and identify themselves with a site slug.

Source of truth for this file: `backend/src/routes.js`, controllers, middleware, Zod schemas, `backend/.env.example`, and `database/migrations/*`. The repo does **not** contain `CREATE TABLE` statements for the original Jooblie tables (`profiles`, `jobs`, `companies`, `applications`, `sites`, etc.). Those live in the existing Supabase project. Fields listed under **Data models** are taken from API usage and later alignment migrations. Where a type or `NOT NULL` constraint is not in this repo, it is marked **NOT FOUND / NEEDS CONFIRMATION**.

A second copy of the same backend also exists at `jooblie/backend/`. This reference documents the root `backend/` tree.

---

## 1. Base URL and environment

### Base URL and port

- Local default: `http://localhost:4000`
- API prefix (mounted in `backend/src/app.js`): **`/api/v1`**
- Full local base: **`http://localhost:4000/api/v1`**
- Port comes from `PORT` (default **4000** in `backend/src/config/env.js` and `.env.example`)
- Example production hostname in `deploy/nginx.conf.example`: `api.jooblie.com` proxying to `127.0.0.1:4000` — **example only, not an enforced runtime value**

Health check (no site header required):

```http
GET /api/v1/health
```

### Required environment variables (names only)

Validated in `backend/src/config/env.js`. Process exits on invalid/missing required values.

| Name | Required? | Default if omitted |
|---|---|---|
| `SUPABASE_URL` | **Yes** | none |
| `SUPABASE_ANON_KEY` | **Yes** | none |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | none |
| `NODE_ENV` | No | `development` (`development` \| `test` \| `production`) |
| `PORT` | No | `4000` |
| `CORS_ORIGINS` | No | `http://localhost:5173` (comma-separated list) |
| `TRUST_PROXY` | No | `false` |
| `DEFAULT_SITE_SLUG` | No | `jooblie` |
| `LOG_LEVEL` | No | `info` |
| `REQUEST_BODY_LIMIT` | No | `256kb` |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` |
| `RATE_LIMIT_MAX` | No | `120` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No | `900000` |
| `AUTH_RATE_LIMIT_MAX` | No | `10` |
| `WRITE_RATE_LIMIT_WINDOW_MS` | No | `60000` |
| `WRITE_RATE_LIMIT_MAX` | No | `30` |

`.env.example` also documents `CORS_ORIGINS=http://localhost:5173,http://localhost:5174`.

Node engine: `>=20` (`backend/package.json`).

### Start the server locally

From `backend/`:

```bash
cp .env.example .env
npm install
npm run dev
```

- `npm run dev` → `nodemon server.js`
- `npm start` → `node server.js`

`server.js` loads `dotenv/config` and listens on `env.PORT`.

---

## 2. Site slug handling

Implemented in `backend/src/middleware/siteContext.js`.

### How the backend identifies the site

Resolution order (first non-empty after the fallback):

1. HTTP header **`X-Site-Slug`** (`req.get('x-site-slug')`)
2. Query parameter **`site`** (`req.query.site`)
3. Environment **`DEFAULT_SITE_SLUG`** (default `jooblie`)

The raw value is trimmed, lowercased, and truncated to 80 characters.

**Not used for request site context:** URL path segments, request body fields.

Admin portal routes use path param `:slug` only as a **lookup key** (`GET /admin/portals/:slug`). They do **not** apply `siteContext` to the request.

### Where `siteContext` is applied

| Area | Uses `siteContext`? |
|---|---|
| `GET /health`, `GET /ready` | No |
| `/public/*` | Yes |
| `POST /auth/sign-in`, `POST /auth/sign-up` | Yes |
| `GET /auth/me`, `PATCH /auth/profile` | No |
| `/job-seeker/*` | Yes (after auth) |
| `/recruiter/*` | Yes (after auth) |
| `/admin/*` | No |

CORS also allowlists header `X-Site-Slug`.

### Valid slug values

The API does **not** hard-code an allowlist. It loads `public.sites` where `slug = <resolved>` and `is_active = true`.

Confirmed live `public.sites` rows (provided from the shared database, 2026-09-13):

| id | slug | name | domain | site_type | sector_id | is_active |
|---|---|---|---|---|---|---|
| 1 | `jooblie` | Jooblie | jooblie.com | `aggregator` | `null` | **true** |
| 2 | `office-jobs` | Office Jobline | office-jobline.vercel.app | `sector` | `1` | **true** |
| 3 | `it-jobs` | IT Jobs Jobline | it-jobs.placeholder.jooblie.com | `sector` | `2` | **false** |
| 4 | `hospitality-healthcare` | Hospitality & Healthcare Jobline | hospitality-healthcare.placeholder.jooblie.com | `sector` | `3` | **false** |
| 5 | `transport-farming` | Transportation & Farming Jobline | transport-farming.placeholder.jooblie.com | `sector` | `4` | **false** |
| 6 | `aboriginal` | Aboriginal Jobline | aboriginal.placeholder.jooblie.com | `audience` | `null` | **true** |
| 7 | `newcomers` | Newcomer Jobline | newcomers.placeholder.jooblie.com | `audience` | `null` | **true** |
| 8 | `service-care` | ServiceCare Jobline | service-care.placeholder.jooblie.com | `sector` | `3` | **true** |
| 9 | `health-care` | Health Care Jobline | health-care.placeholder.jooblie.com | `sector` | `3` | **true** |
| 10 | `farmerfreight` | FarmerFreight Jobline | farmerfreight.placeholder.jooblie.com | `sector` | `4` | **true** |

**Currently accepted by `siteContext`** (`is_active = true` only):

`jooblie`, `office-jobs`, `aboriginal`, `newcomers`, `service-care`, `health-care`, `farmerfreight`

**Present in the table but rejected as `SITE_NOT_FOUND` until activated:**

`it-jobs`, `hospitality-healthcare`, `transport-farming`

**Audience-only slugs** used when posting jobs (`audience_sites` / Zod): `aboriginal`, `newcomers`. Database trigger `private.validate_job_audience_site()` rejects any other slug on `job_audience_sites`.

Confirmed `sites.site_type` values in this registry: `aggregator`, `sector`, `audience`.

How the API uses `site_type` (`public.controller.js` / recruiter category checks):

- `aggregator` or `audience` → all active categories (no sector filter)
- anything else, including `sector` → `category_sites` for that site, or fallback `sites.sector_id`

### Missing or invalid slug

- **Missing header and query:** falls back to `DEFAULT_SITE_SLUG` (`jooblie`). This is **not** an error.
- **Unknown slug, inactive site, or DB error:** `404` with code `SITE_NOT_FOUND`, message `This Jooblie site is not configured.`
- Sign-up without a resolved `req.site.id` (should not happen if middleware ran): `400` `SIGNUP_SITE_REQUIRED`.

Public job/category reads are scoped by `req.site.id` via `job_sites` / `category_sites`. Public **company list** is **not** site-filtered.

---

## 3. Authentication and authorization

### Mechanism

- **Supabase Auth** (JWT access token), not Express sessions.
- Clients send: `Authorization: Bearer <access_token>`
- `requireAuth` / `optionalAuth` call `serviceDb.auth.getUser(token)`.
- After validation, `req.user` is the Supabase user, `req.profile` is `public.profiles`, and `req.db` is a Supabase client using the user’s JWT (`createUserDb`).
- Sign-in uses `auth.signInWithPassword`; sign-up uses `auth.signUp`.

Token format: opaque JWT string from Supabase. JWT claims / signing algorithm: **NOT FOUND / NEEDS CONFIRMATION** in this repo (handled by Supabase).

### Signup / login (seeker and recruiter)

Same endpoints for both roles. Role is a body field on sign-up.

| Action | Method + path | Role in body |
|---|---|---|
| Login | `POST /api/v1/auth/sign-in` | n/a (existing account) |
| Signup | `POST /api/v1/auth/sign-up` | `job_seeker` or `recruiter` |

Admin accounts are **not** created via sign-up (`role` enum is only `job_seeker` | `recruiter`). Admin is assigned via `PATCH /api/v1/admin/users/:userId/role`.

### Role-based access

`requireRole(...roles)` checks `req.profile.role`.

| Prefix | Auth | Allowed `profiles.role` |
|---|---|---|
| `/api/v1/public/*` | Optional (`optionalAuth` global; not required) | Public |
| `/api/v1/auth/sign-in`, `/auth/sign-up` | None | Public (rate-limited) |
| `/api/v1/auth/me`, `/auth/profile` | Required | Any **active** profile |
| `/api/v1/job-seeker/*` | Required | `job_seeker` only |
| `/api/v1/recruiter/*` | Required | `recruiter` **or** `admin` |
| `/api/v1/admin/*` | Required | `admin` only |

Additional checks:

- Profile missing → `403` `PROFILE_MISSING`
- `profiles.status !== 'active'` → `403` `ACCOUNT_INACTIVE` (also blocked at sign-in)
- Recruiter job/application actions require membership in `company_members` for that company
- Job create binds `company_id` from `profiles.recruiter_company_id` (or a single legacy membership), not from the client body

### Token refresh / expiry

- **No** `/auth/refresh` or `/auth/logout` route exists in this backend.
- Sign-in / sign-up (when a session is returned) include `access_token`, `refresh_token`, `expires_at`, `token_type` from Supabase.
- Invalid/expired access token on protected routes → `401` `INVALID_SESSION` (`Your session is invalid or expired.`).
- Actual token lifetime and how to refresh: **NOT FOUND / NEEDS CONFIRMATION** in this backend (use Supabase Auth client / `refresh_token` against Supabase, not this Express app).
- If Supabase email confirmation is enabled, sign-up may return `session: null` and `confirmationRequired: true`.

Password reset / forgot password: **NOT FOUND** (no routes).

Logout: **NOT FOUND** (no routes). Clients typically drop the token locally; `signIn` does call `auth.signOut()` only when blocking an inactive account.

---

## 4. Common error envelope and limits

All handled errors use:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human-readable message.",
    "requestId": "uuid-or-supplied-x-request-id"
  }
}
```

In non-production, `VALIDATION_ERROR` and some `ApiError`s may include `error.details` (Zod `flatten()`).

| Status | Typical codes |
|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, various `*_FAILED` |
| 401 | `AUTH_REQUIRED`, `INVALID_SESSION`, `SIGN_IN_FAILED` |
| 403 | `FORBIDDEN`, `PROFILE_MISSING`, `ACCOUNT_INACTIVE`, `CORS_FORBIDDEN`, `COMPANY_FORBIDDEN`, `RESUME_FORBIDDEN` |
| 404 | `NOT_FOUND`, `SITE_NOT_FOUND`, `JOB_NOT_FOUND`, `COMPANY_NOT_FOUND`, `APPLICATION_NOT_FOUND`, `PORTAL_NOT_FOUND`, `RESUME_NOT_FOUND` |
| 409 | `ALREADY_APPLIED`, `COMPANY_NAME_TAKEN`, `INVALID_APPLICATION_TRANSITION`, `RESUME_ALREADY_REGISTERED`, `RECRUITER_COMPANY_NOT_BOUND` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR`, various load failures |

Rate limits (`backend/src/middleware/security.js`):

- Global: `RATE_LIMIT_MAX` per `RATE_LIMIT_WINDOW_MS`
- Auth (`sign-in` / `sign-up`): `AUTH_RATE_LIMIT_MAX` per window
- Writes (marked `writeLimiter`): `WRITE_RATE_LIMIT_MAX` per window

JSON body limit: `REQUEST_BODY_LIMIT` (default 256kb).

Authenticated `/auth`, `/job-seeker`, `/recruiter`, `/admin` responses set `Cache-Control: no-store`.

---

## 5. Full endpoint list

Paths below are **full paths** including `/api/v1`.

Unless noted, success examples show the **actual `res.json` keys**. Nested relation objects come from Supabase embeds; extra columns may exist in the database and appear if selected.

---

### 5.1 Health (not feature-grouped, but implemented)

#### `GET /api/v1/health`

- **Auth:** none
- **Body/query:** none
- **Success `200`:**

```json
{
  "ok": true,
  "service": "jooblie-shared-backend",
  "timestamp": "2026-09-12T18:00:00.000Z"
}
```

#### `GET /api/v1/ready`

- **Auth:** none
- **Success `200`:** `{ "ok": true, "database": "ready", "timestamp": "..." }`
- **Error:** `500` if `sites` select fails

---

### 5.2 Authentication

#### `POST /api/v1/auth/sign-in`

- **Auth:** none (auth rate limiter + `siteContext`)
- **Body (required):**

| Field | Type |
|---|---|
| `email` | string, email, max 320 |
| `password` | string, min 8, max 200 |

- **Success `200`:**

```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_at": 1710000000,
    "token_type": "bearer"
  }
}
```

(`expires_at` / `token_type` are passed through from Supabase. Exact numeric vs ISO form: **NOT FOUND / NEEDS CONFIRMATION** beyond “whatever Supabase returns”.)

- **Errors:** `401` `SIGN_IN_FAILED`; `403` `ACCOUNT_INACTIVE`; `429` `RATE_LIMITED`; `404` `SITE_NOT_FOUND` if slug invalid

#### `POST /api/v1/auth/sign-up`

- **Auth:** none (auth rate limiter + `siteContext`)
- **Body:**

| Field | Type | Required |
|---|---|---|
| `email` | string email | yes |
| `password` | string 8–200 | yes |
| `name` | string 2–160 | yes |
| `role` | `"job_seeker"` \| `"recruiter"` | yes |
| `company_name` | string max 180 | required if recruiter |
| `company_website` | URL max 1000 | required if recruiter |
| `company_registration_number` | string max 180 | required if recruiter |

- **Success `201`:**

```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "company": { "id": "uuid", "name": "Acme Inc" },
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_at": 1710000000,
    "token_type": "bearer"
  },
  "confirmationRequired": false
}
```

For job seekers, `company` is `null`. If email confirmation is required, `session` is `null` and `confirmationRequired` is `true`.

- **Errors:** `400` `VALIDATION_ERROR` / `SIGN_UP_FAILED` / `SIGNUP_SITE_REQUIRED` / `COMPANY_BOOTSTRAP_FAILED`; `409` `COMPANY_NAME_TAKEN`; `500` profile/company bootstrap codes

#### `GET /api/v1/auth/me`

- **Auth:** required (any active role)
- **Success `200`:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "profile": {
    "id": "uuid",
    "role": "job_seeker",
    "status": "active",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "phone": null,
    "headline": null,
    "location_province": null,
    "location_city": null,
    "skills": [],
    "experience": [],
    "education": [],
    "default_resume_path": null,
    "signup_site_id": 1,
    "recruiter_company_id": null
  }
}
```

#### `PATCH /api/v1/auth/profile`

- **Auth:** required (any active role)
- **Body (all optional):** `full_name` (string 2–160), `phone`, `headline`, `location_province`, `location_city`, `skills` (string[] max 50, each max 80), `default_resume_path`, `experience` (array max 20), `education` (array max 20)

Experience item:

```json
{
  "title": "string",
  "company": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "current": false,
  "description": "string"
}
```

Education item:

```json
{
  "degree": "string",
  "institution": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "current": false,
  "field": "string"
}
```

- **Success `200`:** `{ "profile": { ...same keys as /auth/me profile... } }`
- **Errors:** `400` `VALIDATION_ERROR` / `PROFILE_UPDATE_FAILED`

#### Not implemented

| Endpoint | Status |
|---|---|
| Logout | **NOT FOUND** |
| Password reset / forgot password | **NOT FOUND** |
| Token refresh | **NOT FOUND** on this API |

---

### 5.3 Job listings (public)

All require valid site context. Only jobs mapped in `job_sites` for the current site, `status = active`, `deleted_at` null, and not expired.

#### `GET /api/v1/public/jobs`

- **Auth:** none
- **Query:**

| Param | Type | Notes |
|---|---|---|
| `page` | integer | default 1 |
| `limit` | integer | default 10, max 60 |
| `q` | string | search title/description/city/province, max ~120 after sanitize |
| `location` | string | city/province ILIKE; `remote` → `is_remote = true` |
| `type` or `jobType` | string | normalized to `full_time`, `part_time`, `contract`, `temporary`, `internship`, `seasonal` |
| `workplace` or `workplaceType` | string | `remote` or `onsite` / `on-site` / `on_site` |
| `salary` | string | `150000+` or `min-max` applied to `jobs.salary_min` |
| `date` | number | last N days (1–3650) on `jobs.created_at` |
| `category` | string | category slug **or** focus alias (see below) |

Category focus aliases (not site slugs):

| Query value | Resolves to |
|---|---|
| `it-software` | categories with `sector_id = 2` |
| `office-admin` | categories with `sector_id = 1` |
| `restaurant` | slugs `hospitality-guest-services`, `food-beverage` |
| `agriculture` | slug `agriculture-farming` |
| `trucking` | slugs `driving-delivery`, `logistics-warehousing` |
| any other | exact `categories.slug` match |

Unknown category → empty list (`200`, `total: 0`), not 404.

- **Success `200`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Software Developer",
      "description": "...",
      "province": "Ontario",
      "city": "Toronto",
      "is_remote": false,
      "salary_min": 80000,
      "salary_max": 110000,
      "salary_currency": "CAD",
      "salary_period": "yearly",
      "employment_type": "full_time",
      "skills": ["JavaScript"],
      "status": "active",
      "published_at": "2026-01-01T00:00:00.000Z",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z",
      "expires_at": null,
      "company_id": "uuid",
      "category_id": 1,
      "origin_site_id": 1,
      "companies": {
        "id": "uuid",
        "name": "Acme",
        "website": "https://acme.example",
        "logo_path": null,
        "description": null,
        "verification_status": "pending",
        "status": "active"
      },
      "categories": {
        "id": 1,
        "name": "Software Development",
        "slug": "software-development",
        "sector_id": 2
      }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
}
```

Public job select does **not** include `workplace_type` or `experience_level` (those appear on seeker/recruiter job selects).

- **Errors:** `500` `PUBLIC_JOBS_FAILED`; `404` `SITE_NOT_FOUND`

#### `GET /api/v1/public/jobs/:jobId`

- **Auth:** none
- **Path:** `jobId` (UUID)
- Side effect: best-effort `increment_job_view` RPC (IP hashed, daily de-dupe)
- **Success `200`:** `{ "job": { ...same public job shape as list item... } }`
- **Errors:** `404` `JOB_NOT_FOUND` (not mapped to this site, inactive, deleted, or expired)

#### `GET /api/v1/public/dataset`

- **Auth:** none
- **Success `200`:**

```json
{
  "site": {
    "id": 1,
    "slug": "jooblie",
    "name": "Jooblie",
    "domain": "example.com",
    "site_type": "aggregator",
    "sector_id": null,
    "is_active": true
  },
  "jobs": [],
  "categories": [],
  "companies": [],
  "configured": true,
  "errors": []
}
```

Jobs capped at 500. Companies are all active companies (not site-scoped), limit 500.

#### `GET /api/v1/public/companies`

- **Auth:** none
- **Site:** middleware runs, but list is **not** filtered by site
- **Success `200`:** `{ "items": [ { "id", "name", "website", "logo_path", "description", "verification_status", "status", "created_at" } ] }`
- **Errors:** `500` `COMPANIES_FAILED`

#### `GET /api/v1/public/companies/:companyId`

- **Auth:** none
- **Success `200`:** `{ "company": { ... }, "jobs": [ /* public jobs for this company on current site */ ] }`
- **Errors:** `404` `COMPANY_NOT_FOUND`; `500` `COMPANY_JOBS_FAILED`

#### `GET /api/v1/public/categories`

- **Auth:** none
- Categories: all active if `site_type` is `aggregator` or `audience`; else `category_sites` for the site, or fallback `sector_id`
- **Success `200`:** `{ "items": [ { "id", "sector_id", "name", "slug", "sort_order", "is_active" } ] }`

#### Recruiter/admin create/update/delete listings

See [Recruiter job posting](#recruiter-job-posting) and [Admin](#510-admin-implemented-extra-to-the-requested-feature-list). There is **no** public create/update/delete.

---

### 5.4 Job applications

#### Apply — `POST /api/v1/job-seeker/jobs/:jobId/apply`

- **Auth:** `job_seeker`
- **Path:** `jobId` UUID
- **Body (optional):**

| Field | Type |
|---|---|
| `cover_letter` | string max 10000, or empty/null |
| `resume_path` | string max 1000 — must match an active `resume_documents.storage_path` owned by the user |

If `resume_path` omitted, uses `profiles.default_resume_path`. Still must exist in `resume_documents`.

- **Success `201`:**

```json
{
  "application": {
    "id": "uuid",
    "status": "submitted",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

- **Errors:** `400` `RESUME_REQUIRED` / `APPLICATION_FAILED` / `VALIDATION_ERROR`; `403` `RESUME_FORBIDDEN`; `404` `JOB_NOT_FOUND` / `JOB_EXPIRED`; `409` `ALREADY_APPLIED`

#### List seeker applications

**No dedicated list endpoint.** Applications are returned on `GET /api/v1/job-seeker/dashboard` as `applications` (latest 20).

#### Recruiter list / status

See [Applicant management](#58-applicant-management) and [Hiring-stage updates](#59-hiring-stage-updates).

Seeker-initiated withdraw: **NOT FOUND** (status `withdrawn` exists in the enum and recruiter transition map as terminal; no seeker withdraw route).

---

### 5.5 Saved jobs

#### `POST /api/v1/job-seeker/jobs/:jobId/save`

- **Auth:** `job_seeker`
- **Success `201`** (new) or **`200`** (already saved):

```json
{
  "saved": true,
  "alreadySaved": false,
  "jobId": "uuid",
  "savedViaSiteId": 1,
  "savedJob": {
    "user_id": "uuid",
    "job_id": "uuid",
    "saved_via_site_id": 1,
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

Duplicate-key race may omit `savedJob` and still return `saved: true`, `alreadySaved: true`.

- **Errors:** `404` job not visible/expired; `400` `SAVE_JOB_FAILED`

#### `DELETE /api/v1/job-seeker/jobs/:jobId/save`

- **Auth:** `job_seeker`
- **Success `200`:** `{ "saved": false, "jobId": "uuid", "removed": true }` (`removed` is `false` if nothing was deleted)
- **Errors:** `400` `UNSAVE_JOB_FAILED`

#### List saved jobs

**No dedicated list endpoint.** Use `GET /api/v1/job-seeker/dashboard` → `savedJobs`, `savedJobIds`, `metrics.savedJobs`.

---

### 5.6 Seeker profiles and files

#### Get profile

Use `GET /api/v1/auth/me` (any role).  
Dashboard also returns a subset: `GET /api/v1/job-seeker/dashboard` → `profile`.

#### Update profile

`PATCH /api/v1/auth/profile` (see Authentication). Not role-restricted to seekers.

#### Resume file upload (two-step; upload is not Express)

There is **no** `multipart` upload route on this API.

1. Client uploads PDF to Supabase Storage bucket **`resumes`** at path `{userId}/{filename}` (must start with `{userId}/`).
2. Client registers the object:

#### `POST /api/v1/job-seeker/resumes`

- **Auth:** `job_seeker`
- **Body (required):**

| Field | Type |
|---|---|
| `path` | string 5–1000, must start with `{authUserId}/` |
| `original_name` | string 1–255 |
| `size_bytes` | integer, 1–5242880, must equal stored blob size |
| `content_type` | literal `"application/pdf"` |

Server downloads the object, checks `%PDF-` magic bytes and size ≤ 5 MB.

- **Success `201`:**

```json
{
  "resume": {
    "id": "uuid",
    "storage_path": "user-id/file.pdf",
    "original_name": "resume.pdf",
    "size_bytes": 12345,
    "content_type": "application/pdf",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

- **Errors:** `403` `RESUME_PATH_FORBIDDEN`; `400` `RESUME_VERIFY_FAILED` / `RESUME_TOO_LARGE` / `RESUME_NOT_PDF` / `RESUME_SIZE_MISMATCH` / `RESUME_REGISTER_FAILED`; `409` `RESUME_ALREADY_REGISTERED`

#### `GET /api/v1/job-seeker/resumes`

- **Auth:** `job_seeker`
- **Success `200`:** `{ "items": [ { "id", "storage_path", "original_name", "size_bytes", "content_type", "is_active", "created_at" } ] }`

#### `GET /api/v1/job-seeker/resume-url`

- **Auth:** `job_seeker`
- **Query:** `id` (optional resume UUID). If omitted, latest active resume.
- **Success `200`:** `{ "url": "https://...signed...", "expiresIn": 300, "resume": { "id", "storage_path", "original_name", "created_at" } }`
- **Errors:** `404` `RESUME_NOT_FOUND` / `RESUME_URL_FAILED`

#### Other seeker reads

##### `GET /api/v1/job-seeker/dashboard`

- **Auth:** `job_seeker`
- **Success `200`:**

```json
{
  "metrics": {
    "applications": 0,
    "savedJobs": 0,
    "interviews": 0,
    "shortlisted": 0,
    "offers": 0
  },
  "profile": {
    "full_name": "Jane Doe",
    "phone": null,
    "headline": null,
    "location_province": null,
    "location_city": null,
    "skills": [],
    "default_resume_path": null,
    "experience": [],
    "education": []
  },
  "applications": [],
  "savedJobs": [],
  "savedJobIds": []
}
```

`applications[]` items include `id`, `status`, `created_at`, `updated_at`, `job_id`, nested `jobs`.  
`savedJobs[]` include `created_at`, `job_id`, `saved_via_site_id`, nested `jobs`.

##### `GET /api/v1/job-seeker/recommended-jobs`

- **Auth:** `job_seeker`
- **Query:** `limit` integer 1–12, default 6
- **Success `200`:** `{ "items": [ { "...job fields...", "recommendation_score": 0, "recommendation_reasons": [] } ], "basedOnProfile": false }`

---

### 5.7 Recruiter companies

#### `GET /api/v1/recruiter/companies`

- **Auth:** `recruiter` or `admin`
- **Success `200`:** `{ "items": [ { "id", "name", "website", "registration_number", "verification_document_path", "logo_path", "description", "verification_status", "status", "created_at" } ] }`
- Empty membership → `{ "items": [] }`

#### `POST /api/v1/recruiter/companies`

- **Auth:** `recruiter` or `admin`
- **Body:**

| Field | Type | Required |
|---|---|---|
| `name` | string 2–180 | yes |
| `website` | URL max 1000 | yes |
| `registration_number` | string 2–180 | yes |
| `verification_document_path` | string | no |
| `logo_path` | string | no |
| `description` | string max 10000 | no |

- **Success `201`:** `{ "company": { "id", "name", "website", "registration_number", "verification_document_path", "logo_path", "description", "verification_status", "status", "created_at" } }`
- **Errors:** `400` `COMPANY_CREATE_FAILED` / `COMPANY_MEMBER_FAILED`

#### Update company profile

**NOT FOUND** — no `PATCH /recruiter/companies/:id` (or similar) in `routes.js`.

Logo/verification document **file upload endpoints:** **NOT FOUND** on Express (paths are stored as strings; upload target **NOT FOUND / NEEDS CONFIRMATION** beyond resumes bucket).

---

### Recruiter job posting

#### Create — `POST /api/v1/recruiter/jobs`

- **Auth:** `recruiter` or `admin`
- **Site:** current `X-Site-Slug` becomes `origin_site_id`; category must belong to that specialist portal (unless aggregator/audience)
- **`company_id` is not accepted from the client.** Server uses bound recruiter company.
- **Body:**

| Field | Type | Required |
|---|---|---|
| `title` | string 3–180 | yes |
| `category_id` | integer 1–32767 | yes |
| `employment_type` | enum below | yes |
| `description` | string 20–30000 | yes |
| `province` | string | no |
| `city` | string | no |
| `is_remote` | boolean | default `false` (overridden if `workplace_type === 'remote'`) |
| `workplace_type` | `onsite` \| `hybrid` \| `remote` | default `onsite` |
| `experience_level` | `entry_level` \| `mid_level` \| `senior` \| `executive` | default `mid_level` |
| `salary_min` / `salary_max` | number ≥ 0 or null | no |
| `salary_currency` | 3-letter, default `CAD` | no |
| `salary_period` | `hourly` \| `weekly` \| `monthly` \| `yearly` or null | no |
| `skills` | string[] max 50 | default `[]` |
| `audience_sites` | `aboriginal` and/or `newcomers` | default `[]` |

`employment_type`: `full_time` \| `part_time` \| `contract` \| `temporary` \| `internship` \| `seasonal`

Server insert sets `status: 'active'` and `published_at` immediately (not `pending_review`).

- **Success `201`:**

```json
{
  "job": {
    "id": "uuid",
    "title": "Software Developer",
    "status": "active",
    "company_id": "uuid",
    "category_id": 12,
    "origin_site_id": 1,
    "created_at": "2026-01-01T00:00:00.000Z",
    "published_at": "2026-01-01T00:00:00.000Z"
  }
}
```

- **Errors:** `400` `SITE_CATEGORY_MISMATCH` / `JOB_CREATE_FAILED` / `AUDIENCE_SITE_INVALID` / `VALIDATION_ERROR`; `409` `RECRUITER_COMPANY_NOT_BOUND`; `403` `COMPANY_FORBIDDEN`

#### Edit — `PATCH /api/v1/recruiter/jobs/:jobId`

- **Auth:** `recruiter` or `admin` (must belong to the job’s company)
- **Body:** same fields as create, all optional, plus `status`: `pending_review` \| `closed` only
- **Success `200`:** `{ "job": { "id", "title", "status", "company_id", "category_id", "origin_site_id", "updated_at" } }`
- **Errors:** `404` `JOB_NOT_FOUND`; `400` `JOB_UPDATE_FAILED` / `SITE_CATEGORY_MISMATCH`

#### Delete own posting (recruiter)

**NOT FOUND.** Soft-delete exists only as `DELETE /api/v1/admin/jobs/:jobId`.

#### List own postings

**No dedicated `GET /recruiter/jobs`.** Own jobs (up to 100) are on `GET /api/v1/recruiter/dashboard` → `jobs`.

##### `GET /api/v1/recruiter/dashboard`

- **Auth:** `recruiter` or `admin`
- **Success `200`:**

```json
{
  "metrics": {
    "companies": 0,
    "jobs": 0,
    "activeJobs": 0,
    "applications": 0,
    "views": 0
  },
  "pipeline": {
    "submitted": 0,
    "viewed": 0,
    "shortlisted": 0,
    "interviewing": 0,
    "offered": 0,
    "hired": 0,
    "rejected": 0,
    "withdrawn": 0
  },
  "companies": [],
  "jobs": [],
  "recentApplications": []
}
```

Each dashboard job also includes nested `companies`, `categories`, `views_count`, `applications_count`, `application_status_counts`.

---

### 5.8 Applicant management

#### `GET /api/v1/recruiter/jobs/:jobId/applications`

- **Auth:** `recruiter` or `admin` (company access)
- **Success `200`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "status": "submitted",
      "cover_letter": null,
      "resume_path": "user-id/file.pdf",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z",
      "applicant_id": "uuid",
      "profiles": {
        "id": "uuid",
        "full_name": "Jane Doe",
        "headline": null,
        "location_city": null,
        "location_province": null,
        "skills": [],
        "default_resume_path": null,
        "experience": [],
        "education": []
      }
    }
  ]
}
```

- **Errors:** `404` `JOB_NOT_FOUND`; `403` `COMPANY_FORBIDDEN`; `500` `APPLICATIONS_FAILED`

#### `GET /api/v1/recruiter/applications`

Paginated candidates across all company jobs.

- **Auth:** `recruiter` or `admin`
- **Query:** `page` (default 1), `pageSize` (default 25, max 100), `status` (optional; `all` or omitted = no filter)
- **Success `200`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "status": "submitted",
      "cover_letter": null,
      "resume_path": "...",
      "created_at": "...",
      "updated_at": "...",
      "applicant_id": "uuid",
      "job_id": "uuid",
      "jobs": { "id": "uuid", "title": "Software Developer", "company_id": "uuid" },
      "profiles": { }
    }
  ],
  "page": 1,
  "pageSize": 25,
  "total": 0
}
```

#### Applicant detail

**No dedicated `GET /recruiter/applications/:id`.** Detail is the list item + profile embed above, plus resume URL:

#### `GET /api/v1/recruiter/applications/:applicationId/resume-url`

- **Auth:** `recruiter` or `admin` (company access)
- If application `status === 'submitted'`, server updates it to `viewed`
- **Success `200`:** `{ "url": "https://...signed...", "expiresIn": 300 }`
- **Errors:** `404` `RESUME_NOT_FOUND` / `APPLICATION_NOT_FOUND` / `RESUME_URL_FAILED`; `403` `COMPANY_FORBIDDEN`

---

### 5.9 Hiring-stage updates

#### `PATCH /api/v1/recruiter/applications/:applicationId`

- **Auth:** `recruiter` or `admin`
- **Body (required):** `{ "status": "<stage>" }`

**Allowed stored values** (Zod + recruiter transition map):

`submitted` | `viewed` | `shortlisted` | `interviewing` | `offered` | `hired` | `rejected` | `withdrawn`

**Allowed transitions** (`backend/src/controllers/recruiter.controller.js`):

| From | To |
|---|---|
| `submitted` | `submitted`, `viewed`, `shortlisted`, `rejected` |
| `viewed` | `viewed`, `shortlisted`, `interviewing`, `rejected` |
| `shortlisted` | `shortlisted`, `interviewing`, `rejected` |
| `interviewing` | `interviewing`, `offered`, `rejected` |
| `offered` | `offered`, `hired`, `rejected` |
| `hired` | `hired` |
| `rejected` | `rejected` |
| `withdrawn` | `withdrawn` |

Illegal move → `409` `INVALID_APPLICATION_TRANSITION`.

- **Success `200`:** `{ "application": { "id": "uuid", "status": "shortlisted", "updated_at": "..." } }`
- **Errors:** `404` `APPLICATION_NOT_FOUND`; `400` `APPLICATION_UPDATE_FAILED`; `409` as above

---

### 5.10 Admin (implemented; extra to the requested feature list)

All require role `admin`. No `siteContext`.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | metrics, recent users/companies, pending jobs, sites, audit/security |
| `GET` | `/api/v1/admin/portals` | all `sites` + job/user counts |
| `GET` | `/api/v1/admin/portals/:slug` | portal detail |
| `GET` | `/api/v1/admin/jobs` | query: `page`, `limit` (default 25, max 100), `status`, `siteId`, `search`/`q` |
| `GET` | `/api/v1/admin/jobs/:jobId` | job + applications + views + portals |
| `PATCH` | `/api/v1/admin/jobs/:jobId` | job fields + optional `status` (`pending_review`\|`closed` from job schema) + `moderation_note` |
| `DELETE` | `/api/v1/admin/jobs/:jobId` | soft delete: `deleted_at`, `status: removed` |
| `PATCH` | `/api/v1/admin/jobs/:jobId/status` | `status`: `pending_review`\|`active`\|`closed`\|`expired`\|`removed`; optional `moderation_note` |
| `GET` | `/api/v1/admin/users` | paginated profiles |
| `PATCH` | `/api/v1/admin/users/:userId/role` | `{ "role": "job_seeker"\|"recruiter"\|"admin" }`; cannot remove own admin |
| `GET` | `/api/v1/admin/audit-logs` | `activity_log` |
| `GET` | `/api/v1/admin/security-events` | query: `severity`, `eventType` |

**Note:** `GET /admin/jobs/:jobId` selects `applications.profile_id`. Recruiter/seeker code uses `applicant_id`. Whether `profile_id` exists on `applications` is **NOT FOUND / NEEDS CONFIRMATION** (possible mismatch).

---

## 6. Data models

Storage is **Supabase/PostgreSQL**, not Mongoose or Sequelize.

`CREATE TABLE` for core tables is **not in this repo**. Types/`required` below: **migration** = defined in `database/migrations`; **API** = used by controllers/Zod. `required` means “must be present for the documented write path,” not necessarily a DB `NOT NULL` unless the migration says so.

### `auth.users` (Supabase)

Managed by Supabase Auth. API exposes `id`, `email`, `created_at`. Other columns: **NOT FOUND / NEEDS CONFIRMATION**.

### `profiles`

| Field | Type (as used) | Required | Source |
|---|---|---|---|
| `id` | uuid (= `auth.users.id`) | yes on insert | API |
| `role` | `job_seeker` \| `recruiter` \| `admin` | yes | API |
| `status` | string; auth requires `'active'` | yes on signup (`active`) | API |
| `email` | string | yes on signup | API |
| `full_name` | string | yes on signup | API |
| `phone` | string \| null | no | API |
| `headline` | string \| null | no | API |
| `location_province` | string \| null | no | API |
| `location_city` | string \| null | no | API |
| `skills` | jsonb/array | no | API |
| `default_resume_path` | text \| null | no | API |
| `experience` | jsonb, default `[]` | no | migration 002 |
| `education` | jsonb, default `[]` | no | migration 002 |
| `signup_site_id` | smallint (FK `sites.id`) | yes on signup | API |
| `recruiter_company_id` | uuid \| null | recruiter binding | migration 003 |

Other profile columns: **NOT FOUND / NEEDS CONFIRMATION**.

### `sites`

Confirmed columns and live values (database dump, 2026-09-13):

| Field | Type (from live rows) | Required | Notes |
|---|---|---|---|
| `id` | smallint | yes | 1–10 in current registry |
| `slug` | text | yes | unique request identifier |
| `name` | text | yes | display name |
| `domain` | text | yes in current rows | stored hostname; **not** used by `siteContext` |
| `site_type` | `aggregator` \| `sector` \| `audience` | yes in current rows | see section 2 |
| `sector_id` | smallint \| null | no | null for aggregator/audience; `1` office, `2` IT, `3` hospitality/health, `4` transport/farming |
| `is_active` | boolean | yes | `siteContext` requires `true` |

`domain` is returned on `req.site` and admin portal payloads. Request routing still uses `X-Site-Slug` / `?site=`, not `Host` / `domain`.

### `categories`

Selected: `id`, `sector_id`, `name`, `slug`, `sort_order`, `is_active`.  
`id` treated as smallint. Full schema: **NOT FOUND / NEEDS CONFIRMATION**.

### `category_sites`

`category_id`, `site_id` (used as mapping). PK/types: **NOT FOUND / NEEDS CONFIRMATION**.

### `sectors`

Referenced by `categories.sector_id` / `sites.sector_id`. Table columns: **NOT FOUND / NEEDS CONFIRMATION**.

### `companies`

| Field | Type | Required | Source |
|---|---|---|---|
| `id` | uuid | generated | API |
| `name` | text | yes (create/signup) | API |
| `website` | text | yes (create/signup) | API |
| `registration_number` | text | yes on API create; DB allows null for legacy | migration 004 |
| `created_by` | uuid \| null | set on create | migration 004/005 |
| `verification_document_path` | text | no | migration 004 |
| `logo_path` | text | no | migration 004 |
| `description` | text | no | migration 004 |
| `verification_status` | text, default `pending` | no | migration 004 |
| `status` | text, default `active` | no | migration 004 |
| `deleted_at` | timestamptz | no | migration 004 |
| `created_at` | timestamptz | selected | API |

Unique live name check: API uses `ilike` + unique index name `companies_lower_name_live_idx` (referenced in error handling). Index definition: **NOT FOUND / NEEDS CONFIRMATION** in repo SQL.

### `company_members`

| Field | Type | Required | Source |
|---|---|---|---|
| `company_id` | uuid | yes | API |
| `user_id` | uuid | yes | API |
| `role` | `owner` \| `member` (README) | yes (`owner` on bootstrap) | API / README |

Partial unique index: one `owner` row per `user_id` (migration 004). Other columns (`created_at`, etc.): **NOT FOUND / NEEDS CONFIRMATION**.

### `jobs`

| Field | Type | Required | Source |
|---|---|---|---|
| `id` | uuid | generated | migration 001 FKs |
| `title` | text | yes on create | API |
| `description` | text | yes on create | API |
| `province` | text \| null | no | API |
| `city` | text \| null | no | API |
| `is_remote` | boolean | defaulted | API |
| `workplace_type` | `onsite`\|`hybrid`\|`remote`, default `onsite` | no | migration 003 |
| `experience_level` | `entry_level`\|`mid_level`\|`senior`\|`executive`, default `mid_level` | no | migration 003 |
| `salary_min` / `salary_max` | number \| null | no | API |
| `salary_currency` | char(3) typical | default CAD on create | API |
| `salary_period` | enum or null | no | API |
| `employment_type` | enum | yes on create | API |
| `skills` | array | no | API |
| `status` | `pending_review`\|`active`\|`closed`\|`expired`\|`removed` | set on write | README / API |
| `published_at` | timestamptz \| null | set when active | API |
| `created_at` / `updated_at` | timestamptz | selected | API |
| `expires_at` | timestamptz \| null | no | API |
| `removed_reason` | text | admin remove | API |
| `deleted_at` | timestamptz \| null | soft delete | API |
| `company_id` | uuid | yes (server-set) | API |
| `category_id` | smallint | yes on create | API / migration |
| `origin_site_id` | smallint | yes (server-set) | API |
| `created_by` | uuid | set on create | API |

### `job_sites`

`job_id` (uuid), `site_id` (smallint). Unique `(job_id, site_id)` implied by `ON CONFLICT`. Other columns: **NOT FOUND / NEEDS CONFIRMATION**.

### `job_audience_sites` (migration 001)

| Field | Type | Required |
|---|---|---|
| `job_id` | uuid FK `jobs` | yes (PK) |
| `site_id` | smallint FK `sites` | yes (PK) |
| `created_at` | timestamptz | default `now()` |

### `applications`

| Field | Type | Required | Source |
|---|---|---|---|
| `id` | uuid | generated | API |
| `job_id` | uuid | yes | API |
| `applicant_id` | uuid | yes | API |
| `resume_path` | text | yes on apply | API |
| `cover_letter` | text \| null | no | API |
| `applied_via_site_id` | smallint | yes on apply | API |
| `status` | hiring-stage enum | yes (`submitted` on create) | API |
| `created_at` / `updated_at` | timestamptz | selected | API |
| `deleted_at` | timestamptz \| null | soft-delete filter | API |
| `profile_id` | **NOT FOUND / NEEDS CONFIRMATION** | selected only in admin job detail | possible bug |

Unique (applicant, job) implied by Postgres `23505` → `ALREADY_APPLIED`. Constraint name: **NOT FOUND / NEEDS CONFIRMATION**.

### `saved_jobs`

| Field | Type | Required | Source |
|---|---|---|---|
| `user_id` | uuid | yes | API |
| `job_id` | uuid | yes | API |
| `saved_via_site_id` | site id | yes (controller comment: NOT NULL) | API |
| `created_at` | timestamptz | selected | API |

PK/unique (`user_id`, `job_id`): implied by `23505` handling. **NOT FOUND / NEEDS CONFIRMATION** in SQL.

### `resume_documents` (migration 002)

| Field | Type | Required |
|---|---|---|
| `id` | uuid | default `gen_random_uuid()` |
| `user_id` | uuid FK `auth.users` | yes |
| `storage_path` | text unique | yes |
| `original_name` | text | yes |
| `size_bytes` | int, 1–5242880 | yes |
| `content_type` | text, must be `application/pdf` | yes |
| `is_active` | boolean default true | no |
| `created_at` | timestamptz | default now |
| `deleted_at` | timestamptz | no |

### `job_views`

Used fields: `job_id`, `viewer_id`, `viewed_on`, `site_id`, `viewer_hash` (added in migration 001), plus admin select `id`. Full table: **NOT FOUND / NEEDS CONFIRMATION**.

### `activity_log`

Inserted: `actor_id`, `action`, `entity_type`, `entity_id`, `site_id`, `company_id`, `data` (jsonb). Selected also: `id`, `created_at`. Full schema: **NOT FOUND / NEEDS CONFIRMATION**.

### `security_events` (migration 001)

| Field | Type | Required |
|---|---|---|
| `id` | uuid | default |
| `user_id` | uuid \| null | no |
| `event_type` | text | yes |
| `severity` | `low`\|`medium`\|`high`\|`critical` | default `medium` |
| `request_id` | text | no |
| `client_ip` / `server_ip` | text | no |
| `site_id` | smallint \| null | no |
| `data` | jsonb default `{}` | no |
| `created_at` | timestamptz | default now |

### Storage

- Bucket `resumes`: private, 5 MB, PDF only (migration 002).

---

## 7. CORS / allowed origins

Configured in `backend/src/app.js` via the `cors` package.

- **Restricted:** yes. Origins must be listed in `CORS_ORIGINS` (comma-separated).
- Requests with **no** `Origin` header are allowed (`callback(null, true)`).
- Disallowed origin → `403` `CORS_FORBIDDEN` (`Origin is not allowed by CORS.`).
- Methods: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`
- Allowed headers: `Content-Type`, `Authorization`, `X-Site-Slug`, `X-Request-Id`
- Exposed headers: `X-Request-Id`
- `credentials: false`
- `maxAge: 600`

Default allowlist if env unset: `http://localhost:5173`. Example file also includes `http://localhost:5174`.

---

## 8. Integration notes for specialist frontends

Every site should:

1. Call `{API_ORIGIN}/api/v1/...` (same paths).
2. Send **`X-Site-Slug: <that site’s slug>`** on every request (public and authenticated).
3. Use Supabase JWT in `Authorization: Bearer ...` after `POST /auth/sign-in` or `/auth/sign-up`.
4. Keep branding in the frontend only. Visibility is `job_sites` + current slug.

Use the confirmed slugs in section 2. Only **active** rows work today. To connect `it-jobs`, `hospitality-healthcare`, or `transport-farming` to this API without code changes, set those rows to `is_active = true` in `public.sites` (and keep sending that slug in `X-Site-Slug`).

---

## 9. Gaps explicitly confirmed as absent

| Capability | Result |
|---|---|
| Express logout | **NOT FOUND** |
| Password reset | **NOT FOUND** |
| Refresh-token endpoint | **NOT FOUND** |
| Dedicated seeker application list | **NOT FOUND** (dashboard only) |
| Dedicated saved-jobs list | **NOT FOUND** (dashboard only) |
| Recruiter company update | **NOT FOUND** |
| Recruiter job delete | **NOT FOUND** (admin only) |
| Recruiter `GET /jobs` list | **NOT FOUND** (dashboard only) |
| Recruiter application detail by id | **NOT FOUND** (list + resume-url) |
| Seeker withdraw application | **NOT FOUND** |
| Multipart resume upload on Express | **NOT FOUND** (Supabase Storage + register) |
| Hard-coded slug allowlist in Node | **NOT FOUND** (DB `sites` lookup) |
| Original `CREATE TABLE` for users/jobs/apps | **NOT FOUND** in repo |
