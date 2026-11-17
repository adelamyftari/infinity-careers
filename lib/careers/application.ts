/**
 * The application: what it asks, and the rules it must meet. One module for
 * the form (inline errors) and the server (app/api/applications/route.ts),
 * which checks everything again and never trusts what the browser says.
 *
 * Two steps. Step 01: who the candidate is (first and last name and phone
 * required, email optional), how much work experience they have (one answer
 * of five), the employment type they would prefer (one of four, chosen freely)
 * and, only for a position at more than one property, where they would like to
 * work. Step 02: the CV (optional) and the privacy acknowledgment.
 *
 * No position level is asked: the levels are not set officially for each
 * position. The employment type is the candidate's preference, never a
 * confirmed contract, and their experience is about them, not the position's
 * seniority.
 *
 * It asks only what recruitment needs: no date of birth, gender, marital
 * status, religion or identity number.
 */

import { getCareersProperty, propertiesIn, type PropertyId } from "./properties";
import type { RoleEntry } from "./roles";
import { EMPLOYMENT_TYPES, type EmploymentType } from "./taxonomy";

/* -------------------------------------------------------------------- CV */

/** The CV's size limit (bytes). Change it here: the form, the server and the migration's bucket limit follow it. */
export const CV_MAX_BYTES = 5 * 1024 * 1024;

export const CV_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;
export type CvExtension = keyof typeof CV_TYPES;

export const CV_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const formatBytes = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

export function cvExtension(name: string): CvExtension | null {
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  return ext === "pdf" || ext === "doc" || ext === "docx" ? ext : null;
}

/** What is wrong with a CV, by its name, type and size (the server also reads its first bytes). */
export function cvProblem(file: { name: string; type: string; size: number }): string | null {
  const ext = cvExtension(file.name);
  if (!ext) return "Please upload your CV as a PDF, DOC or DOCX file.";
  if (file.type !== CV_TYPES[ext]) return "This file's type doesn't match a PDF, DOC or DOCX document. Please save it again in one of these formats.";
  if (file.size === 0) return "This file is empty. Please choose your CV again.";
  if (file.size > CV_MAX_BYTES) return `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(CV_MAX_BYTES)}.`;
  return null;
}

/* ------------------------------------------------------------ experience */

/** The one experience question's answers, as the form offers them, as stored, and as HR filters them. */
export const EXPERIENCE_RANGES = ["No Experience", "0–1 Year", "1–2 Years", "3–5 Years", "More than 5 Years"] as const;
export type ExperienceRange = (typeof EXPERIENCE_RANGES)[number];

/** HR's classification: no_experience for No Experience, with_experience for any range (0–1 Year is some experience). */
export const EXPERIENCE_STATUSES = ["no_experience", "with_experience"] as const;
export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number];

export const isExperienceRange = (value: string): value is ExperienceRange => (EXPERIENCE_RANGES as readonly string[]).includes(value);

export const experienceStatusOf = (range: ExperienceRange): ExperienceStatus => (range === "No Experience" ? "no_experience" : "with_experience");

export function experienceErrors(range: string): Errors {
  return isExperienceRange(range) ? {} : { experience: "Please choose how much work experience you have." };
}

/** The experience as stored: the range as answered, and its classification. */
export function storedExperience(range: ExperienceRange): { experience_status: ExperienceStatus; experience_years: ExperienceRange; previous_position: null } {
  return { experience_status: experienceStatusOf(range), experience_years: range, previous_position: null };
}

/* ------------------------------------------------------------ the record */

export type Personal = { firstName: string; lastName: string; email: string; phone: string };

/** What the candidate chose: the property ("" until chosen; asked only when there are several) and the employment type they prefer. */
export type Preferences = { propertyId: string; employmentType: string };

export const EMPTY_PREFERENCES: Preferences = { propertyId: "", employmentType: "" };

export type ApplicationInput = { roleId: string; personal: Personal; preferences: Preferences; experience: string; privacy: boolean };

export const EMPTY_PERSONAL: Personal = { firstName: "", lastName: "", email: "", phone: "" };

/** What the visitor has entered for a role: kept by the page while it is open, so closing the form never loses it. */
export type ApplicationDraft = { step: 0 | 1; personal: Personal; preferences: Preferences; experience: string; privacy: boolean; cv: File | null };

export const newDraft = (): ApplicationDraft => ({ step: 0, personal: { ...EMPTY_PERSONAL }, preferences: { ...EMPTY_PREFERENCES }, experience: "", privacy: false, cv: null });

export const LIMITS = { name: 60, email: 254, phone: 24 } as const;

export type Errors = Partial<Record<string, string>>;

/** The fields of step 01, by the keys errors use (step 02 has `cv` and `privacy`). */
export const STEP_ONE_KEYS = ["firstName", "lastName", "phone", "email", "experience", "employmentType", "property"] as const;

const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE = /^\+?[\d\s().-]+$/;

export function personalErrors(p: Personal): Errors {
  const e: Errors = {};
  const name = (key: "firstName" | "lastName", label: string) => {
    const v = p[key].trim();
    if (!v) e[key] = `Please enter your ${label}.`;
    else if (v.length > LIMITS.name) e[key] = `Please keep it under ${LIMITS.name} characters.`;
    else if (!NAME.test(v)) e[key] = "Please use letters only (spaces, hyphens and apostrophes are fine).";
  };
  name("firstName", "first name");
  name("lastName", "last name");
  const phone = p.phone.trim();
  const digits = phone.replace(/\D/g, "").length;
  if (!phone) e.phone = "Please enter your phone number, so our recruitment team can reach you.";
  else if (phone.length > LIMITS.phone || !PHONE.test(phone) || digits < 7 || digits > 15) e.phone = "Please enter a valid phone number, with the country code if outside Albania.";
  // Optional: checked only when given.
  const email = p.email.trim();
  if (email && (email.length > LIMITS.email || !EMAIL.test(email))) e.email = "Please enter a valid email address, like name@example.com, or leave it empty.";
  return e;
}

/* ----------------------------------------------------------- preferences */

/** An expression of interest's "any of these properties". */
export const ANY_PROPERTY = "any";

type Locatable = Pick<RoleEntry, "kind" | "offerings" | "propertyIds">;

/** The properties a candidate can choose between for a role: asked only when there are two or more. */
export function locationOptions(entry: Locatable): string[] {
  const order = propertiesIn(null).map((p) => p.id as string);
  const ids =
    entry.kind === "vacancy"
      ? [...new Set(entry.offerings.map((o) => o.propertyId).filter((id): id is PropertyId => id !== null))]
      : [...entry.propertyIds];
  const sorted = ids.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (sorted.length < 2) return [];
  return entry.kind === "role" ? [...sorted, ANY_PROPERTY] : sorted;
}

/** A location option as the form names it. */
export function locationLabel(value: string, label: (id: PropertyId) => string): string {
  if (value === ANY_PROPERTY) return "Any of these locations";
  return `${label(value as PropertyId)} · ${getCareersProperty(value as PropertyId).city}`;
}

export const isEmploymentType = (value: string): value is EmploymentType => (EMPLOYMENT_TYPES as readonly string[]).includes(value);

/** What the application is for, once the choices are valid: the stored values. */
export type Resolved = {
  /** The listing applied through (an expression of interest has none). */
  vacancyId: string | null;
  propertyId: PropertyId | null;
  /** The candidate's preference, not a confirmed contract. */
  employmentType: EmploymentType;
};

/**
 * The choices' errors, and, when there are none, what they resolve to. The
 * employment type is any of the four, chosen freely. The property is asked only
 * where the role is at several: a value that is not one of its properties is
 * refused, never quietly replaced. A position's listing is the first one at the
 * chosen property (or its first, when there is no choice).
 */
export function preferenceResult(entry: Locatable, preferences: Preferences): { errors: Errors; resolved: Resolved | null } {
  const errors: Errors = {};
  const options = locationOptions(entry);
  const wanted = preferences.propertyId;
  if (options.length) {
    if (!wanted) errors.property = "Please choose the location you would like to work at.";
    else if (!options.includes(wanted)) errors.property = "This location is not offered for this position. Please choose again.";
  }
  if (!preferences.employmentType) errors.employmentType = "Please choose your preferred employment type.";
  else if (!isEmploymentType(preferences.employmentType)) errors.employmentType = "Please choose one of the employment types offered.";
  if (Object.keys(errors).length) return { errors, resolved: null };

  const employmentType = preferences.employmentType as EmploymentType;
  // Asked: the choice. Not asked: the role's only property, if it has one.
  const single = entry.kind === "vacancy" ? (entry.offerings.find((o) => o.propertyId)?.propertyId ?? null) : (entry.propertyIds[0] ?? null);
  const propertyId = options.length ? (wanted === ANY_PROPERTY ? null : (wanted as PropertyId)) : single;
  if (entry.kind === "role") return { errors, resolved: { vacancyId: null, propertyId, employmentType } };
  const listing = (propertyId && entry.offerings.find((o) => o.propertyId === propertyId)) || entry.offerings[0];
  if (!listing) return { errors: { employmentType: "This position is no longer accepting applications." }, resolved: null };
  return { errors, resolved: { vacancyId: listing.vacancyId, propertyId, employmentType } };
}

/* --------------------------------------------------------------- privacy */

export const PRIVACY_ERROR = "Please confirm that you agree to the processing of your personal data for recruitment purposes.";

/**
 * The website's privacy policy. None exists yet: until legal provides one and
 * it is published, this stays null and the form links to nothing. A launch
 * requirement (docs/hr-applications.md).
 */
export const PRIVACY_POLICY_URL: string | null = null;
