# Jooblie — Platform Audit and Client Requirements Discovery

Audit date: 17 October 2026. Scope: existing local working tree, audit only.

## Evidence and limitations

Reviewed active frontend routing, shared authentication/API layers, public/seeker/recruiter/admin workflows, Express routes/controllers/middleware, all seven supplied migrations, SQL fixtures, deployment examples, configuration names, tests and historical reports. Active imports originate in frontend/src/main.jsx and App.jsx. Legacy src/pages, components, lib and context duplicate active modules and are not automatically evidence of current behavior.

No application code, database object, migration, account, email, payment or production record was changed during this audit. Earlier loading/auth changes were preserved. The permitted build regenerated ignored frontend/dist output. This report is the only added deliverable. Secret values were not inspected or printed.

**Source-confirmed** means code establishes behavior, not that deployment passed. **Test-verified** means a check actually ran. **Unverified** needs deployed configuration, live catalog or safe browser acceptance. **Missing** means no implementation found in reviewed repository contracts; an external service may exist elsewhere. **Decision** means business approval is unresolved.

| Executed check | Result | Limit |
|---|---|---|
| Frontend npm test | 82 passed, 0 failed | Helpers/unit tests, not browser acceptance |
| Backend npm test | 36 passed, 0 failed | Mocked controller/database/provider tests |
| Backend npm run check | Passed | Syntax checks server.js and src/app.js |
| Frontend npm run build | Passed; 2,155 modules | Main JS 613.47 kB, 162.53 kB gzip; warning above 500 kB |
| Isolated SQL suite 006 | Could not start | Missing @electric-sql/pglite; no assertions executed |
| Isolated SQL suite 007 | Could not start | Same missing dependency; no assertions executed |
| Authenticated browser, responsive/keyboard, native sharing | Not executed in this audit | Historical report results are not current verification |
| Live RLS/schema/storage/portal/email checks | Not executed | No production mutations or outbound communications |

No dependency advisory scan, penetration test, legal compliance certification or live integration certification was performed. Legal findings compare source claims with implementation; they do not advise on current law. All evidence codes resolve in the index at the end.

## A. Executive Summary

**Readiness: implemented recruitment MVP; not ready for unconditional production sign-off.** Authentication, company ownership, job publishing, public search, private resume registration, applications, recruiter status management, admin collections and shared portal mappings exist. Existing JavaScript tests and build pass.

Strong controls include server-side profile/role checks, SQL job ownership validation, service-only publication RPCs, private registered resumes, five-minute resume URLs, application uniqueness in migration 006, and admin edit/role revision guards in migration 007. Their deployment and baseline permissions remain unverified.

Major release gates:

1. The original schema, core RLS, profile privilege guards, notification producers and legacy triggers are not completely versioned here. The supplied SQL suites cannot start without an additional dependency (F01).
2. Recruiter jobs publish immediately, including unverified-company jobs. The supplied job RPC does not reserve reactivation of administrator-removed jobs to admins; its synthetic legacy fixture permits removed-to-active (F02). Immediate posting itself is a policy decision.
3. Recruiter jobs and candidates truncate at 100, making older records inaccessible and totals inconsistent (F04).
4. Seeker job-detail Save changes local state only (F05). Public View All is capped at 60 despite requesting 1,000; recentOnly is ignored (F06).
5. Shared row cards claim Verified unconditionally (F03). Legal copy makes specific UK/operator/storage/retention claims not established by implementation (F08).
6. Contact, Auth mail, production portal deployments, privacy operations and three-role acceptance require verification or completion.

**Commercial model:** no implemented plan catalog, prices, billing, premium candidate tier or commercial quota enforcement was found. API rate limits are abuse controls, not subscription allowances.

**Portals:** shared-database mapping is implemented in source. No external job-board connector/feed/webhook/retry worker or independent production portal connection was verified.

No Critical exploitable vulnerability was demonstrated against a running system. High source risks and assurance gaps must be investigated before release; conditional risks are not presented as observed exploitation.

## B. Existing Functionality Inventory

| Feature / route | Status | Evidence and limit |
|---|---|---|
| Home, categories, companies | Implemented; live unverified | Public dataset; 500-job/company cap affects derived counts |
| /all-jobs | Partial | Server filters/pagination; View All and salary/search contract gaps |
| /jobs recent | Broken contract | recentOnly supplied by App, ignored by JobsPage |
| Job/company detail | Implemented; visual QA unverified | Mapped active/nondeleted/unexpired jobs; shared cards |
| Signin/login | Implemented; live unverified | Backend password signin and active-profile check |
| Registration | Partial | Role/company bootstrap; failure recovery/config-dependent confirmation |
| Recovery/password change | Implemented; live unverified | Supabase recovery/update, isolated current-password verification |
| Candidate profile/completion | Implemented; helpers verified | Name, phone, location, skills, experience, education; 8 completion criteria |
| Resume upload/replacement | Partial | Private versioned PDF, 5 MB, byte check; lifecycle/default gaps |
| Saved jobs | Partial | Persistent APIs/store; seeker-detail Save is local-only |
| Applications/history | Implemented; live unverified | Registered owned resume, unique live applicant/job pair, account pagination |
| Withdrawal/reapply | Missing user workflow | withdrawn exists; no seeker withdrawal API/UI |
| Company profile | Partial | Website/registration/description PATCH; address/contact/logo upload workflow absent |
| Teams/multiple recruiters | Partial | Membership table; one owner company per user; no invitations/team API |
| Recruiter/company approval | Missing operational workflow | States/counts exist; no approve/reject/suspend/reinstate routes |
| Post job | Implemented | Atomic job/audience RPC, immediately active; no quota/draft/date input |
| Recruiter manage jobs | Partial | Status controls; field-edit API but no full editor/duplicate/delete UI; 100 limit |
| Recruiter candidates | Partial | Status/resume APIs; first 100 only; invalid transitions offered |
| Admin jobs/users/roles | Implemented; live unverified | Collections, edits, soft delete, transactional role guard |
| Admin companies/portals | Partial | Read/filter/reporting; verification/suspension/config mutation absent |
| Notifications | Partial | Owned inbox/read state/preferences; baseline producers unversioned; no email worker |
| Plans/payments/promotions/quotas | Missing | No catalog, entitlement, usage ledger, checkout or payment webhook |
| Shared portal publication | Implemented source; deployment unverified | One jobs row + category/audience/job_sites mappings |
| External job boards | No evidence found | No implemented connector/feed/export synchronization |
| Contact | Implemented; delivery unverified | Resend validation/honeypot/consent/rate limit |
| About/Terms/Privacy | Partial | Substantive routed pages; factual/legal approval unresolved |
| Privacy deletion/export/retention | Missing workflow | Contact links; no request queue/export/deletion worker |
| Loading/error/mobile/accessibility | Partial | Shell-preserving loading, eager auth, breakpoints/focus support; no current browser matrix |
| SEO | Partial | Client metadata/canonical, Organization JSON-LD; no JobPosting/dynamic job sitemap/SSR |
| Deployment/monitoring | Partial | Vercel/Nginx/systemd, health/readiness/logs; CI/restore evidence absent |

## C. Recruiter Workflow Audit

### Actual registration-to-posting path

1. /register?role=recruiter collects account name/email/password, then company name, website and registration number. Frontend and authSignUpSchema validate input.
2. POST /api/v1/auth/sign-up resolves an active site and checks company-name availability with ilike. Duplicate-name messaging suggests using an existing company, but no invitation/join workflow exists.
3. Supabase Auth creates/returns a user with recruiter or job_seeker metadata. Admin cannot be selected through this schema.
4. Backend looks up existing profile, owner membership and bound company; otherwise inserts company with server-derived created_by and owner membership.
5. Profile is inserted/updated to recruiter, active, signup site and recruiter_company_id. Migration 004 defaults newly added company status to active and verification to pending; existing defaults/triggers are a live dependency.
6. Returned session is installed; otherwise API returns confirmationRequired. Email confirmation enforcement depends on Supabase settings. Backend does not explicitly check email_confirmed_at. RegisterPage always says check email, even if a session was returned.
7. Active authenticated recruiter with membership in an active nondeleted company can post immediately. Migration 006 creates active jobs and promotes a legacy insert-derived pending job active in the same transaction. It does not require company verification or administrator approval.

Evidence: E01–E06. This is source-confirmed, not a completed production signup test.

### Permissions and gaps

- requireAuth rejects non-active profiles; role checks read the backend profile. No separate recruiter approval application/state/action workflow is supplied.
- Publishing requires active company membership. Company update/applicant helpers require membership without the same active-company check (F14).
- Foreign-company posting/editing is rejected in SQL; applicant list, resume and status handlers resolve membership. Two-recruiter negative tests remain required, including direct Supabase paths.
- Membership role does not distinguish owner/member powers in these helpers. Multiple recruiters can belong to one company in the model; invitations/team management are absent. New job owner is the bound company or a sole legacy membership.
- Company/PostJob UI displays first returned company rather than the bound company. Legacy multi-company accounts can see the wrong employer preview (F15).
- Company PATCH confirms supported saved fields before resetting baseline. Address, company phone/contact person and company-wide remote status are outside the contract. No functioning document/business-verification process was found.
- No draft, scheduled publish, configurable closing-date input, duplicate-job action or recruiter delete endpoint. Full field-edit API exists, but active My Jobs UI offers status management rather than a field editor.
- Application transitions: submitted→viewed/shortlisted/rejected; viewed→shortlisted/interviewing/rejected; shortlisted→interviewing/rejected; interviewing→offered/rejected; offered→hired/rejected. Hired/rejected/withdrawn are terminal in the server map. Resume viewing compare-and-sets submitted→viewed.
- Candidate API returns profile skills/education/experience, but table shows primarily name/headline/job/status/resume; no full candidate detail screen or profile contact projection.
- Activity logs are best-effort; no recruiter approval/rejection/suspension/reinstatement history workflow.

**Recommendation requiring a decision:** explicitly choose immediate posting, first-company approval or approval per recruiter, separately from job approval/reapproval. Do not add mandatory approval solely because pending fields exist.

## D. Job-Seeker Workflow Audit

| Stage | Actual trace | Gap / required verification |
|---|---|---|
| Signup/signin | Register→shared auth wrapper→backend→Supabase Auth + active profile; signin installs session | SMTP, confirmation settings, duplicate/unfinished signup and redirects unverified |
| Recovery | resetPasswordForEmail redirects to current origin/reset-password; reset updateUser | Expired/reused links, cross-portal origins and recovery session unverified; resend-confirmation UI absent |
| Profile | Seeker profile→PATCH /auth/profile→user-scoped req.db | Baseline RLS/protected columns absent; save/refresh/new-session test required |
| Resume | Unique user-prefixed PDF upload→register endpoint verifies actual size/%PDF-→document row→default path PATCH | Three steps not atomic; old active files retained; preview/default mismatch possible |
| Completion | Eight saved-profile criteria | Resume criterion checks a path, not existence/health of the object |
| Search | /public/jobs server pagination + location/type/workplace/category/date/salary | Employer-name and mixed salary unit/currency gaps; fixed sorting |
| Save | Shared bookmark APIs bind authenticated user and source site | Detail Save bypasses them (F05) |
| Apply | Visible active unexpired mapped job→owned active registered resume→submitted application | No screening questions; closure race and concurrent duplicate behavior need live DB test |
| Duplicate | Partial unique live job/applicant index, API returns 409 on 23505 | Withdrawn still reserves pair; installed index unverified |
| History | Account-scoped server pagination across portals | Closed job links fetch public current record, not historical snapshot |
| Applied indicator | Detail checks recent dashboard applications | Older application may be missed until server returns duplicate 409 |
| Withdrawal | Status exists | No candidate action/endpoint; reapply policy unresolved |
| Recruiter access | Company membership checked; 300-second signed URL | Direct storage/RLS and post-application file replacement/deletion unverified |
| Notifications | Owned inbox, read/unread and preference persistence | Event producers depend on missing baseline; no application/digest email pipeline found |
| Settings/privacy | Profile/password/marketing preference and contact links | No tracked deletion/export/request/retention workflow |

No candidate paid tier or commercial application quota was found. PDF size, pagination bounds and request limits are technical controls. Profile completion is informational; apply specifically requires a registered owned resume rather than every completion field. Evidence: E17/E18/E23/E29/E31/E32/E36/E37.

## E. Subscription and Monetization Audit

No evidenced plan names, prices, billing periods, commercial currency or numeric quotas can be reported. Registration and posting have no charge gate. There is no implemented plan catalog, subscription table in supplied migrations, entitlement/usage ledger, renewal/cancellation/expiry worker, trial/invoice/refund/failure flow, upgrade/downgrade, complimentary override, checkout or payment webhook. Terms mentioning Stripe is prose, not integration. Supabase Auth event subscriptions are unrelated to billing.

The job RPC row lock protects job updates; it does not reserve commercial posting allowance. There is no rule defining whether pending/rejected/closed/expired jobs count. No commercial candidate limit was found. Live database billing objects or out-of-repository services remain unverified.

### Options for approval — not existing requirements

| Option | Business implications | Implementation | Client decisions |
|---|---|---|---|
| A. Free limited active jobs | Simple onboarding; slots recycle; spam needs controls | Company entitlement, atomic slot reservation/release, usage UI/admin override | Count, company/recruiter scope, pending/removal/expiry/reopen rules |
| B. Free monthly posts | Controls volume; reset/carryover expectations matter | Period ledger, atomic usage reservation, idempotency, reset timezone/history | Calendar/rolling period, allowance, carryover, rejected/duplicate/resubmitted counting |
| C. Paid subscriptions/quotas | Recurring revenue and billing/support overhead | Approved catalog/provider, checkout, signed idempotent webhooks, entitlements, dunning/cancel/refund handling | Price/currency/taxes, billing period, trials, proration, failure/downgrade policy |
| D. Free basic + paid promotion | Protects supply; sells visibility; ranking must be transparent | Promotion purchases, verified payment state, dates, labels/placement/refund rules | Price/duration, portals/placement guarantees, eligibility/refunds |

If any allowance is selected, enforce it atomically per company/period with idempotency and test simultaneous submissions, payment retries and every countable status. Frontend-only counters/read-then-insert checks are insufficient. No option is approved here.

## F. Connected Portals Audit

Classes: 1 implemented/verified; 2 implemented/unverified; 3 partial; 4 planned/not implemented; 5 no evidence. Class 2 below refers to source capability, not a certified external connection. No approved production specialist domain was verified.

| Portal/site name | Purpose | URL/route | Configuration source | Categories | Data source | Publishing method | Sync behavior | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Jooblie | Aggregator | Approved origin unverified; /all-jobs, /jobs/:id | jooblie slug/sites registry | All active | Shared jobs/job_sites | One job + mapping | Transactional rebuild; public expiry/status filters | 2 | E05/E10/E11 |
| Office Jobline | Office/admin | Registry domain; VITE_OFFICE_JOBS_URL | office-jobs | Sector 1 | Same | Category mapping | Same record/resync | 2 | E10/E11 |
| IT Jobs Jobline | Technology | Registry; VITE_IT_JOBS_URL | it-jobs | Sector 2 | Same | Category mapping | Same | 2 | E10/E11 |
| ServiceCare Jobline | Hospitality/service | Registry; VITE_SERVICE_CARE_URL | service-care | hospitality-guest-services, food-beverage, housekeeping-facilities, recreation-wellness | Same | Category mapping | Same | 2 | E10/E11 |
| Health Care Jobline | Clinical/care | Registry; VITE_HEALTH_CARE_URL | health-care | healthcare-clinical, nursing, allied-health, caregiving-support | Same | Category mapping | Same | 2 | E10/E11 |
| FarmerFreight Jobline | Transport/farming | Registry; VITE_FARMERFREIGHT_URL | farmerfreight | Sector 4 | Same | Category mapping | Same | 2 | E10/E11 |
| Aboriginal Jobline | Audience | Registry; VITE_ABORIGINAL_URL | aboriginal | Explicit audience; origin retained | Same + job_audience_sites | Audience selection | Atomic add/remove; active site required | 2 | E05/E10 |
| Newcomer Jobline | Audience | Registry; VITE_NEWCOMERS_URL | newcomers | Explicit audience; origin retained | Same + audience mapping | Audience selection | Same | 2 | E05/E10 |
| Hospitality & Healthcare Jobline | Legacy sector | Domain unknown | hospitality-healthcare registry documented | Actual mappings/sector needed | Shared support | Generic mappings | Deployment/mappings unknown | 3 | E10/E11 |
| Transportation & Farming Jobline | Legacy sector | Domain unknown | transport-farming registry documented | Actual mappings needed | Shared support | Generic mappings | Same | 3 | E10/E11 |
| External boards | Independent distribution | None evidenced | None found | Unknown | Unknown | No connector/feed/webhook found | No worker/retries/remote receipts | 5 | E01/dependencies |

Public focus links use five VITE_PORTAL_*_URL variables; dashboard links use a different seven-variable VITE_*_URL family absent from the example environment file. Tiles do not represent every channel. Name configuration exists, but artwork, route metadata and many strings remain Jooblie-specific (F12).

### Propagation and permissions

- One jobs row, no per-portal job copies. origin_site_id is provenance; job_sites defines visibility.
- Migration 006 rebuilds active Jooblie/origin/category/audience destinations under a job lock; invalid targeting rolls back with the job write.
- Triggers cover category mapping insert/update/delete, audience insert/update/delete, relevant job updates, and site active/slug changes. Soft-deleted jobs lose mappings.
- Closed/pending/removed jobs retain mappings but public status/expiry filters hide them. Deadline filtering works even without a status-changing scheduler.
- Shared record edits propagate on reads; this is not external push publication.
- Clearing an audience does not remove origin-site visibility. No per-job opt-out/portal approval table beyond this model was found.
- No remote feed exporter, webhook delivery queue, external retry/reconciliation or sync log dashboard found. Internal transactions provide rollback, not durable external delivery.
- Admin portal list/detail report mapped jobs, signup-source users and activity; no portal/category configuration mutation API.
- X-Site-Slug/query selects a channel; it does not prove domain identity or a recruiter publishing entitlement. Any channel restriction needs approved policy/enforcement.

## G. Admin and Security Audit

### Existing controls

/admin endpoints require active backend admin profile. Admin collections support filtering/search/pagination; jobs can be edited/moderated/soft-deleted; roles can change. Migration 007 checks exact job revision under lock, serializes role changes and protects self/last-active-admin demotion. Moderation/delete use different paths. Company/user lists are not operational verification/suspension workflows.

Service-role clients stay on the backend, but bypass RLS for many public/recruiter queries; explicit API filters are essential. Profile and application-status updates use authenticated clients and depend on unsupplied core RLS. Supplied auxiliary-table/RPC grants are restrictive. Complete direct-table authorization remains unverified.

Zod contracts, server ownership, PDF registration checks, React text rendering, CORS/Helmet/body limits/request IDs and request limiters are present. No confirmed SQL injection or rendered-description XSS was established. No deployed header/CSP, dependency or privilege certification is implied.

### Major findings register

Every entry states actual/expected behavior, evidence, impact, recommendation, approval and acceptance. Source reproduction is distinguished from live exploitation.

#### F01 — High — Database security/release assurance

**Actual:** original schema, core grants/RLS, protected profile triggers, auth/notification producers and lifecycle triggers are not fully supplied. SQL suites cannot start. **Expected:** auditable installed baseline and effective permissions. **Evidence:** E07–E09, SQL test results. **Impact:** unknown direct-access escalation/privacy risk and drift; no exploit demonstrated. **Recommendation:** read-only catalog/grant/policy/function/trigger capture, ledger comparison, reproducible isolated SQL tests and two-session race checks. **Approval:** technical access/test evidence, no new business policy. **Acceptance:** anon/seeker/owner/foreign-owner/admin tests pass for every sensitive core table/storage/function; role/status/company binding cannot be self-edited; installed migrations and legacy triggers reviewed.

#### F02 — High — Publication authorization

**Actual:** recruiter RPC accepts active/closed without reserving removed/pending/expired reinstatement; activation clears removal reason. Fixture permits removed→active. New unverified-company posts are active. SECURITY.md still calls activation admin-only. **Expected:** approved create/edit/reopen/reinstate matrix, admin takedown protected. **Evidence:** E03/E05 lines 222,303–344; E09 transition fixture; E22. **Impact:** moderation can potentially be reversed by owner API/UI; deployed exploitation unverified. **Recommendation:** approve/enforce matrix in SQL/UI and update documentation. **Approval:** yes, publication/reapproval/reinstatement. **Acceptance:** foreign owner denied; recruiter cannot reverse admin removal under recommended default; all portals honor takedown; live legacy transitions verified.

#### F03 — High — Misleading verification

**Actual:** row JobCard unconditionally shows Verified/Direct verified opening; public detail conditionally checks company verification. **Expected:** badge matches authoritative approved state. **Evidence:** E13 JobCard:130, E14. **Impact:** unverified listings represented as verified. **Recommendation:** define employer vs job verification, condition every badge. **Approval:** verification meaning yes; correcting unconditional output no. **Acceptance:** pending/rejected/unverified never show Verified; all surfaces agree for verified records.

#### F04 — High — Recruiter completeness/metrics

**Actual:** newest 100 jobs power MyJobs and application/view aggregates while active count covers all jobs. Candidates always loads page 1/100, then paginates locally and ignores total. **Expected:** all owned jobs/applicants reachable, truthful totals. **Evidence:** E04 dashboard:254; E15/E16. **Impact:** older records disappear, hiring metrics disagree. **Recommendation:** true server collections/search and full-scope aggregates. **Approval:** no. **Acceptance:** >100 jobs/applicants, oldest reachable/searchable, counts reconcile, later pages query server.

#### F05 — Medium — Seeker-detail Save is not persistent

**Actual:** isSaved=false and setIsSaved local toggle, no saved-status lookup/write. **Expected:** DB-backed account state. **Evidence:** E17:40,738; E18. **Impact:** candidates lose apparently saved jobs. **Recommendation:** use existing bookmark store. **Approval:** no. **Acceptance:** save/unsave survives reload/navigation and agrees with saved history; failure/foreign-account isolation verified.

#### F06 — Medium — View All/recent contract

**Actual:** View All requests 1,000; server caps 60; View All hides pagination. recentOnly route prop is ignored. **Expected:** all results reachable, recent cutoff real. **Evidence:** E19:240,270,842; E01 App:94; E20 maxLimit. **Impact:** undiscoverable listings/misleading view. **Recommendation:** valid pagination or bounded multi-page fetch; defined recent cutoff. **Approval:** recent window yes, cap correction no. **Acceptance:** >60 matches reachable; /jobs applies approved age window; /all-jobs keeps older matches.

#### F07 — Medium — Search semantics

**Actual:** salary_min compared without period/currency/overlap semantics; company name not in search predicate; fixed sorting. **Expected:** filter/search promises match results. **Evidence:** E20:131/applyForeignJobFilters; E21 salary ranges; E23 company hint. **Impact:** hourly/annual/mixed-currency and employer queries mislead. **Recommendation:** approved units/currency/range semantics; company search/sort if advertised. **Approval:** yes for semantics/scope. **Acceptance:** tested period/currency/overlap fixtures, employer search, stable pages/sort.

#### F08 — High — Legal/privacy factual accuracy

**Actual:** Terms names England/Wales entity/address/UK rules; Privacy asserts UK/EEA storage, compliance and retention/deletion practices. Canada/CAD assumptions occur elsewhere. Claims unsubstantiated here. **Expected:** approved operator, jurisdiction, region/process statements. **Evidence:** E24/E25/E26. **Impact:** inaccurate service commitments. **Recommendation:** owner/appropriate reviewer validate practices before approved copy; no inferred compliance. **Approval:** yes. **Acceptance:** operator/contacts/market/provider regions/retention match deployment and executable privacy process; unsupported claims removed or evidenced.

#### F09 — High — Commercial scope missing

**Actual:** no plans/payment/quota/entitlement enforcement. **Expected:** approved unlimited/no-charge MVP or enforced offer. **Evidence:** E01/E03/E05/package dependencies, section E search. **Impact:** cannot collect/enforce intended commercial model. **Recommendation:** approve A/B/C/D or defer explicitly. **Approval:** yes. **Acceptance:** offer and enforcement agree; simultaneous posts cannot exceed approved allowance; paid event retries idempotent if applicable.

#### F10 — High — Operational approval/suspension absent

**Actual:** admin pending company/user lists lack verify/reject/approve/suspend/reinstate and complaint actions/history. **Expected:** operable approved safety policy. **Evidence:** E01/E27. **Impact:** direct DB intervention needed to operate controls. **Recommendation:** define actions/reasons/history/operators. **Approval:** yes for workflow. **Acceptance:** authorized operator can block/reinstate consistently with actor/reason/time; last admin protected and protected actions denied after suspension.

#### F11 — Medium — Delivery promises unverified/incomplete

**Actual:** contact Resend credentials required; tests stub delivery. Email preferences exist, no applicant/digest email pipeline found; notification producers not versioned. **Expected:** approved promised events delivered honestly. **Evidence:** E28/E29/settings labels/E07. **Impact:** support/hiring updates may not arrive. **Recommendation:** approved addresses, authorized inbox check, event map and monitored/idempotent worker if required. **Approval:** yes, inbox/events/marketing. **Acceptance:** one correct owned event/delivery per trigger, preferences honored, failures/retries monitored; actual inbox receipt verified.

#### F12 — Medium — Portal configuration/identity

**Actual:** inconsistent variable families, missing dashboard URL example variables, hardcoded Jooblie assets/metadata, unknown actual domains/legacy mappings. **Expected:** approved complete site matrix. **Evidence:** E10/E11/E30/DashboardLayout/.env.example. **Impact:** missing links/wrong brands/canonical/social identity. **Recommendation:** reconcile deployment matrix and portal smoke checks. **Approval:** yes domains/brands/scope. **Acceptance:** every enabled site correct slug/logo/links/canonical/apply and edit/close/remove propagation; disabled links intentional.

#### F13 — Medium — Resume default/integrity/lifecycle

**Actual:** replacements retain old active rows; own URL without id selects latest, not profile default. Profile PATCH does not verify default path registration; apply does. Owner storage policies permit update/delete after registration/application. No scan/retention pipeline. **Expected:** preview/default/apply agree, approved immutable-submission/retention policy. **Evidence:** E31/E32/E08/E02. **Impact:** wrong preview, changed/missing historical file, unused uploads. PDF prefix check is not malware scanning. **Recommendation:** validate default, consistent lookup, version/deletion/cleanup rules. **Approval:** retention/snapshot/scan yes; consistency fix no. **Acceptance:** failed profile save recoverable, preview equals default, invalid/foreign defaults rejected, applied-file replacement/deletion follows approved policy.

#### F14 — Medium — Company suspension consistency

**Actual:** posting checks active company; company/applicant/resume helpers only check membership. Public jobs/apply do not filter owning company's active/deleted status. **Expected:** explicit consistent suspension effects. **Evidence:** E05 company check; E04 helper; E20 public base; E31 assertVisibleActiveJob. **Impact:** status change may not hide openings or stop applicant access; legacy trigger effects unverified. **Recommendation:** approve read/write/public behavior, enforce all entry points. **Approval:** yes. **Acceptance:** safe suspended/deleted-company fixture yields approved public/private results across API and direct paths.

#### F15 — Medium — Company binding/bootstrap error integrity

**Actual:** UI first company differs from SQL bound company; unique owner-per-user can conflict with second-company API. Signup rollback deletes companyId even if reused from existing membership, and does not remove/recover created Auth user on bootstrap failure. **Expected:** accurate employer preview and safe idempotent recovery. **Evidence:** E02:182,258; E04 createCompany; E06 index; E15/E05. **Impact:** wrong preview/stranded signup; destructive error path possible, reachability unverified. **Recommendation:** created-this-attempt tracking, safe recovery and bound-company display. **Approval:** cardinality/team rule yes; safe cleanup no. **Acceptance:** inject failure at every step; no existing company/member deletion, retry recovers, displayed owner equals persisted owner.

#### F16 — Medium — Job lifecycle incomplete

**Actual:** active/pending_review/closed/expired/removed; no draft/schedule/date input or expires_at write contract. Reads filter expiry; no worker found. Fixture legacy insert derives 60 days only for verified case. **Expected:** approved lifetime/close/reopen/rejection and accurate metrics. **Evidence:** E03/E05/E09/E20/E15. **Impact:** null deadlines indefinite, time-expired records remain active in counts; rejection/resubmission incomplete. **Recommendation:** define lifetime and transitions; align state/reads/counts. **Approval:** yes. **Acceptance:** boundary/null-deadline fixtures match policy; closed/expired/removed cannot be applied to; reopens do not extend validity unexpectedly.

#### F17 — Medium — Status UI/backend/concurrency mismatch

**Actual:** MyJobs offers pending_review that RPC rejects; candidates offers all statuses despite transition map. Admin choices/delete can conflict with fixture transitions (active→pending, closed→removed). Moderation lacks edit endpoint's expected revision. **Expected:** valid current actions, safe stale decisions. **Evidence:** E15/E16/E03/E05/E09/E27/E33. **Impact:** predictable failed actions/stale moderation; live legacy failures unverified. **Recommendation:** one approved matrix, state-aware UI and revision checks. **Approval:** policy yes; alignment no. **Acceptance:** offered actions valid; invalid/stale actions conflict without overwriting decisions; delete follows approved audit/history policy.

#### F18 — Medium — Privacy operations absent

**Actual:** no deletion/export/request queue/retention worker; policies offer requests and claim scheduled deletion. **Expected:** executable approved process. **Evidence:** E01/E25/E08/E31/E22. **Impact:** requests/commitments may go unfulfilled. **Recommendation:** staffed manual MVP process or tracked workflow with identity/backups/deletion scope. **Approval:** yes. **Acceptance:** safe request verified, exported/deleted/anonymized per rule, tracked to completion including backup exceptions.

#### F19 — Medium — SEO/discovery partial

**Actual:** client metadata/Organization JSON-LD, no JobPosting/dynamic job sitemap/SSR. Static generator not in build; robots no Sitemap. Unavailable job returns EmptyState before RecordMetadata/noindex; SPA rewrite returns app. **Expected:** accurate current-job crawler metadata/unavailable handling. **Evidence:** E30/E34/public job detail/package scripts. **Impact:** expired indexing/generic social previews/incomplete coverage. **Recommendation:** approved origin, availability indexing, dynamic data and crawler strategy. **Approval:** origins/scope yes. **Acceptance:** current metadata accurate; closed jobs excluded/deindexed per policy; sitemap refresh/crawler/social checks pass.

#### F20 — Medium — Security/operations assurance

**Actual:** in-memory rate limits, proxy setting dependent; audit failure swallowed after warning; API CSP disabled, frontend headers unconfigured here; direct Supabase Auth/storage bypass Express limits. Logs include IP/user-agent/email metadata. **Expected:** approved abuse/audit/retention/restore controls. **Evidence:** E22/E35/E08/E36. **Impact:** multi-instance abuse, missing audit, PII over-retention; no secret exposure confirmed. **Recommendation:** proxy/Auth/headers validation, shared limiter if scaling, audit-failure monitoring/retention/restore drill. **Approval:** retention/owner yes. **Acceptance:** effective limits and Auth controls, failure alert, tested restore, no service key in browser artifacts.

#### F21 — Medium — Application history/withdrawal

**Actual:** withdrawn lacks seeker endpoint; recent dashboard drives applied indicator; history points to current public job instead of applied snapshot. **Expected:** accurate status/history and approved withdrawal/reapply rule. **Evidence:** E17/E31/E37/E01/E05 uniqueness. **Impact:** late duplicate errors/lost context/unmet withdrawal expectation. **Recommendation:** per-job status/history read model and approved withdrawal. **Approval:** withdrawal/retention/reapply yes. **Acceptance:** old application accurately recognized, closed-history understandable, approved withdrawal and duplicate behavior tested.

#### F22 — Low — Frontend/release quality coverage

**Actual:** public shell retained on lazy loading, auth eager/forms during session check; main bundle warning. Legacy copies/embedded styles persist. Public mobile menu lacks Escape/focus management that dashboard drawer implements. No lint/type/browser scripts or CI found. **Expected:** measured performance/keyboard/responsive/release behavior. **Evidence:** E01/E38/Header/DashboardLayout/package/current build. **Impact:** startup/regression/keyboard risk; signed-in visitor can briefly see guest form. **Recommendation:** throttled refresh/viewport/keyboard acceptance, measured optimization, separate authorized cleanup. **Approval:** QA no; redesign outside scope. **Acceptance:** 375/430/768/1024/1440/1920 px, 200% zoom and keyboard pass; auth refresh no skeleton, redirects correct, no overflow/focus traps; measured budget.

## H. Original Client Issues

No live authenticated issue was reproduced in this audit. Source-confirmed fixes are not a live-resolution claim.

| Issue / route | Current status and frontend/backend evidence | Root cause or existing fix | Remaining test |
|---|---|---|---|
| 1 Company persistence /my-company | Partial; E15 editor→E04 owned PATCH→returned DB row | Changed-field payload/confirmed baseline fix exists; name omitted on update. Address/contact/company-remote outside schema; baseline immutable-name trigger unsupplied | Save website/registration/description, clear description, no-op/failure, refresh/new session, foreign-company denial; approve extra fields |
| 2 Contact /contact | Functional source, delivery unverified; E28 Resend/consent/honeypot/rate limit | Not a placeholder anymore; actual +92 phone remains hardcoded, inbox configured externally | Approve phone/inbox/sender, authorized receipt/failure test; do not invent Canadian contact |
| 3 About/Terms/Privacy | Substantive active pages; factual approval unresolved | Legacy src/pages placeholders not routed; UK/operator/region/retention claims need evidence (F08) | Owner/reviewer approve operator/market/practices; verify contacts and privacy handling |
| 4 Network/View All→Overview | Existing route fix source-confirmed, original redirect unverified | Dashboard Link→/all-jobs; public route outside guest guard; no matching source Overview redirect found. Portal links require config | Guest/three roles, direct URL, refresh/back/forward and portal URLs; separately fix View All truncation |
| 5 +92 recruiter phone hint | Active /settings uses +1 (403) 555-0123 at SettingsPage:219 | Old +92 hint remains in unrouted legacy copy; Contact actual phone still +92 | +1 save/reload and validation; approve real contact. Hint is not Canadian-number enforcement |
| 6 Company Current Openings UI | Shared component/CSS present, visual status unverified; E12/E13 | Company API scoped; row cards on company, grid variant on browse; CSS supports both, verification bug remains | Long titles, logo failures, missing salary, zero jobs, mobile/desktop, save/share/detail, no CSS overflow |
| 7 Job sharing | Helper implementation/tests verified; native browser unverified | Native share→clipboard→selectable manual URL; encoded current public path, rejects inactive/expired; env public origin fallback | HTTPS device success/cancel/rejection/manual copy; guest opens link; correct per-portal origin, expired behavior |

Loading follow-up: prior public inner-Suspense and eager-auth changes are present and passed build; no new loading code changed here. Auth refresh/public throttled loading and signed-in redirect still require browser acceptance.

## I. Prioritized Remediation Backlog

Effort S/M/L is relative scope, not hours. Entries are future recommendations. Commercial/optional features are conditional.

| Priority | Work / findings | Effort | Dependencies | Acceptance |
|---|---|---|---|---|
| P0 conditional | F01 direct privilege/data exposure, if reproduced | L investigation | Live read-only catalog + isolated negative tests | No direct role escalation/foreign data/storage access; actual exploit regression |
| P0 conditional | F15 reused-company destructive rollback, if reachable | M | Safe fault fixture/Auth behavior | Failures cannot delete existing company/member data |
| P1 | F01 baseline/migrations/runnable SQL | L | Catalog/ledger/PGlite/staging | Core grants/policies reviewed; SQL + two-session races pass |
| P1 | F02 moderation/reinstatement | M–L | Client matrix/legacy triggers | Admin takedown cannot be reversed contrary to policy; portal tests |
| P1 | F03 honest verification | S | Authoritative definition | Every badge conditional/consistent |
| P1 | F04 jobs/candidate pagination/metrics | M | Server queries/aggregates | >100 oldest records accessible; full totals reconcile |
| P1 | F05 persistent detail Save | S | Existing bookmark service | Save/unsave/reload/account isolation |
| P1 | F08 accurate legal/operator copy | M | Owner/reviewer/provider facts | Approved text matches service/config/process |
| P1 | F10/F14 basic abuse/suspension | L | Approved policy/RLS | Operator can block/reinstate consistently with history |
| P1 | F11 contact/Auth email acceptance | S–M | Sender/inbox/SMTP/redirects | Authorized real receipt, honest errors |
| P1 | F13/F15 default/bootstrap correctness | M | Failure fixtures/binding | Preview/default agree; retry safe, pre-existing data preserved |
| P1 | F22 release/negative-role QA | M | Staging identities/config owner | Three roles, public/mobile/keyboard/refresh and restore checks |
| P1 if commercial launch, else P2 | F09 plans/allowance | M simple quota, L paid | Approved offer/provider | Atomic usage, status/period rules, idempotent billing |
| P2 | F06/F07 browsing/recent/search | M | Recent/salary semantics | >60 accessible; units/currency/employer queries accurate |
| P2 | F11 event/email pipeline | L | Event map/preferences/provider | Correct recipient once; retries/opt-outs monitored |
| P2 | F16/F17 lifecycle/status/revisions | M–L | Matrix/lifetime/legacy review | Offered actions valid; stale rejected; expiry/counts accurate |
| P2 | F18 privacy/resume retention | L | Retention/backups owner | Request lifecycle demonstrable and approved |
| P2 | F19 SEO | M–L | Origins/accurate job data | Crawler/unavailable/sitemap metadata verified |
| P2 | F12 portal matrix/branding | M | Domains/assets/mappings | Each intended portal passes feed/apply/propagation |
| P2 | F15/F21 team/history/withdrawal | M–L | Cardinality/reapply/retention | Scoped membership; historical status and approved withdrawal work |
| P3 | F22 measured performance/lint/CI/legacy cleanup | M | Baseline/separate authorization | Repeatable checks, measured improvement, no regression |
| P3 conditional | Draft/schedule/duplicate/promotion/external boards | L | Explicit provider/client scope | Agreed feature/operations acceptance before building |

No unconditional P0 exploit was demonstrated. Conditional P0 entries state escalation rules. Existing defects should precede optional product expansion.

## J. Client Approval Questionnaire

Only decisions appear here; technical evidence/configuration checks are in K. Recommendations are not existing requirements.

1. **Operator/market:** legal entity, address, provinces/countries and public contacts? Recommendation: one signed inventory before public/legal sign-off; do not assume UK copy is correct.
2. **Recruiter approval:** immediate access, first-company approval or every recruiter? Recommendation: choose a risk-based gate considering staffing/friction; current immediate posting is implementation, not an approved requirement.
3. **Company verification:** required evidence, reviewer, badge meaning, edit/reverification/appeal policy? Recommendation: distinguish employer verification from job approval.
4. **Job review:** immediate/all/risk-based, material edit reapproval, rejection/resubmission and reinstatement rights? Recommendation: admin-only reversal of takedowns and one written transition matrix.
5. **Suspension:** posting only, applicant/resume access too, existing public listings too? Recommendation: explicitly define all effects and necessary operator history access.
6. **Free limits/model:** A/B/C/D or unlimited/no-charge MVP? If limited, per company/recruiter, quota, period/timezone/carryover, status/reopen/override counting? No numeric default inferred.
7. **Paid offer:** names/prices/currency/taxes/period/trial/proration/cancellation/refund/grace/failure/downgrade/provider/support ownership? No price/provider assumed.
8. **Candidates:** free access, limits or premium value? Recommendation: keep MVP free unless a defined premium offer is approved; not an existing contractual commitment.
9. **Teams:** one/multiple companies, recruiters/company, invitation/owner/member permissions? Recommendation: verified invitations, not joining merely by company-name match.
10. **Company fields:** address/contact/industry/logo/verification documents and public/private/immutable rules? Recommendation: only operationally necessary fields with explicit visibility.
11. **Job inputs/lifetime:** location, salary period/currency/range matching, deadline/default lifetime, drafts/schedule/duplicates/reopens, Recent window? Recommendation: explicit units/currency before comparisons.
12. **Applications:** resume required, screening questions, contact/full profile access, withdrawal/reapply, original job/resume snapshot? Recommendation: preserve application context with approved immutable submission version if required.
13. **Notifications:** events/channel/timing/digest/preference defaults/marketing consent owner? Recommendation: promise only verified delivered events.
14. **Portals:** exact launched channels/domains/brands/categories, mandatory vs optional visibility, audience rules/recruiter channel rights? Recommendation: distinguish shared DB distribution from external integrations.
15. **External sync:** providers/schemas/credentials/update-removal service expectations/retries/reconciliation/owner? Recommendation: defer unnamed integrations rather than advertise connectivity.
16. **Privacy:** retention for profiles/applications/resumes/logs, export/delete identity checks, backup exceptions, hosting regions/request owner? Recommendation: approve practices first, publish matching policy; no legal deadlines/regions assumed.
17. **Launch scope:** blockers/deferred features, moderation/support owner, role/portal/mobile/accessibility/email/recovery acceptance and signatories? Recommendation: written MVP scope and named sign-off; build success alone is not launch approval.

## K. Final Release Checklist

### Code fixes — subsequent work only

- [ ] Protect approved reinstatement/moderation transitions; align UI/revisions (F02/F17).
- [ ] Conditional truthful verification badges (F03).
- [ ] Full recruiter collections/metrics (F04).
- [ ] Persistent detail Save (F05), View All/recent/search contract (F06/F07).
- [ ] Safe bootstrap cleanup/retry and bound company display (F15).
- [ ] Consistent resume default/preview/validation and approved lifecycle (F13).
- [ ] Approved verification/suspension operations (F10/F14).
- [ ] Complete approved privacy/events/SEO/lifecycle gaps or defer with truthful UI.
- [ ] Commercial implementation only after approved offer; no invented quota.

### QA verification

- [x] Frontend 82 tests, backend 36 tests, backend syntax check and production build executed successfully.
- [ ] SQL test dependency installed reproducibly; 006/007 and true two-session races pass in isolation.
- [ ] Installed schema/RLS/grants/privilege triggers checked with anon/seeker/owner/foreign-owner/admin.
- [ ] Safe signup success/failure/retry/duplicate company/confirmation tests.
- [ ] Company/profile save/refresh/new-session/no-op/failure/ownership tests.
- [ ] Valid/invalid/oversize/mislabelled PDF; default/preview/applied version; signed expiry/foreign access.
- [ ] Duplicate/concurrent/cross-portal apply and close/remove/expire race checks.
- [ ] Every job/application transition, concurrent admin edit/role change, last-admin protection.
- [ ] >100 owned jobs/applicants, >60 public results, >500 dataset coverage/counts.
- [ ] Seven client issues verified on current role routes.
- [ ] Throttled refresh/chunk failures/auth expiry; 375/430/768/1024/1440/1920 px, zoom/keyboard/focus/error/empty/retry.
- [ ] HTTPS native share/clipboard/manual fallback/device cancellation.
- [ ] Crawler/OG/canonical/sitemap/unavailable job/per-portal identity checks.
- [ ] Authorized real inbox receipt for contact/confirmation/recovery and approved notification events.

### Client approvals

- [ ] J1–J17 answered or explicitly deferred in launch scope.
- [ ] Operator/market/contact/legal facts signed off.
- [ ] Publication/reapproval/reinstatement/suspension matrix approved.
- [ ] Free/paid/candidate offer approved; prices/limits not assumed.
- [ ] Portal/domain/brand/external integration scope approved.
- [ ] Resume/application/privacy/retention/notification operations approved.
- [ ] Named QA/business release signatories and exclusions.

### Credentials/configuration — names only

- [ ] Backend SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY; NODE_ENV/PORT; CORS_ORIGINS, exact TRUST_PROXY, DEFAULT_SITE_SLUG, LOG_LEVEL, REQUEST_BODY_LIMIT; RATE_LIMIT_*, AUTH_RATE_LIMIT_*, WRITE_RATE_LIMIT_*.
- [ ] INITIAL_ADMIN_EMAIL and secure admin provision procedure; never frontend signup metadata.
- [ ] RESEND_API_KEY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, verified sender/approved recipient; Supabase SMTP and confirmation/recovery redirect allowlists separately.
- [ ] VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL, VITE_SITE_SLUG, VITE_SITE_NAME, VITE_PUBLIC_SITE_URL, optional VITE_SUPPORT_EMAIL.
- [ ] Public VITE_PORTAL_IT_SOFTWARE_URL, VITE_PORTAL_OFFICE_ADMIN_URL, VITE_PORTAL_RESTAURANT_URL, VITE_PORTAL_AGRICULTURE_URL, VITE_PORTAL_TRUCKING_URL.
- [ ] Dashboard VITE_OFFICE_JOBS_URL, VITE_IT_JOBS_URL, VITE_SERVICE_CARE_URL, VITE_HEALTH_CARE_URL, VITE_FARMERFREIGHT_URL, VITE_ABORIGINAL_URL, VITE_NEWCOMERS_URL; reconcile URL families.
- [ ] Actual sites/category mappings/storage privacy/file limits/Auth settings/database regions/auxiliary tables and RPCs verified.

### Deployment/operations

- [ ] Read-only catalog/preflight reviewed; backups and rollback plan before any future migration, no blind replay of historical alignment.
- [ ] Installed 001–007 dependencies and legacy triggers verified against staging baseline.
- [ ] HTTPS/origins/proxy/hosted frontend headers/CSP/shared-limit needs checked.
- [ ] No service-role key in frontend assets/source control/public variables/logs; rotation ownership.
- [ ] Readiness and health, audit/security write failure, delivery/auth/business-event monitoring.
- [ ] Backup/PITR restore drill; retention/privacy request/support/moderation owner.
- [ ] Correct per-site origins/rewrites; sitemap job and live visibility smoke checks.
- [ ] Versioned release/configuration matrix, acceptance evidence and sign-off retained.

## Evidence Index

Repository-relative paths; anchors/functions were inspected. They establish source behavior, not deployed test success.

- **E01:** [frontend/src/main.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/main.jsx>); [frontend/src/App.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/App.jsx>); [backend/src/routes.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/routes.js>); [frontend/src/shared/components/DashboardLayout.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/components/DashboardLayout.jsx>).
- **E02:** [backend/src/controllers/auth.controller.js:91](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/controllers/auth.controller.js:91>) signup, :182 existing company, :228 active profile, :258 rollback, :316 profile update; [frontend/src/shared/lib/data.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/lib/data.js>); public/pages/RegisterPage.jsx.
- **E03:** [backend/src/schemas.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/schemas.js>); middleware/validate.js.
- **E04:** [backend/src/controllers/recruiter.controller.js:20](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/controllers/recruiter.controller.js:20>) membership, :127 create company, :220 dashboard, :254 job cap, :368 create job, :390 update, :409 transitions, :457 candidates, :476 resume, :523 application update.
- **E05:** [database/migrations/006_portal_workflow_integrity.sql:10](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/database/migrations/006_portal_workflow_integrity.sql:10>) mappings, :162 job RPC, :222 active default, :303 recruiter states, :344 pending promotion, :379 uniqueness, :413 preferences.
- **E06:** [database/migrations/003_recruiter_company_binding.sql](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/database/migrations/003_recruiter_company_binding.sql>); 004_recruiter_company_schema_compat.sql; 005_recruiter_company_created_by.sql.
- **E07:** [database/README.md](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/database/README.md>); migrations 001–007; [database/tests/006_portal_workflow_preflight.sql](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/database/tests/006_portal_workflow_preflight.sql>) (live preflight not run).
- **E08:** [database/migrations/002_production_profile_resume_workflow.sql](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/database/migrations/002_production_profile_resume_workflow.sql>) private resumes, grants and owner insert/select/update/delete policies.
- **E09:** [database/tests/006_portal_workflow_integrity.test.mjs:76](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/database/tests/006_portal_workflow_integrity.test.mjs:76>) legacy fixtures, :98 transitions; 007_admin_concurrency.test.mjs. Neither suite started.
- **E10:** PORTALS.md; [frontend/src/shared/config/portalConfig.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/config/portalConfig.js>) and site.js; [backend/src/middleware/siteContext.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/middleware/siteContext.js>).
- **E11:** [database/migrations/001_align_existing_jooblie.sql](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/database/migrations/001_align_existing_jooblie.sql>) category mappings; migration 006; [backend/src/utils/portalJobs.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/utils/portalJobs.js>).
- **E12:** [frontend/src/public/pages/CompanyDetailPage.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/public/pages/CompanyDetailPage.jsx>); shared/styles/visualExperience.css.
- **E13:** [frontend/src/shared/components/JobCard.jsx:130](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/components/JobCard.jsx:130>) unconditional verification.
- **E14:** [frontend/src/public/pages/JobDetailPage.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/public/pages/JobDetailPage.jsx>) verification/apply/unavailable handling.
- **E15:** [frontend/src/recruiter/pages/CompanyProfilePage.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/recruiter/pages/CompanyProfilePage.jsx>), PostJobPage.jsx, MyJobsPage.jsx.
- **E16:** [frontend/src/recruiter/pages/CandidatesPage.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/recruiter/pages/CandidatesPage.jsx>); SettingsPage.jsx:219 Canadian hint and email labels.
- **E17:** [frontend/src/seeker/pages/JobSeekerJobDetailPage.jsx:40](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/seeker/pages/JobSeekerJobDetailPage.jsx:40>) saved state, :738 local toggle; dashboard applied lookup.
- **E18:** [frontend/src/shared/lib/bookmarkStore.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/lib/bookmarkStore.js>); shared/hooks/useJobBookmark.js; [backend/src/utils/seekerHistory.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/utils/seekerHistory.js>).
- **E19:** [frontend/src/public/pages/JobsPage.jsx:240](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/public/pages/JobsPage.jsx:240>) function, :270 viewAll limit, :842 toggle; App.jsx:94 recentOnly.
- **E20:** [backend/src/controllers/public.controller.js:131](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/controllers/public.controller.js:131>) salary, :146 public base, :156 dataset, :184 list max 60, :226 job, :274 company.
- **E21:** [frontend/src/shared/components/SearchPanel.jsx:130](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/components/SearchPanel.jsx:130>) salary/date filter contract.
- **E22:** SECURITY.md; deploy/nginx.conf.example; deploy/jooblie-api.service.example; [backend/server.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/server.js>).
- **E23:** [frontend/src/seeker/pages/JobSeekerJobsPage.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/seeker/pages/JobSeekerJobsPage.jsx>); shared/lib/dashboardPresentation.js profileProgress.
- **E24:** [frontend/src/public/pages/TermsPage.jsx:191](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/public/pages/TermsPage.jsx:191>) operator, :384 UK work, :398 VAT/insurance, :422 payment prose, :530 law.
- **E25:** [frontend/src/public/pages/PrivacyPage.jsx:149](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/public/pages/PrivacyPage.jsx:149>) compliance badge, :241 governance, :366 address protection, :424 regions, :454 deletion claim.
- **E26:** [frontend/src/shared/lib/normalizers.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/lib/normalizers.js>) country/verification/status/salary/experience.
- **E27:** [backend/src/controllers/admin.controller.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/controllers/admin.controller.js>); frontend/src/admin/pages and components/AdminCollection.jsx, AdminJobCreate.jsx.
- **E28:** [frontend/src/public/pages/ContactPage.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/public/pages/ContactPage.jsx>); [backend/src/utils/contact.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/utils/contact.js>); routes.js; [backend/test/contact.test.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/test/contact.test.js>).
- **E29:** [backend/src/controllers/notifications.controller.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/controllers/notifications.controller.js>); utils/notificationPreferences.js; [frontend/src/shared/components/WorkspaceAccountTools.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/components/WorkspaceAccountTools.jsx>); lib/notificationPresentation.js.
- **E30:** [frontend/src/shared/components/RouteMetadata.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/components/RouteMetadata.jsx>); [frontend/vite.config.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/vite.config.js>) portal metadata injection.
- **E31:** [backend/src/controllers/jobSeeker.controller.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/controllers/jobSeeker.controller.js>) visibility/dashboard/resume/apply/save/unsave; utils/seekerHistory.js.
- **E32:** [frontend/src/seeker/pages/JobSeekerProfilePage.jsx:97](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/seeker/pages/JobSeekerProfilePage.jsx:97>) preview; upload/register/profile sequence; shared/lib/editableProfile.js.
- **E33:** [database/migrations/007_admin_concurrency.sql](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/database/migrations/007_admin_concurrency.sql>); [backend/src/utils/adminMutations.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/utils/adminMutations.js>); test/admin-mutations.test.js.
- **E34:** [frontend/src/shared/components/RecordMetadata.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/components/RecordMetadata.jsx>); [frontend/scripts/generate-sitemap.mjs](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/scripts/generate-sitemap.mjs>); public/robots.txt; vercel.json; package scripts.
- **E35:** [backend/src/middleware/auth.js](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/backend/src/middleware/auth.js>), security.js, requestContext.js, errors.js; config/env.js, logger.js, supabase.js; utils/audit.js; app.js.
- **E36:** [frontend/src/shared/context/AuthContext.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/context/AuthContext.jsx>); shared/lib/supabase.js, password.js, api.js, request.js; public recovery/reset pages; backend auth signin.
- **E37:** [frontend/src/seeker/pages/JobSeekerApplicationsPage.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/seeker/pages/JobSeekerApplicationsPage.jsx>); shared/hooks/useAccountHistory.js; shared/components/HistoryPagination.jsx.
- **E38:** [frontend/src/shared/components/SiteLayout.jsx](<C:/Users/Kashif Nazim/Desktop/jooblie/jooblie_updated/frontend/src/shared/components/SiteLayout.jsx>), PageLoading.jsx, GuestOnlyRoute.jsx, ProtectedRoute.jsx, RouteErrorBoundary.jsx, Header.jsx; styles/skeleton.css; App.jsx eager auth imports.

Audit deliverables complete. Recommendations are for subsequent authorized work; none were implemented in this audit.
