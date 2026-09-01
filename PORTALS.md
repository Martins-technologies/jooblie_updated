# Jooblie portal/channel matrix

All sites share one backend and one Supabase database. Each frontend sends its canonical database slug through `X-Site-Slug` (configured by `VITE_SITE_SLUG`).

| Site | Slug | Publishing role |
|---|---|---|
| Jooblie | `jooblie` | Main aggregator; receives every job |
| Office Jobline | `office-jobs` | Office/Admin category portal |
| IT Jobs Jobline | `it-jobs` | Information Technology category portal |
| ServiceCare Jobline | `service-care` | Hospitality/service categories 305–308 |
| Health Care Jobline | `health-care` | Clinical/care categories 301–304 |
| FarmerFreight Jobline | `farmerfreight` | Transportation/Farming sector categories |
| Aboriginal Jobline | `aboriginal` | Audience portal via `job_audience_sites` |
| Newcomer Jobline | `newcomers` | Audience portal via `job_audience_sites` |
| Hospitality & Healthcare Jobline | `hospitality-healthcare` | Existing legacy/sector registry row |
| Transportation & Farming Jobline | `transport-farming` | Existing legacy/sector registry row |

## Visibility

A frontend never copies a job into another site. The database keeps one `jobs` row and maintains `job_sites` mappings.

`Jooblie -> Software Development` and `IT Jobs -> Software Development` both result in the job being visible on `jooblie` and `it-jobs`; only `origin_site_id` differs.

Aboriginal/Newcomers are intentionally separate from category mappings. Selecting those audiences creates `job_audience_sites` entries and their triggers add/remove the matching `job_sites` visibility safely.
