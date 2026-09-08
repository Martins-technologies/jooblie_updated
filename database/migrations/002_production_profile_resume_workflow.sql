-- Production profile, resume, and recruiter workflow additions.
begin;

alter table public.profiles
  add column if not exists experience jsonb not null default '[]'::jsonb,
  add column if not exists education jsonb not null default '[]'::jsonb;

alter table public.profiles enable row level security;

create table if not exists public.resume_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  content_type text not null check (content_type = 'application/pdf'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);
create index if not exists resume_documents_user_created_idx on public.resume_documents(user_id, created_at desc);
alter table public.resume_documents enable row level security;
revoke all on public.resume_documents from public, anon, authenticated;
grant all on public.resume_documents to service_role;

-- Private resume bucket. Objects are only readable by the owning authenticated user.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf'];

drop policy if exists resumes_insert_own on storage.objects;
create policy resumes_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) = 'pdf'
);

drop policy if exists resumes_select_own on storage.objects;
create policy resumes_select_own on storage.objects
for select to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists resumes_update_own on storage.objects;
create policy resumes_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) = 'pdf'
);

drop policy if exists resumes_delete_own on storage.objects;
create policy resumes_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
