/**
 * The job search: its filters, the options each offers, how they constrain
 * each other, and the one matching rule every view uses.
 *
 * Across filters a listing must match all chosen values (AND); "All" (null)
 * matches anything. Options come from the taxonomy and the property catalog,
 * not from whichever listings happen to exist, so every city, property and
 * group can be chosen even when it has no opening.
 *
 * Linked filters: Location narrows Property; Career group narrows Department.
 * Changing the outer one clears an inner choice that no longer fits.
 */

import type { Job, RolePreview } from "./jobs";
import { BUSINESS_TYPE_LABEL, CITIES, getCareersProperty, isPropertyId, propertiesIn, type City, type PropertyId } from "./properties";
import {
  CAREER_GROUP_LABEL,
  CAREER_GROUPS,
  departmentsFor,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  getDepartment,
  isDepartmentId,
  type CareerGroup,
  type DepartmentId,
  type EmploymentType,
  type ExperienceLevel,
} from "./taxonomy";

export type FilterId = "location" | "property" | "group" | "department" | "experience" | "type";

/** `null` means "All". */
export type FilterSelection = {
  location: City | null;
  property: PropertyId | null;
  group: CareerGroup | null;
  department: DepartmentId | null;
  experience: ExperienceLevel | null;
  type: EmploymentType | null;
};

export const EMPTY_SELECTION: FilterSelection = {
  location: null,
  property: null,
  group: null,
  department: null,
  experience: null,
  type: null,
};

export type JobFilter = {
  id: FilterId;
  label: string;
  /** Shown, and offered first, for "no selection". */
  anyLabel: string;
  /** Primary filters are always in the bar; the rest live in "More filters". */
  primary: boolean;
};

export const JOB_FILTERS: readonly JobFilter[] = [
  { id: "location", label: "Location", anyLabel: "All Locations", primary: true },
  { id: "property", label: "Property", anyLabel: "All Properties", primary: true },
  { id: "group", label: "Career Group", anyLabel: "All Groups", primary: true },
  { id: "experience", label: "Experience Level", anyLabel: "All Levels", primary: false },
  { id: "type", label: "Employment Type", anyLabel: "All Types", primary: false },
  { id: "department", label: "Department", anyLabel: "All Departments", primary: false },
];

export const PRIMARY_FILTERS = JOB_FILTERS.filter((filter) => filter.primary);
export const MORE_FILTERS = JOB_FILTERS.filter((filter) => !filter.primary);

export type FilterOption = { value: string; label: string; /** Heading the option is listed under. */ group?: string };

const isCity = (value: string): value is City => (CITIES as readonly string[]).includes(value);
const isGroup = (value: string): value is CareerGroup => (CAREER_GROUPS as readonly string[]).includes(value);
const isLevel = (value: string): value is ExperienceLevel => (EXPERIENCE_LEVELS as readonly string[]).includes(value);
const isType = (value: string): value is EmploymentType => (EMPLOYMENT_TYPES as readonly string[]).includes(value);

/** What a filter offers, given the rest of the selection. */
export function filterOptions(id: FilterId, selection: FilterSelection): FilterOption[] {
  switch (id) {
    case "location":
      return CITIES.map((city) => ({ value: city, label: city }));
    case "property":
      return propertiesIn(selection.location).map((p) => ({ value: p.id, label: p.name, group: BUSINESS_TYPE_LABEL[p.businessType] }));
    case "group":
      return CAREER_GROUPS.map((group) => ({ value: group, label: CAREER_GROUP_LABEL[group] }));
    case "department":
      return departmentsFor(selection.group).map((d) => ({ value: d.id, label: d.name }));
    case "experience":
      return EXPERIENCE_LEVELS.map((level) => ({ value: level, label: level }));
    case "type":
      return EMPLOYMENT_TYPES.map((type) => ({ value: type, label: type }));
  }
}

/** The readable name of a chosen value. */
export function valueLabel(id: FilterId, selection: FilterSelection): string | null {
  switch (id) {
    case "property":
      return selection.property && getCareersProperty(selection.property).name;
    case "group":
      return selection.group && CAREER_GROUP_LABEL[selection.group];
    case "department":
      return selection.department && getDepartment(selection.department).name;
    default:
      return selection[id];
  }
}

/** Drops choices that the outer filters no longer allow (a Tirana property once Sarandë is chosen). */
export function normalizeSelection(selection: FilterSelection): FilterSelection {
  const next = { ...selection };
  if (next.property && next.location && getCareersProperty(next.property).city !== next.location) next.property = null;
  if (next.department && next.group && !(getDepartment(next.department).groups as readonly CareerGroup[]).includes(next.group)) next.department = null;
  return next;
}

/** The selection with one filter set from a raw value (a menu, a URL); an unknown value means "All". */
export function withFilter(selection: FilterSelection, id: FilterId, raw: string | null): FilterSelection {
  const next = { ...selection };
  switch (id) {
    case "location":
      next.location = raw !== null && isCity(raw) ? raw : null;
      break;
    case "property":
      next.property = raw !== null && isPropertyId(raw) ? raw : null;
      break;
    case "group":
      next.group = raw !== null && isGroup(raw) ? raw : null;
      break;
    case "department":
      next.department = raw !== null && isDepartmentId(raw) ? raw : null;
      break;
    case "experience":
      next.experience = raw !== null && isLevel(raw) ? raw : null;
      break;
    case "type":
      next.type = raw !== null && isType(raw) ? raw : null;
      break;
  }
  return normalizeSelection(next);
}

export function activeFilterCount(selection: FilterSelection, filters: readonly JobFilter[] = JOB_FILTERS) {
  return filters.filter((filter) => selection[filter.id] !== null).length;
}

/** A listing matches when it fits every chosen filter. */
export function matchesSelection(job: Job, selection: FilterSelection) {
  return (
    (selection.location === null || job.location === selection.location) &&
    (selection.property === null || job.propertyId === selection.property) &&
    (selection.group === null || job.careerGroup === selection.group) &&
    (selection.department === null || job.departmentId === selection.department) &&
    (selection.experience === null || job.experienceLevel === selection.experience) &&
    (selection.type === null || job.employmentTypes.includes(selection.type))
  );
}

/** The published listings that match: what the search counts and shows. */
export function matchingJobs(jobs: readonly Job[], selection: FilterSelection) {
  return jobs.filter((job) => job.status === "published" && matchesSelection(job, selection));
}

/**
 * A role pictured without an opening (ROLE_PREVIEWS) has only a career group:
 * it stays in view while nothing else is chosen, and while its group is the one chosen.
 */
export function previewMatchesSelection(role: RolePreview, selection: FilterSelection) {
  return JOB_FILTERS.every((filter) => {
    if (selection[filter.id] === null) return true;
    return filter.id === "group" && role.careerGroup === selection.group;
  });
}

/* --------------------------------------------------- shareable selections */

/** URL parameter per filter: /?location=Tirana&group=casino#roles */
export function selectionToParams(selection: FilterSelection, params = new URLSearchParams()) {
  for (const filter of JOB_FILTERS) {
    const value = selection[filter.id];
    if (value === null) params.delete(filter.id);
    else params.set(filter.id, value);
  }
  return params;
}

export function selectionFromParams(params: URLSearchParams): FilterSelection {
  // Outer filters first, so the inner ones are checked against them.
  const order: FilterId[] = ["location", "group", "property", "department", "experience", "type"];
  return order.reduce((selection, id) => withFilter(selection, id, params.get(id)), EMPTY_SELECTION);
}
