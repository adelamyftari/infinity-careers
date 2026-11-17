-- Infinity Careers: the simpler two-step application.
--
-- Runs after 20261113130000_application_preferences.sql. Additive and safe:
-- no table, row, column or CV is removed, and earlier applications keep every
-- value they were submitted with (their position level, contract choice and
-- experience as they answered it).
--
--   * Email is optional: a candidate may leave it out (the phone stays required).
--   * The CV is optional: an application without one has no CV columns at all,
--     never a placeholder file or path.
--   * Experience is one answer: No Experience, 0–1 Year, 1–2 Years, 3–5 Years or
--     More than 5 Years, stored in experience_years, and classified by the
--     website as no_experience / with_experience in experience_status.
--   * The employment type is the candidate's preference (preferred_employment_type):
--     Full-time, Part-time, Internship or Seasonal. It is not a confirmed contract.
--   * No position level is asked any more: selected_job_level stays empty on new
--     applications and keeps its value on earlier ones.
--   * applications_overview: the HR table, with "No CV uploaded" where there is none.

-- ------------------------------------------------------------------ email

alter table public.applications alter column email drop not null;

-- ---------------------------------------------------------------------- CV

alter table public.applications
  alter column cv_storage_path drop not null,
  alter column cv_original_name drop not null,
  alter column cv_mime_type drop not null,
  alter column cv_size_bytes drop not null;

-- A CV is all four columns or none: never a path without its file's details.
alter table public.applications
  add constraint cv_complete
    check (
      (cv_storage_path is null and cv_original_name is null and cv_mime_type is null and cv_size_bytes is null)
      or (cv_storage_path is not null and cv_original_name is not null and cv_mime_type is not null and cv_size_bytes is not null)
    );

-- -------------------------------------------------------------- experience

-- The new answers, beside those earlier applications were submitted with.
alter table public.applications drop constraint experience_years_known;
alter table public.applications
  add constraint experience_years_known
    check (experience_years in (
      'No Experience', '0–1 Year', '1–2 Years', '3–5 Years', 'More than 5 Years',
      'Less than 1 year', '1–2 years', '3–5 years', 'More than 5 years', 'No Previous Experience'
    ));

-- No experience: the answer is No Experience (or, on earlier applications, none
-- or 'No Previous Experience'), with no previous position. With experience: a
-- range is required, and it is not a "no experience" answer.
alter table public.applications drop constraint experience_consistent;
alter table public.applications
  add constraint experience_consistent
    check (
      experience_status is null
      or (experience_status = 'no_experience'
          and (experience_years is null or experience_years in ('No Experience', 'No Previous Experience'))
          and previous_position is null)
      or (experience_status = 'with_experience'
          and experience_years is not null
          and experience_years not in ('No Experience', 'No Previous Experience'))
    );

-- ------------------------------------------------------- HR's filtering

create index applications_preferred_type_idx on public.applications (preferred_employment_type);

-- The website's repeat check when no email is given: the same phone, position and career group.
create index applications_phone_repeat_idx on public.applications (phone, position_id, career_group, created_at desc);

-- --------------------------------------------------------- HR's table

-- One line per application, newest first. The first ten columns are the table
-- HR reads; the rest are there to filter by (Table Editor → Filter: every
-- filter applies together) and to find the CV in Storage. The whole record
-- is in public.applications (expand the row).
--
-- experience_range reads every application in the new answers: earlier ones
-- are shown in the same terms (Less than 1 year → 0–1 Year), not changed.
-- preferred_employment_type is the candidate's preference; on applications
-- from the previous form it is the contract type they chose then.
drop view public.applications_overview;

create view public.applications_overview
with (security_invoker = true)
as
select
  id,
  first_name || ' ' || last_name as candidate,
  position_title as position,
  property_id as property,
  experience_range,
  coalesce(preferred_employment_type, selected_employment_type) as preferred_employment_type,
  created_at as application_date,
  status,
  coalesce(cv_original_name, 'No CV uploaded') as cv,
  phone,

  -- Filters.
  coalesce(experience_status, 'not_specified') as experience_status,
  location,
  career_group,
  department_id as department,
  position_id,
  case application_type when 'vacancy' then 'Open Vacancy' else 'Expression of Interest' end as application_type,
  vacancy_id,
  -- Asked by the previous form only; empty on newer applications.
  selected_job_level as position_level,

  -- Contact, and the CV's path in the private bucket (empty: no CV).
  email,
  cv_storage_path is not null as has_cv,
  cv_storage_path
from public.applications
cross join lateral (
  select coalesce(
    case
      when experience_status = 'no_experience' then 'No Experience'
      else case experience_years
        when 'Less than 1 year' then '0–1 Year'
        when '1–2 years' then '1–2 Years'
        when '3–5 years' then '3–5 Years'
        when 'More than 5 years' then 'More than 5 Years'
        when 'No Previous Experience' then 'No Experience'
        else experience_years
      end
    end,
    'Not Specified'
  ) as experience_range
) as range
order by created_at desc;

revoke all on public.applications_overview from anon;
