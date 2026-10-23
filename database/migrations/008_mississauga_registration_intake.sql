-- Private, durable intake queue for the Mississauga landing-page campaign.
-- The public endpoint writes with service_role; only admins can read/update it.
begin;

create table if not exists public.mississauga_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  email text not null check (email = lower(btrim(email)) and char_length(email) <= 254),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  current_city text not null check (char_length(btrim(current_city)) between 1 and 80),
  employment_goal text not null check (employment_goal in (
    'Find a job',
    'Explore employers who may support a work permit',
    'Explore employment related to potential PR pathways',
    'All of the above',
    'Not sure yet'
  )),
  preferred_industry text,
  privacy_acknowledged boolean not null default false check (privacy_acknowledged),
  privacy_acknowledged_at timestamptz not null default now(),
  employer_sharing_consent boolean not null default false,
  employer_sharing_consent_at timestamptz,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  consent_version text not null default 'mississauga-registration-v1',
  source_context jsonb not null default '{}'::jsonb check (jsonb_typeof(source_context) = 'object'),
  status text not null default 'new' check (status in ('new', 'contacted', 'reviewing', 'closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mississauga_consent_timestamps_valid check (
    (employer_sharing_consent and employer_sharing_consent_at is not null)
    or (not employer_sharing_consent and employer_sharing_consent_at is null)
  ),
  constraint mississauga_marketing_timestamps_valid check (
    (marketing_consent and marketing_consent_at is not null)
    or (not marketing_consent and marketing_consent_at is null)
  )
);

create index if not exists mississauga_registrations_created_idx
  on public.mississauga_registrations (created_at desc);
create index if not exists mississauga_registrations_status_created_idx
  on public.mississauga_registrations (status, created_at desc);
create index if not exists mississauga_registrations_email_phone_idx
  on public.mississauga_registrations (email, phone_e164);

alter table public.mississauga_registrations enable row level security;
revoke all on public.mississauga_registrations from public, anon, authenticated;
grant all on public.mississauga_registrations to service_role;

commit;
