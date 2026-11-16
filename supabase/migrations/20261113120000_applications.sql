-- Infinity Careers: job applications and expressions of interest.
--
-- Written by the website's server only (app/api/applications/route.ts), with
-- the service-role key, which bypasses row level security. Nobody else can
-- write, and only HR staff can read:
--
--   * anonymous visitors (the anon key): no access to anything here;
--   * signed-in users: access only if listed in public.hr_staff;
--   * candidates never sign in, and have no access to any application.
--
-- CVs live in the private "cvs" bucket: no public URLs. HR downloads them
-- through the Supabase dashboard, or with short-lived signed URLs created by
-- an HR user (see docs/hr-applications.md).

-- ------------------------------------------------------------------ status

create type public.application_status as enum ('new', 'in_review', 'shortlisted', 'interview', 'rejected', 'hired');

-- ------------------------------------------------------------- HR access

-- The people allowed to read applications: Supabase Auth users added by an admin.
create table public.hr_staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.hr_staff enable row level security;

create function public.is_hr()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.hr_staff where user_id = (select auth.uid()));
$$;

revoke all on function public.is_hr() from public;
grant execute on function public.is_hr() to authenticated;

-- An HR user can see that they are HR; nobody can change the list through the API.
create policy "hr can read the hr list" on public.hr_staff
  for select to authenticated using ((select public.is_hr()));

-- ------------------------------------------------------------ applications

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- What was applied for, as the website listed it at the time.
  application_type text not null check (application_type in ('vacancy', 'interest')),
  vacancy_id text check (char_length(vacancy_id) <= 200),
  position_id text not null check (char_length(position_id) <= 200),
  position_title text not null check (char_length(position_title) <= 200),
  property_id text check (char_length(property_id) <= 100),
  location text check (char_length(location) <= 100),
  department_id text not null check (char_length(department_id) <= 100),
  career_group text not null check (career_group in ('casino', 'restaurant', 'hotel', 'administration')),
  constraint vacancy_has_listing check ((application_type = 'vacancy') = (vacancy_id is not null)),

  -- The applicant.
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null check (char_length(phone) between 7 and 24),
  city text not null check (char_length(city) between 1 and 80),
  linkedin_url text check (char_length(linkedin_url) <= 300),
  portfolio_url text check (char_length(portfolio_url) <= 300),

  -- Professional background.
  experience_years text not null check (char_length(experience_years) <= 60),
  qualification text check (char_length(qualification) <= 150),
  employment_status text check (char_length(employment_status) <= 60),
  available_from date,
  preferred_employment_type text check (char_length(preferred_employment_type) <= 60),
  motivation text not null check (char_length(motivation) between 1 and 1500),
  -- The role's own questions: { question id: answer }.
  professional_answers jsonb not null default '{}'::jsonb check (jsonb_typeof(professional_answers) = 'object'),

  -- The CV: a path in the private bucket, never a URL.
  cv_storage_path text not null unique check (cv_storage_path ~ '^[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}\.(pdf|doc|docx)$'),
  cv_original_name text not null check (char_length(cv_original_name) <= 120),
  cv_mime_type text not null check (cv_mime_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  cv_size_bytes integer not null check (cv_size_bytes between 1 and 5242880),

  privacy_acknowledged_at timestamptz not null,

  -- HR's side.
  status public.application_status not null default 'new',
  hr_notes text
);

create index applications_created_at_idx on public.applications (created_at desc);
create index applications_status_idx on public.applications (status);
create index applications_position_idx on public.applications (position_id);
-- The website's duplicate check: the same email for the same position.
create index applications_repeat_idx on public.applications (email, position_id, created_at desc);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();

alter table public.applications enable row level security;

-- No policy for anon: anonymous visitors can neither read nor write.
-- No insert policy at all: only the server (service role) adds applications.
create policy "hr can read applications" on public.applications
  for select to authenticated using ((select public.is_hr()));

create policy "hr can update applications" on public.applications
  for update to authenticated using ((select public.is_hr())) with check ((select public.is_hr()));

-- HR may move an application along and keep notes; the applicant's own data stays as submitted.
revoke update on public.applications from authenticated;
grant update (status, hr_notes) on public.applications to authenticated;
revoke all on public.applications from anon;

-- --------------------------------------------------------------- CV bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs',
  'cvs',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
);

-- HR can read CVs (and so create short-lived signed URLs for them); nobody else
-- can list, read, upload, replace or delete. The server's service role bypasses
-- these policies to store each CV.
create policy "hr can read cvs" on storage.objects
  for select to authenticated using (bucket_id = 'cvs' and (select public.is_hr()));

-- ------------------------------------------------------------- retention

-- How long applications are kept is HR's and the legal team's decision: no
-- period is assumed. Until one is set, nothing is due for deletion.
create table public.recruitment_settings (
  id boolean primary key default true check (id),
  retention_days integer check (retention_days > 0)
);

insert into public.recruitment_settings (id, retention_days) values (true, null);

alter table public.recruitment_settings enable row level security;

create policy "hr can read recruitment settings" on public.recruitment_settings
  for select to authenticated using ((select public.is_hr()));

-- Applications past the retention period, with their CV paths, for HR to delete
-- (the row in Table Editor, the file in Storage), or for a scheduled job.
create view public.applications_due_for_deletion
with (security_invoker = true)
as
select a.id, a.created_at, a.first_name, a.last_name, a.position_title, a.status, a.cv_storage_path
from public.applications a
cross join public.recruitment_settings s
where s.retention_days is not null
  and a.created_at < now() - make_interval(days => s.retention_days);

-- ------------------------------------------------------------- HR overview

-- What HR reads first: one line per application, newest first.
create view public.applications_overview
with (security_invoker = true)
as
select
  id,
  created_at as applied_at,
  first_name || ' ' || last_name as applicant,
  position_title as position,
  property_id as property,
  department_id as department,
  location,
  application_type,
  status,
  email,
  phone,
  cv_original_name as cv,
  cv_storage_path
from public.applications
order by created_at desc;

revoke all on public.applications_overview from anon;
revoke all on public.applications_due_for_deletion from anon;
