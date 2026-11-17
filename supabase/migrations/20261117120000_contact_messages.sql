-- Infinity Careers: messages from the contact page (/contact).
--
-- Runs after 20261113120000_applications.sql (it uses public.is_hr() and
-- public.touch_updated_at()). Written by the website's server only
-- (app/api/contact/route.ts), with the service-role key; read and handled only
-- by HR staff (public.hr_staff). Anonymous visitors can neither read nor write.
-- Nothing is emailed.

create type public.contact_message_status as enum ('new', 'read', 'answered', 'closed');

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (char_length(phone) between 7 and 24),
  subject text not null check (subject in ('General Inquiry', 'Careers & Recruitment', 'Business Inquiry', 'Other')),
  message text not null check (char_length(message) between 10 and 2000),
  privacy_acknowledged_at timestamptz not null,

  -- HR's side.
  status public.contact_message_status not null default 'new',
  hr_notes text
);

create index contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index contact_messages_status_idx on public.contact_messages (status);
-- The website's double-submission check: the same email moments apart.
create index contact_messages_repeat_idx on public.contact_messages (email, created_at desc);

create trigger contact_messages_touch before update on public.contact_messages
  for each row execute function public.touch_updated_at();

alter table public.contact_messages enable row level security;

-- No insert policy: only the server (service role) adds messages.
create policy "hr can read contact messages" on public.contact_messages
  for select to authenticated using ((select public.is_hr()));

create policy "hr can update contact messages" on public.contact_messages
  for update to authenticated using ((select public.is_hr())) with check ((select public.is_hr()));

-- HR may move a message along and keep notes; the sender's own words stay as sent.
revoke update on public.contact_messages from authenticated;
grant update (status, hr_notes) on public.contact_messages to authenticated;
revoke all on public.contact_messages from anon;
