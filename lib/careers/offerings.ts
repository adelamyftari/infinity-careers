/**
 * Offerings: the hiring configurations behind one public position card.
 *
 * A listing (lib/careers/jobs.ts) is HR's vacancy record: one catalog position
 * at one property, at one level, with the contract types HR has set. Each of
 * its contract types is one offering:
 *
 *   front-desk-agent (Hotel Receptionist · Hotel Butrinti · Entry Level · Full-time, Part-time)
 *     → Hotel Butrinti · Entry Level · Full-time
 *     → Hotel Butrinti · Entry Level · Part-time
 *
 * The positions page shows one card per position (in its career group) and
 * lists the levels, contract types and properties its offerings have; the
 * application asks the candidate to choose among the combinations that exist,
 * never among every value of each field. Nothing here adds an offering: a
 * value HR has not set stays `null` ("to be confirmed"), and an offering is only
 * ever read from a listing.
 */

import type { Job } from "./jobs";
import { getCareersProperty, propertiesIn, type City, type PropertyId } from "./properties";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, type EmploymentType, type ExperienceLevel } from "./taxonomy";

export type Offering = {
  /** The listing it comes from: what an application records as its vacancy. */
  vacancyId: string;
  propertyId: PropertyId | null;
  city: City | null;
  level: ExperienceLevel | null;
  employmentType: EmploymentType | null;
  publishedAt: string | null;
};

/** One offering per contract type of a listing (one, unset, if HR has set none). */
export function offeringsOf(job: Job): Offering[] {
  const types: (EmploymentType | null)[] = job.employmentTypes.length ? [...new Set(job.employmentTypes)] : [null];
  return types.map((employmentType) => ({
    vacancyId: job.slug,
    propertyId: job.propertyId,
    city: job.location,
    level: job.experienceLevel,
    employmentType,
    publishedAt: job.publishedAt,
  }));
}

/* ------------------------------------------------------------- the choice */

/** A value HR has not set, as the form holds it (a choice of its own only when it is the only one). */
export const UNSET = "unset";
/** An expression of interest's "any of these properties". */
export const ANY_PROPERTY = "any";

/** What the candidate has chosen; "" is nothing yet. Values are property ids, level and type names, UNSET or ANY_PROPERTY. */
export type Preferences = { propertyId: string; level: string; employmentType: string };

export const EMPTY_PREFERENCES: Preferences = { propertyId: "", level: "", employmentType: "" };

export type Choice = {
  /** The values the candidate can choose from, given the fields before it. */
  options: string[];
  /** The value in force: the only option, or the candidate's choice while it is still one of them; "" otherwise. */
  value: string;
};

export type PreferenceChoices = {
  property: Choice;
  level: Choice;
  employmentType: Choice;
  /** The offering the choices point at, once they are complete: what the application is for. */
  offering: Offering | null;
};

const key = (value: string | null) => value ?? UNSET;
const unique = (values: string[]) => [...new Set(values)];

const PROPERTY_ORDER = propertiesIn(null).map((p) => p.id as string);
const rank = (order: readonly string[]) => (a: string, b: string) => (a === UNSET ? 1 : b === UNSET ? -1 : order.indexOf(a) - order.indexOf(b));

/**
 * The value in force. `decide` says when a single option is taken without asking: always for the
 * location (one property is where the role is), but for the level and the contract only when that
 * option is UNSET (HR has not set it, so there is nothing to choose). A single real level or
 * contract is still the candidate's to choose: nothing is preselected for them.
 */
function choose(options: string[], wanted: string, decide: "single" | "unset"): Choice {
  const decided = options.length === 1 && (decide === "single" || options[0] === UNSET);
  return { options, value: decided ? options[0] : options.includes(wanted) ? wanted : "" };
}

/**
 * The application's choices for a position's offerings, in order: the
 * property, then the level offered there, then the contract types offered at
 * that property and level. A choice that a change upstream no longer allows is
 * dropped, and one it still allows is kept. Senior offered only full-time
 * means that, once Senior is chosen, Part-time is not an option.
 */
export function preferenceChoices(offerings: readonly Offering[], wanted: Preferences): PreferenceChoices {
  const property = choose(unique(offerings.map((o) => key(o.propertyId))).sort(rank(PROPERTY_ORDER)), wanted.propertyId, "single");
  const atProperty = property.value ? offerings.filter((o) => key(o.propertyId) === property.value) : [];
  const level = choose(unique(atProperty.map((o) => key(o.level))).sort(rank(EXPERIENCE_LEVELS)), wanted.level, "unset");
  const atLevel = level.value ? atProperty.filter((o) => key(o.level) === level.value) : [];
  const employmentType = choose(unique(atLevel.map((o) => key(o.employmentType))).sort(rank(EMPLOYMENT_TYPES)), wanted.employmentType, "unset");
  const offering = employmentType.value ? (atLevel.find((o) => key(o.employmentType) === employmentType.value) ?? null) : null;
  return { property, level, employmentType, offering };
}

/**
 * An expression of interest has no offering: the candidate may say which of
 * the role's properties they would like to work at (or any of them). Level
 * and contract type are not asked: nothing is offered to choose from.
 */
export function interestPropertyChoice(propertyIds: readonly PropertyId[], wanted: string): Choice {
  const options = propertyIds.length > 1 ? [...propertyIds, ANY_PROPERTY] : [...propertyIds];
  return choose(options, wanted, "single");
}

/** A property choice as the page names it. */
export function propertyOptionLabel(value: string, label: (id: PropertyId) => string): string {
  if (value === UNSET) return "To be confirmed by HR";
  if (value === ANY_PROPERTY) return "Any of these locations";
  return `${label(value as PropertyId)} · ${getCareersProperty(value as PropertyId).city}`;
}

export const valueLabel = (value: string) => (value === UNSET ? "To be confirmed by HR" : value);

/* ------------------------------------------------------------ HR's checks */

/**
 * Listings that offer the same combination twice (the same position, group,
 * property, level and contract type): the application could not tell them
 * apart, so the HR form should refuse the second (empty when there are none).
 */
export function offeringConflicts(jobs: readonly Job[]): string[] {
  const seen = new Map<string, string>();
  const problems: string[] = [];
  for (const job of jobs.filter((j) => j.status === "published")) {
    for (const o of offeringsOf(job)) {
      const combination = [job.careerGroup, job.positionId, key(o.propertyId), key(o.level), key(o.employmentType)].join("|");
      const first = seen.get(combination);
      if (first && first !== job.slug) problems.push(`${job.slug} offers the same combination as ${first}: ${combination}`);
      else seen.set(combination, job.slug);
    }
  }
  return problems;
}
