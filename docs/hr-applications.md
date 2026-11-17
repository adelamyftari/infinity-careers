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

   `supabase/migrations/20261117130000_simpler_application.sql` follows the simpler form: email and CV become optional, experience is one answer of five, and the employment type is the candidate's preference. It removes nothing either: earlier applications keep their position level, contract choice, experience and CV.
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
  | `property` | The property: the one chosen where the position is at several, the position's own where it is at one (empty: any property, for an expression of interest) |
  | `experience_range` | No Experience, 0–1 Year, 1–2 Years, 3–5 Years, More than 5 Years (or Not Specified) |
  | `preferred_employment_type` | Full-time, Part-time, Internship or Seasonal: the candidate's preference, not a confirmed contract |
  | `application_date` | When it was submitted |
  | `status` | `new`, `in_review`, `shortlisted`, `interview`, `rejected`, `hired` |
  | `cv` | The CV's file name, or **No CV uploaded** |
  | `phone` | The candidate's phone number (always given) |

  The experience is the candidate's own work experience, not the seniority of the position. Applications from earlier forms are shown in the same terms (their `Less than 1 year` reads as `0–1 Year`); what they submitted is unchanged in `applications`.

- **Filtering:** Filter (in Table Editor) on any of these columns; every filter applies together. For example `property` = `hotel-butrinti`, `preferred_employment_type` = `Part-time`, `experience_status` = `with_experience`, `experience_range` = `1–2 Years` shows only the applications that match all four.

  | Filter column | Values |
  |---|---|
  | `experience_status` | `no_experience` (No Experience), `with_experience` (any range, 0–1 Year included), `not_specified` |
  | `experience_range` | No Experience, 0–1 Year, 1–2 Years, 3–5 Years, More than 5 Years |
  | `preferred_employment_type` | Full-time, Part-time, Internship, Seasonal |
  | `has_cv` | `true`, `false` |
  | `position_level` | Entry Level, Intermediate, Senior: asked by the previous form only, empty on newer applications |
  | `property` | `grand-panevino`, `grand-casino-tirana`, `arena-casino`, `international-casino-tirana`, `grand-casino-durres`, `royal-casino`, `hotel-butrinti`, `infinity-hq` |
  | `location` | Tirana, Durrës, Korçë, Sarandë |
  | `career_group` | `casino`, `restaurant`, `hotel`, `administration` |
  | `department` | The department catalog's ids (`lib/careers/taxonomy.ts`), e.g. `reception`, `live-game` |
  | `position_id` | The position catalog's ids, e.g. `casino.reception.receptionist` |
  | `status` | As above |
  | `application_type` | Open Vacancy, Expression of Interest |

  `vacancy_id` names the listing applied through; `email` (empty when the candidate left it out) and `cv_storage_path` (empty with no CV) follow.
- **One application in full:** Table Editor → `applications`. Find the row by its `id` and expand it. Applications from the first form also hold `city`, `motivation` and `professional_answers`; the two-step form no longer asks for them.
- **Download a CV:** Storage → `cvs`. Open the folder for the year and month, then the file named in `cv_storage_path`. The dashboard downloads it over a short-lived signed link. The bucket has no public URLs. An application whose `cv` reads **No CV uploaded** has no file: there is nothing to download, and nothing was stored for it.
- **Update the status:**
  - Edit `status` in `applications` (`new` → `in_review`, `shortlisted`, `interview`, `rejected`, `hired`).
  - `hr_notes` is for internal notes.
  - The candidate's own fields are not editable through the API.

A future HR dashboard would use Supabase Auth instead of the dashboard:

- Add each HR user's id to `public.hr_staff`.
- Row level security then lets exactly those users read applications and the CV bucket.
- They create short-lived CV links, for example `storage.from('cvs').createSignedUrl(path, 60)`.
- Anonymous visitors, and signed-in users not in `hr_staff`, can read nothing.

### Messages from the contact page

The contact page (`/contact`) has a short form for general enquiries. Run `supabase/migrations/20261117120000_contact_messages.sql` (after the applications migration) to create `public.contact_messages`.

- **Read them:** Table Editor → `contact_messages`, newest first: name, email, phone (optional), subject (General Inquiry, Careers & Recruitment, Business Inquiry, Other) and message.
- **Handle them:** set `status` (`new` → `read`, `answered`, `closed`) and keep notes in `hr_notes`. The sender's own fields cannot be edited through the API.
- **Who can read them:** the same people as applications, through `public.hr_staff`; anonymous visitors can neither read nor write.
- **Nothing is emailed:** no verified recipient address has been supplied, so messages are only saved. Until Supabase is configured, the form refuses messages and offers the headquarters' phone number instead; it never shows "Message received" for a message that wasn't saved.
- **Spam:** 5 messages per client per 15 minutes, a hidden honeypot field, and the same email within a minute is refused as a double submission.

## 3. Retention

How long applications are kept is HR's and legal's decision, so **no period is set**. To set one:

```sql
update public.recruitment_settings set retention_days = <days>;
```

`applications_due_for_deletion` then lists the expired applications with their CV paths. Delete both the row (Table Editor) and the file (Storage), or schedule a job to do it.

## 4. What the endpoint enforces

- **Roles:** only those the site lists now. A closed or unknown role is refused with "This role is no longer accepting applications."
- **One card per position:** the positions page shows each position once per career group, however many listings it has. Its listings stay separate records. Cards show no position level or contract type: these are not set officially for each position.
- **The applicant's choices are not trusted:** the property must be one of the position's own (it is asked only when the position is at several), and the preferred employment type one of the four; anything else is refused, not replaced. No position level is asked. The listing (`vacancy_id`), the property's city, the department and the career group come from the site's own data.
- **Fields:**
  - step 01: first and last name and phone (required), email (optional, checked when given), work experience (one of five, required), preferred employment type (one of four, required), and the preferred location only for a position at several properties;
  - step 02: the CV (optional) and the privacy agreement (required);
  - nothing beyond what recruitment needs is asked (no date of birth, gender, marital status, religion or identity number);
  - the privacy agreement is never pre-checked.
- **The CV (optional):**
  - without one, nothing is uploaded and the CV columns stay empty (never a placeholder file);
  - with one, its extension, its declared type and its first bytes must all agree (PDF, DOC or DOCX), up to 5 MB;
  - it is stored under a generated name; the original name is kept only as a label;
  - if the row can't be saved, the uploaded CV is deleted.
- **Repeats:** the same email (or, when no email is given, the same phone) for the same position, in the same career group, within 24 hours is refused.
- **Spam:** 5 submissions per client per 15 minutes, plus a hidden honeypot field.
  - The limit lives in each server's memory, so behind several instances each keeps its own count.
  - Make sure the hosting proxy sets `x-forwarded-for`.
  - For a stricter limit, put a shared store or the host's rate limiting in front.
- **Logging:** no applicant details are logged, and error responses never repeat what was sent.

## 5. Before launch

- **Privacy policy:** none exists. Once legal has published one, set `PRIVACY_POLICY_URL` in `lib/careers/application.ts`; the form will then link to it.
- **The five listings** in `lib/careers/jobs.ts`: they are carried over from the earlier site and have no property, location or publication date. HR should confirm each one, or close it, before launch.
- **Several properties for one position:** add one listing per property, with the same `positionId` and `careerGroup`. The page then shows one card for them, and the application asks which property the candidate prefers.
- **Levels and contract types on listings:** the positions page's Experience and Employment Type filters still read them from each listing (`experienceLevel`, `employmentTypes`), as do the job pages under `/jobs/`. Cards and the application no longer show or ask for them. HR should confirm or clear these values.
- **Catalog roles shown per property:** casino roles at the casinos (only the slot floor and the slot technician at Royal Casino Korçë), restaurant roles at Grand Panevino, administration roles at the headquarters. HR should confirm this mapping.
- **Notifications:** no email is sent. If HR wants one:
  - send it only to a verified HR address;
  - include a link, not the CV;
  - never attach CVs to email.
