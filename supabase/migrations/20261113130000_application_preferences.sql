-- Infinity Careers: the two-step application, and HR's classification of it.
--
-- Runs after 20261113120000_applications.sql. Additive: no table, row or id is
-- removed or renamed, and earlier applications keep every value they were
-- submitted with.
--
--   * What the candidate applied for: the position level and the contract type
--     chosen among the listing's real offerings (the website resolves them, and
--     the vacancy_id of the listing, on the server).
--   * The candidate's own experience, kept apart from the level applied for:
--     experience_status, experience_years, previous_position.
--   * The fields the two-step form no longer asks (city, motivation) become
--     optional; earlier applications keep theirs.
--   * applications_overview: the HR table, with the columns HR filters by.

-- ------------------------------------------------------- what was chosen

alter table public.applications
  add column selected_job_level text
    check (selected_job_level in ('Entry Level', 'Intermediate', 'Senior')),
  add column selected_employment_type text
    check (selected_employment_type in ('Full-time', 'Part-time', 'Internship', 'Seasonal'));

-- -------------------------------------------------------- the experience

alter table public.applications
  add column experience_status text
    check (experience_status in ('no_experience', 'with_experience')),
  add column previous_position text
    check (char_length(previous_position) between 1 and 80);

-- experience_years was a required answer; it now applies only with experience.
alter table public.applications alter column experience_years drop not null;

-- The years as the form offers them. 'No Previous Experience' is how the first
-- form recorded no experience: kept as submitted on those applications.
alter table public.applications
  add constraint experience_years_known
    check (experience_years in ('Less than 1 year', '1–2 years', '3–5 years', 'More than 5 years', 'No Previous Experience'));

-- No experience: no years and no previous position (or the first form's own
-- 'No Previous Experience'). With experience: the years are required.
alter table public.applications
  add constraint experience_consistent
    check (
      experience_status is null
      or (experience_status = 'no_experience' and (experience_years is null or experience_years = 'No Previous Experience') and previous_position is null)
      or (experience_status = 'with_experience' and experience_years is not null and experience_years <> 'No Previous Experience')
    );

-- Earlier applications, classified from what they answered, without touching
-- their updated_at (this is not an edit by HR).
alter table public.applications disable trigger applications_touch;
update public.applications
set experience_status = case when experience_years = 'No Previous Experience' then 'no_experience' else 'with_experience' end
where experience_status is null and experience_years is not null;
alter table public.applications enable trigger applications_touch;

-- ---------------------------------------- fields the form no longer asks

alter table public.applications alter column city drop not null;
alter table public.applications alter column motivation drop not null;

-- ------------------------------------------------------- HR's filtering

create index applications_property_idx on public.applications (property_id);
create index applications_group_department_idx on public.applications (career_group, department_id);
create index applications_choice_idx on public.applications (selected_job_level, selected_employment_type);
create index applications_experience_idx on public.applications (experience_status, experience_years);

-- The website's repeat check: the same email, position and career group.
drop index public.applications_repeat_idx;
create index applications_repeat_idx on public.applications (email, position_id, career_group, created_at desc);

-- --------------------------------------------------------- HR's table

-- One line per application, newest first. The first ten columns are the table
-- HR reads; the rest are there to filter by (Table Editor → Filter: every
-- filter applies together) and to find the CV in Storage. The whole record
-- is in public.applications (expand the row).
drop view public.applications_overview;

create view public.applications_overview
with (security_invoker = true)
as
select
  id,
  first_name || ' ' || last_name as candidate,
  position_title as position,
  property_id as property,
  selected_job_level as position_level,
  selected_employment_type as employment_type,
  case experience_status
    when 'no_experience' then 'No Experience'
    when 'with_experience' then 'With Experience' || coalesce(' · ' || experience_years, '')
    else 'Not Specified'
  end as experience,
  created_at as application_date,
  status,
  cv_original_name as cv,

  -- Filters.
  coalesce(experience_status, 'not_specified') as experience_status,
  experience_years,
  location,
  career_group,
  department_id as department,
  position_id,
  case application_type when 'vacancy' then 'Open Vacancy' else 'Expression of Interest' end as application_type,
  vacancy_id,

  -- Contact and the CV's path in the private bucket.
  email,
  phone,
  cv_storage_path
from public.applications
order by created_at desc;

revoke all on public.applications_overview from anon;
