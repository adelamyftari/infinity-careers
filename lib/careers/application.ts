/**
 * The application: what it asks, and the rules it must meet. One module for
 * the form (inline errors) and the server (app/api/applications/route.ts),
 * which checks everything again and never trusts what the browser says.
 *
 * Two steps. Step 01: who the candidate is (four fields), what they are
 * applying for (the property, position level and contract type, chosen only
 * among the combinations the position's listings offer) and whether they have
 * worked before. Step 02: the CV and the privacy acknowledgment.
 *
 * The position level applied for and the candidate's own experience are kept
 * apart and never derived from each other: an entry-level applicant may have
 * years of experience, and a first job seeker is not "Entry Level" by default.
 *
 * It asks only what recruitment needs: no date of birth, gender, marital
 * status, religion or identity number.
 */

import { interestPropertyChoice, preferenceChoices, ANY_PROPERTY, UNSET, type Offering, type PreferenceChoices, type Preferences, EMPTY_PREFERENCES } from "./offerings";
import type { PropertyId } from "./properties";
import type { RoleEntry } from "./roles";
import type { EmploymentType, ExperienceLevel } from "./taxonomy";

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

export const EXPERIENCE_STATUSES = ["no_experience", "with_experience"] as const;
export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number];

export const EXPERIENCE_STATUS_LABEL: Record<ExperienceStatus, string> = {
  no_experience: "No previous experience",
  with_experience: "I have work experience",
};

/** As stored, and as HR filters them. */
export const EXPERIENCE_YEARS = ["Less than 1 year", "1–2 years", "3–5 years", "More than 5 years"] as const;
export type ExperienceYears = (typeof EXPERIENCE_YEARS)[number];

export type Experience = { status: ExperienceStatus | ""; years: string; previousPosition: string };

export const EMPTY_EXPERIENCE: Experience = { status: "", years: "", previousPosition: "" };

/* ------------------------------------------------------------ the record */

export type Personal = { firstName: string; lastName: string; email: string; phone: string };

export type ApplicationInput = { roleId: string; personal: Personal; preferences: Preferences; experience: Experience; privacy: boolean };

export const EMPTY_PERSONAL: Personal = { firstName: "", lastName: "", email: "", phone: "" };

/** What the visitor has entered for a role: kept by the page while it is open, so closing the form never loses it. */
export type ApplicationDraft = { step: 0 | 1; personal: Personal; preferences: Preferences; experience: Experience; privacy: boolean; cv: File | null };

export const newDraft = (): ApplicationDraft => ({ step: 0, personal: { ...EMPTY_PERSONAL }, preferences: { ...EMPTY_PREFERENCES }, experience: { ...EMPTY_EXPERIENCE }, privacy: false, cv: null });

export const LIMITS = { name: 60, email: 254, phone: 24, previousPosition: 80 } as const;

export type Errors = Partial<Record<string, string>>;

/** The fields of step 01, by the keys errors use (step 02 has `cv` and `privacy`). */
export const STEP_ONE_KEYS = ["firstName", "lastName", "email", "phone", "property", "level", "employmentType", "experienceStatus", "experienceYears", "previousPosition"] as const;

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
  const email = p.email.trim();
  if (!email) e.email = "Please enter your email address.";
  else if (email.length > LIMITS.email || !EMAIL.test(email)) e.email = "Please enter a valid email address, like name@example.com.";
  const phone = p.phone.trim();
  const digits = phone.replace(/\D/g, "").length;
  if (!phone) e.phone = "Please enter your phone number.";
  else if (phone.length > LIMITS.phone || !PHONE.test(phone) || digits < 7 || digits > 15) e.phone = "Please enter a valid phone number, with the country code if outside Albania.";
  return e;
}

export function experienceErrors(x: Experience): Errors {
  const e: Errors = {};
  if (!(EXPERIENCE_STATUSES as readonly string[]).includes(x.status)) e.experienceStatus = "Please tell us whether you have previous work experience.";
  else if (x.status === "with_experience") {
    if (!(EXPERIENCE_YEARS as readonly string[]).includes(x.years)) e.experienceYears = "Please choose your years of experience.";
    if (x.previousPosition.trim().length > LIMITS.previousPosition) e.previousPosition = `Please keep it under ${LIMITS.previousPosition} characters.`;
  }
  return e;
}

/** The experience as stored: nothing about years or a previous job for someone without experience. */
export function storedExperience(x: Experience): { experience_status: ExperienceStatus; experience_years: ExperienceYears | null; previous_position: string | null } {
  if (x.status !== "with_experience") return { experience_status: "no_experience", experience_years: null, previous_position: null };
  return { experience_status: "with_experience", experience_years: x.years as ExperienceYears, previous_position: x.previousPosition.trim() || null };
}

/* ----------------------------------------------------------- preferences */

/** The choices the form offers for a role, given what has been chosen. */
export type RoleChoices =
  | ({ kind: "vacancy" } & PreferenceChoices)
  | { kind: "role"; property: PreferenceChoices["property"] };

export function roleChoices(entry: Pick<RoleEntry, "kind" | "offerings" | "propertyIds">, preferences: Preferences): RoleChoices {
  if (entry.kind === "vacancy") return { kind: "vacancy", ...preferenceChoices(entry.offerings, preferences) };
  return { kind: "role", property: interestPropertyChoice(entry.propertyIds, preferences.propertyId) };
}

/** What the application is for, once the choices are complete and valid: the stored values. */
export type Resolved = {
  vacancyId: string | null;
  propertyId: PropertyId | null;
  level: ExperienceLevel | null;
  employmentType: EmploymentType | null;
};

const fromOffering = (o: Offering): Resolved => ({ vacancyId: o.vacancyId, propertyId: o.propertyId, level: o.level, employmentType: o.employmentType });

/** The values in force for what was chosen: what the form sends (a stale choice is not one of them). */
export function effectivePreferences(choices: RoleChoices): Preferences {
  return {
    propertyId: choices.property.value,
    level: choices.kind === "vacancy" ? choices.level.value : "",
    employmentType: choices.kind === "vacancy" ? choices.employmentType.value : "",
  };
}

const NOT_OFFERED = "This option is not offered for this position. Please choose again.";

/**
 * The preferences' errors, and, when there are none, what they resolve to: on
 * a vacancy, one real offering of its listings; on a career role, a property it
 * is relevant at (or none). Strict: a value given that is not one of the
 * options in force (Part-time for a level offered only full-time, a property
 * the role is not at) is refused, never quietly replaced.
 */
export function preferenceResult(entry: Pick<RoleEntry, "kind" | "offerings" | "propertyIds">, preferences: Preferences): { errors: Errors; resolved: Resolved | null } {
  const choices = roleChoices(entry, preferences);
  const effective = effectivePreferences(choices);
  const errors: Errors = {};
  if (preferences.propertyId && preferences.propertyId !== effective.propertyId) errors.property = NOT_OFFERED;
  if (preferences.level && preferences.level !== effective.level) errors.level = NOT_OFFERED;
  if (preferences.employmentType && preferences.employmentType !== effective.employmentType) errors.employmentType = NOT_OFFERED;
  if (Object.keys(errors).length) return { errors, resolved: null };
  if (!choices.property.value) errors.property = "Please choose the location you would like to apply to.";
  if (choices.kind === "role") {
    if (Object.keys(errors).length) return { errors, resolved: null };
    const value = choices.property.value;
    return { errors, resolved: { vacancyId: null, propertyId: value && value !== ANY_PROPERTY && value !== UNSET ? (value as PropertyId) : null, level: null, employmentType: null } };
  }
  if (choices.property.value && !choices.level.value) errors.level = "Please choose the position level you are applying for.";
  if (choices.level.value && !choices.employmentType.value) errors.employmentType = "Please choose your preferred employment type.";
  if (Object.keys(errors).length) return { errors, resolved: null };
  if (!choices.offering) return { errors: { employmentType: "This combination is not offered. Please choose again." }, resolved: null };
  return { errors, resolved: fromOffering(choices.offering) };
}

/* --------------------------------------------------------------- privacy */

export const PRIVACY_ERROR = "Please confirm that you agree to the processing of your personal data for recruitment purposes.";

/**
 * The website's privacy policy. None exists yet: until legal provides one and
 * it is published, this stays null and the form links to nothing. A launch
 * requirement (docs/hr-applications.md).
 */
export const PRIVACY_POLICY_URL: string | null = null;
