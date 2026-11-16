# Applications: setup and HR access

The positions page (`/roles`) takes two kinds of submission:

- **Application**: for an open listing (APPLY NOW).
- **Expression of interest**: for a career role with no opening (EXPRESS INTEREST).

Both go to one server endpoint, `app/api/applications/route.ts`. It checks everything again and stores each submission in Supabase:

- a row in `public.applications`;
- the CV in the private `cvs` bucket.

Candidates never sign in. Only HR can read what they send.

Until Supabase is configured, the form refuses submissions with: *"Online applications are not open yet. Your details have not been sent; please try again soon."* Nothing is lost silently, and nothing is falsely confirmed.

## 1. Set up Supabase (once)

1. Create a Supabase project.
2. Run the two migrations, in order, in either of two ways:
   - paste each into **SQL Editor** and run it; or
   - run `supabase db push` with the Supabase CLI.

   `supabase/migrations/20261113120000_applications.sql` creates:
   - the `applications` table, with row level security on;
   - the private `cvs` bucket (5 MB limit; PDF, DOC and DOCX only);
   - the `hr_staff` list;
   - the retention settings;
   - two views, `applications_overview` and `applications_due_for_deletion`.

   `supabase/migrations/20261113130000_application_preferences.sql` adds what the two-step form records, and HR's table (section 2). It removes nothing: earlier applications keep all their values, and are classified as with or without experience from their own answer.
3. Add two variables to the server's environment: `.env.local` for local runs, or the hosting provider's settings in production.

   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<the project's service_role key>
   ```

   - **Never** prefix them with `NEXT_PUBLIC_`.
   - **Never** put them in client code.
   - The service-role key bypasses row level security. Only the server route uses it, and only to write a row and upload a CV.
4. Restart the site. Submissions are now accepted.

## 2. How HR reads applications (Supabase dashboard)

Sign in at supabase.com with an account that is a member of the project. Keep membership to the recruitment team, and turn on multi-factor authentication.

- **The table of applications:** Table Editor → `applications_overview`, newest first. Its first columns are the table to read:

  | Column | What it holds |
  |---|---|
  | `candidate` | First and last name |
  | `position` | The position applied for |
  | `property` | The property chosen (empty: to be confirmed, or any property for an expression of interest) |
  | `position_level` | Entry Level, Intermediate or Senior: the level of the role applied for |
  | `employment_type` | Full-time, Part-time, Internship or Seasonal |
  | `experience` | No Experience, With Experience · *years*, or Not Specified |
  | `application_date` | When it was submitted |
  | `status` | `new`, `in_review`, `shortlisted`, `interview`, `rejected`, `hired` |
  | `cv` | The CV's file name |

  The position level is what the candidate applied for, chosen among the combinations the listing offers. It is not the candidate's experience, which is recorded separately: an Entry Level application can come from someone with years of experience.

- **Filtering:** Filter (in Table Editor) on any of these columns; every filter applies together. For example `property` = `hotel-butrinti`, `position_id` = `casino.reception.receptionist`, `employment_type` = `Part-time`, `position_level` = `Entry Level`, `experience_status` = `with_experience`, `experience_years` = `1–2 years` shows only the applications that match all six.

  | Filter column | Values |
  |---|---|
  | `experience_status` | `no_experience`, `with_experience`, `not_specified` |
  | `experience_years` | Less than 1 year, 1–2 years, 3–5 years, More than 5 years |
  | `position_level` | Entry Level, Intermediate, Senior |
  | `employment_type` | Full-time, Part-time, Internship, Seasonal |
  | `property` | `grand-panevino`, `grand-casino-tirana`, `arena-casino`, `international-casino-tirana`, `grand-casino-durres`, `royal-casino`, `hotel-butrinti`, `infinity-hq` |
  | `location` | Tirana, Durrës, Korçë, Sarandë |
  | `career_group` | `casino`, `restaurant`, `hotel`, `administration` |
  | `department` | The department catalog's ids (`lib/careers/taxonomy.ts`), e.g. `reception`, `live-game` |
  | `position_id` | The position catalog's ids, e.g. `casino.reception.receptionist` |
  | `status` | As above |
  | `application_type` | Open Vacancy, Expression of Interest |

  `vacancy_id` names the listing applied for; `email`, `phone` and `cv_storage_path` follow.
- **One application in full:** Table Editor → `applications`. Find the row by its `id` and expand it. Applications from the first form also hold `city`, `motivation` and `professional_answers`; the two-step form no longer asks for them.
- **Download a CV:** Storage → `cvs`. Open the folder for the year and month, then the file named in `cv_storage_path`. The dashboard downloads it over a short-lived signed link. The bucket has no public URLs.
- **Update the status:**
  - Edit `status` in `applications` (`new` → `in_review`, `shortlisted`, `interview`, `rejected`, `hired`).
  - `hr_notes` is for internal notes.
  - The candidate's own fields are not editable through the API.

A future HR dashboard would use Supabase Auth instead of the dashboard:

- Add each HR user's id to `public.hr_staff`.
- Row level security then lets exactly those users read applications and the CV bucket.
- They create short-lived CV links, for example `storage.from('cvs').createSignedUrl(path, 60)`.
- Anonymous visitors, and signed-in users not in `hr_staff`, can read nothing.

## 3. Retention

How long applications are kept is HR's and legal's decision, so **no period is set**. To set one:

```sql
update public.recruitment_settings set retention_days = <days>;
```

`applications_due_for_deletion` then lists the expired applications with their CV paths. Delete both the row (Table Editor) and the file (Storage), or schedule a job to do it.

## 4. What the endpoint enforces

- **Roles:** only those the site lists now. A closed or unknown role is refused with "This role is no longer accepting applications."
- **One card per position:** the positions page shows each position once per career group, however many listings it has. Its listings stay separate records; the card lists their levels, contract types and properties, and the application offers only the combinations they actually have.
- **The applicant's choices are not trusted:** the property, position level and contract type must be one of the listings' real offerings, recomputed on the server. A value that isn't offered (Part-time for a level offered only full-time) is refused, not replaced. The listing (`vacancy_id`), the property's city, the department and the career group come from the site's own data.
- **Fields:**
  - step 01: first and last name, email, phone, the job preferences, and whether the candidate has worked before (if so, the years, and optionally the previous position);
  - step 02: the CV and the privacy agreement;
  - nothing beyond what recruitment needs is asked (no date of birth, gender, marital status, religion or identity number);
  - the privacy agreement is never pre-checked.
- **The CV:**
  - its extension, its declared type and its first bytes must all agree (PDF, DOC or DOCX), up to 5 MB;
  - it is stored under a generated name; the original name is kept only as a label;
  - if the row can't be saved, the uploaded CV is deleted.
- **Repeats:** the same email for the same position, in the same career group, within 24 hours is refused.
- **Spam:** 5 submissions per client per 15 minutes, plus a hidden honeypot field.
  - The limit lives in each server's memory, so behind several instances each keeps its own count.
  - Make sure the hosting proxy sets `x-forwarded-for`.
  - For a stricter limit, put a shared store or the host's rate limiting in front.
- **Logging:** no applicant details are logged, and error responses never repeat what was sent.

## 5. Before launch

- **Privacy policy:** none exists. Once legal has published one, set `PRIVACY_POLICY_URL` in `lib/careers/application.ts`; the form will then link to it.
- **The five listings** in `lib/careers/jobs.ts`: they are carried over from the earlier site and have no property, location or publication date. HR should confirm each one, or close it, before launch.
- **Several levels, contracts or properties for one position:** add one listing per property and level, with its contract types, all with the same `positionId` and `careerGroup`. The page then shows one card for them. Two listings must not offer the same combination; `offeringConflicts` in `lib/careers/offerings.ts` finds any that do.
- **Catalog roles shown per property:** casino roles at the casinos (only the slot floor and the slot technician at Royal Casino Korçë), restaurant roles at Grand Panevino, administration roles at the headquarters. HR should confirm this mapping.
- **Notifications:** no email is sent. If HR wants one:
  - send it only to a verified HR address;
  - include a link, not the CV;
  - never attach CVs to email.
