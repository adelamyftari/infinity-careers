/**
 * The positions page's search: a keyword, the homepage's filters (each taking
 * several values), availability and the order. Across filters a role must
 * match every one (AND); within a filter any chosen value will do (OR); an
 * empty filter means "All". It lives in the URL, so a search can be shared,
 * survives a reload, and moves with Back and Forward:
 *
 *   /roles?q=chef&location=tirana&careerGroup=restaurant&careerGroup=casino&availability=open&page=2
 *
 * The homepage's Search Jobs and the property cards link the same way (see URL below).
 *
 * Linked filters: Location narrows Property, Career Group narrows Department;
 * an inner choice the outer ones no longer allow is dropped.
 */

import { BUSINESS_TYPE_LABEL, CITIES, getCareersProperty, isPropertyId, propertiesIn, type City, type PropertyId } from "./properties";
import type { FilterSelection } from "./filters";
import type { RoleEntry } from "./roles";
import {
  CAREER_GROUP_LABEL,
  CAREER_GROUPS,
  departmentsFor,
  EMPLOYMENT_TYPES,
  getDepartment,
  EXPERIENCE_FILTERS,
  experienceFilterFor,
  isDepartmentId,
  type CareerGroup,
  type DepartmentId,
  type EmploymentType,
  type ExperienceFilter,
} from "./taxonomy";

/** The headquarters, named as the site names it (the homepage search's label is "Headquarters (Administration)"). */
const HQ = "infinity-hq";
const HQ_LABEL = "Infinity Headquarters";

export type MultiFilterId = "location" | "property" | "group" | "department" | "experience" | "type";
export type Availability = "all" | "open";
export type SortId = "relevant" | "az" | "recent";

export type RolesQuery = {
  q: string;
  location: City[];
  property: PropertyId[];
  group: CareerGroup[];
  department: DepartmentId[];
  experience: ExperienceFilter[];
  type: EmploymentType[];
  availability: Availability;
  sort: SortId;
};

export const EMPTY_QUERY: RolesQuery = {
  q: "",
  location: [],
  property: [],
  group: [],
  department: [],
  experience: [],
  type: [],
  availability: "all",
  sort: "relevant",
};

/** The keyword's limit: enough for any title, short enough for a URL. */
export const KEYWORD_MAX = 80;

export type RolesFilter = { id: MultiFilterId; label: string; anyLabel: string; primary: boolean };

export const ROLES_FILTERS: readonly RolesFilter[] = [
  { id: "location", label: "Location", anyLabel: "All Locations", primary: true },
  { id: "property", label: "Property", anyLabel: "All Properties", primary: true },
  { id: "group", label: "Career Group", anyLabel: "All Groups", primary: true },
  { id: "experience", label: "Experience", anyLabel: "Any Experience", primary: false },
  { id: "type", label: "Employment Type", anyLabel: "All Types", primary: false },
  { id: "department", label: "Department", anyLabel: "All Departments", primary: false },
];

export const AVAILABILITY_LABEL: Record<Availability, string> = { all: "All Roles", open: "Open Positions" };

export const SORT_OPTIONS: readonly { value: SortId; label: string }[] = [
  { value: "relevant", label: "Relevant" },
  { value: "az", label: "Alphabetical A–Z" },
  { value: "recent", label: "Recently Published" },
];

export type FilterOption = { value: string; label: string; group?: string };

/** What a filter offers, given the rest of the query. */
export function rolesFilterOptions(id: MultiFilterId, query: RolesQuery): FilterOption[] {
  switch (id) {
    case "location":
      return CITIES.map((city) => ({ value: city, label: city }));
    case "property":
      return (query.location.length ? query.location.flatMap((city) => propertiesIn(city)) : propertiesIn(null))
        .sort((a, b) => propertiesIn(null).indexOf(a) - propertiesIn(null).indexOf(b))
        .map((p) => ({ value: p.id, label: p.id === HQ ? HQ_LABEL : p.name, group: BUSINESS_TYPE_LABEL[p.businessType] }));
    case "group":
      return CAREER_GROUPS.map((group) => ({ value: group, label: CAREER_GROUP_LABEL[group] }));
    case "department": {
      const departments = query.group.length ? query.group.flatMap((group) => departmentsFor(group)) : departmentsFor(null);
      return [...new Map(departments.map((d) => [d.id, d])).values()].map((d) => ({ value: d.id, label: d.name }));
    }
    case "experience":
      return EXPERIENCE_FILTERS.map((value) => ({ value, label: value }));
    case "type":
      return EMPLOYMENT_TYPES.map((type) => ({ value: type, label: type }));
  }
}

/** A chosen value's readable name. */
export function rolesValueLabel(id: MultiFilterId, value: string): string {
  if (id === "property" && isPropertyId(value)) return value === HQ ? HQ_LABEL : getCareersProperty(value).name;
  if (id === "group") return CAREER_GROUP_LABEL[value as CareerGroup] ?? value;
  if (id === "department" && isDepartmentId(value)) return getDepartment(value).name;
  return value;
}

const isCity = (v: string): v is City => (CITIES as readonly string[]).includes(v);
const isGroup = (v: string): v is CareerGroup => (CAREER_GROUPS as readonly string[]).includes(v);
const isExperience = (v: string): v is ExperienceFilter => (EXPERIENCE_FILTERS as readonly string[]).includes(v);
const isType = (v: string): v is EmploymentType => (EMPLOYMENT_TYPES as readonly string[]).includes(v);

const known = <T extends string>(values: readonly string[], guard: (v: string) => v is T): T[] => [...new Set(values.filter(guard))];

/** Drops what the outer filters no longer allow, and anything unknown. */
export function normalizeQuery(query: RolesQuery): RolesQuery {
  const property = query.property.filter((id) => !query.location.length || query.location.includes(getCareersProperty(id).city));
  const department = query.department.filter(
    (id) => !query.group.length || query.group.some((group) => (getDepartment(id).groups as readonly CareerGroup[]).includes(group)),
  );
  return { ...query, q: query.q.slice(0, KEYWORD_MAX), property, department };
}

/** The query with one filter's values replaced (from a menu, a chip, a link). */
export function withValues(query: RolesQuery, id: MultiFilterId, raw: readonly string[]): RolesQuery {
  const next = { ...query };
  switch (id) {
    case "location":
      next.location = known(raw, isCity);
      break;
    case "property":
      next.property = known(raw, isPropertyId);
      break;
    case "group":
      next.group = known(raw, isGroup);
      break;
    case "department":
      next.department = known(raw, isDepartmentId);
      break;
    case "experience":
      next.experience = known(raw, isExperience);
      break;
    case "type":
      next.type = known(raw, isType);
      break;
  }
  return normalizeQuery(next);
}

export function activeCount(query: RolesQuery, ids: readonly MultiFilterId[] = ROLES_FILTERS.map((f) => f.id)) {
  return ids.reduce((n, id) => n + query[id].length, 0) + (ids.length === ROLES_FILTERS.length ? (query.q.trim() ? 1 : 0) + (query.availability === "open" ? 1 : 0) : 0);
}

/* ---------------------------------------------------------------- matching */

/** Lower case, without accents, so "durres" finds Durrës and "cafe" Café. */
export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function haystack(entry: RoleEntry) {
  return fold(
    [
      entry.title,
      ...entry.aliases,
      getDepartment(entry.departmentId).name,
      CAREER_GROUP_LABEL[entry.careerGroup],
      ...entry.propertyIds.map((id) => getCareersProperty(id).name),
      ...entry.cities,
    ].join(" · "),
  );
}

/** How well a role answers the keyword: 0 is not at all. */
export function keywordScore(entry: RoleEntry, q: string): number {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const title = fold(entry.title);
  const aliases = entry.aliases.map(fold);
  const all = haystack(entry);
  if (!words.every((word) => all.includes(word))) return 0;
  const phrase = words.join(" ");
  if (title === phrase) return 5;
  if (title.startsWith(phrase)) return 4;
  if (title.includes(phrase) || aliases.some((a) => a.includes(phrase))) return 3;
  if (words.every((word) => title.includes(word))) return 2;
  return 1;
}

function someOf<T>(chosen: readonly T[], has: readonly (T | null)[]) {
  return chosen.length === 0 || chosen.some((value) => has.includes(value));
}

/**
 * Where it is, the experience it is open to and its contract type are matched
 * within one offering: Full-time and Without Experience find a position only if
 * one of its offerings is both (not a full-time Senior and a part-time Entry
 * Level). A career role has no offering, so it matches no experience or contract type.
 */
function offeredAsAsked(entry: RoleEntry, query: RolesQuery) {
  if (entry.kind === "role") return someOf(query.location, entry.cities) && someOf(query.property, entry.propertyIds) && query.experience.length === 0 && query.type.length === 0;
  return entry.offerings.some(
    (o) => someOf(query.location, [o.city]) && someOf(query.property, [o.propertyId]) && someOf(query.experience, [experienceFilterFor(o.level)]) && someOf(query.type, [o.employmentType]),
  );
}

export function matchesQuery(entry: RoleEntry, query: RolesQuery) {
  return (
    (query.availability === "all" || entry.kind === "vacancy") &&
    someOf(query.group, [entry.careerGroup]) &&
    someOf(query.department, [entry.departmentId]) &&
    offeredAsAsked(entry, query) &&
    keywordScore(entry, query.q) > 0
  );
}

/** "Recently Published" orders only real listings with a publication date; it is offered only when there are some. */
export const canSortByDate = (entries: readonly RoleEntry[]) => entries.some((entry) => entry.kind === "vacancy" && entry.publishedAt);

/** The matching roles, in the chosen order. */
export function searchRoles(entries: readonly RoleEntry[], query: RolesQuery): RoleEntry[] {
  const found = entries.filter((entry) => matchesQuery(entry, query));
  const sort = query.sort === "recent" && !canSortByDate(found) ? "relevant" : query.sort;
  const byOrder = (a: RoleEntry, b: RoleEntry) => a.order - b.order;
  if (sort === "az") return found.sort((a, b) => a.title.localeCompare(b.title, "en") || byOrder(a, b));
  if (sort === "recent")
    return found.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || byOrder(a, b));
  return found.sort((a, b) => keywordScore(b, query.q) - keywordScore(a, query.q) || byOrder(a, b));
}

/* ------------------------------------------------------------------- URL */

/**
 * One URL convention for the whole site: lower-case keys and values, so a link
 * reads the same from the homepage search, a property card or a shared address.
 *
 *   /roles?location=tirana&property=arena-casino&careerGroup=casino
 *   /roles?location=tirana&careerGroup=restaurant&experience=with-experience&employmentType=full-time&page=2
 *
 * Older forms still read: ?group=…, ?type=…, and the values as the menus name
 * them (?location=Durrës), and the experience levels the filter offered before
 * (?experience=entry-level reads as Without Experience, intermediate or senior as With).
 */
const URL_KEY: Record<MultiFilterId, string> = {
  location: "location",
  property: "property",
  group: "careerGroup",
  department: "department",
  experience: "experience",
  type: "employmentType",
};
const LEGACY_KEY: Partial<Record<MultiFilterId, string>> = { group: "group", type: "type" };
/** Experience values from older links, as the URL writes them. */
const LEGACY_EXPERIENCE: Record<string, string> = { "entry-level": "without-experience", intermediate: "with-experience", senior: "with-experience" };
/** Outer filters first, so the inner ones are checked against them. */
const LIST_PARAMS: MultiFilterId[] = ["location", "group", "property", "department", "experience", "type"];
/** Every key the page owns in the URL: replaced as a whole when the search is written. */
const OWNED_KEYS = ["q", ...Object.values(URL_KEY), "group", "type", "availability", "sort", "page"];

/** A value as the URL writes it: "Durrës" → durres, "Entry Level" → entry-level. */
export const urlValue = (value: string) =>
  fold(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Every value a filter can take, as the page holds it. */
const ALL_VALUES: Record<MultiFilterId, readonly string[]> = {
  location: CITIES,
  property: propertiesIn(null).map((p) => p.id),
  group: CAREER_GROUPS,
  department: departmentsFor(null).map((d) => d.id),
  experience: EXPERIENCE_FILTERS,
  type: EMPLOYMENT_TYPES,
};

/** Repeated keys (?careerGroup=casino&careerGroup=hotel) and comma lists both read, each matched to a known value. */
function values(params: URLSearchParams, id: MultiFilterId): string[] {
  const legacy = LEGACY_KEY[id];
  const keys = legacy ? [URL_KEY[id], legacy] : [URL_KEY[id]];
  const raw = keys
    .flatMap((key) => params.getAll(key))
    .flatMap((v) => v.split(","))
    .map(urlValue)
    .map((v) => (id === "experience" ? (LEGACY_EXPERIENCE[v] ?? v) : v))
    .filter(Boolean);
  return ALL_VALUES[id].filter((value) => raw.includes(urlValue(value)));
}

/** The page asked for: a whole number from 1; anything else is page 1. */
export function pageFromParams(params: URLSearchParams): number {
  const page = Number(params.get("page"));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function queryFromParams(params: URLSearchParams): RolesQuery {
  let query: RolesQuery = { ...EMPTY_QUERY, q: (params.get("q") ?? "").slice(0, KEYWORD_MAX) };
  for (const id of LIST_PARAMS) query = withValues(query, id, values(params, id));
  const availability = params.get("availability");
  const sort = params.get("sort");
  return {
    ...query,
    availability: availability === "open" ? "open" : "all",
    sort: sort === "az" || sort === "recent" ? sort : "relevant",
  };
}

/** The query (and, when given, the page) as URL parameters; others, like `role`, are kept as they are. */
export function queryToParams(query: RolesQuery, params = new URLSearchParams(), page?: number) {
  for (const key of OWNED_KEYS) params.delete(key);
  for (const id of LIST_PARAMS) for (const value of query[id]) params.append(URL_KEY[id], urlValue(value));
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.availability === "open") params.set("availability", "open");
  if (query.sort !== "relevant") params.set("sort", query.sort);
  if (page !== undefined) params.set("page", String(page));
  return params;
}

/** The positions page for a search, on its first page: what the homepage's Search Jobs opens. */
export function rolesHref(query: RolesQuery) {
  const params = queryToParams(query);
  return params.size ? `/roles?${params}` : "/roles";
}

/* ------------------------------------------------------------- pagination */

/** Cards per page, the same on every screen, so a page in the URL means the same cards everywhere. */
export const PAGE_SIZE = 9;

export const pageCount = (results: number) => Math.max(1, Math.ceil(results / PAGE_SIZE));

/**
 * The numbered controls: the first and last pages, the current one with
 * `siblings` either side, and an ellipsis for each gap. Near either end the
 * run widens so the count stays steady: 1 2 3 4 5 … 13, 1 … 5 6 7 … 13.
 */
export function pageItems(current: number, total: number, siblings = 1): (number | "gap")[] {
  const width = siblings * 2 + 5;
  if (total <= width) return Array.from({ length: total }, (_, i) => i + 1);
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const run = siblings * 2 + 3;
  if (left <= 3) return [...Array.from({ length: run }, (_, i) => i + 1), "gap", total];
  if (right >= total - 2) return [1, "gap", ...Array.from({ length: run }, (_, i) => total - run + 1 + i)];
  return [1, "gap", ...Array.from({ length: right - left + 1 }, (_, i) => left + i), "gap", total];
}

export const ROLE_PARAM = "role";

/** A role's card on the positions page. */
export const roleHref = (id: string) => `/roles?${ROLE_PARAM}=${encodeURIComponent(id)}`;

/** The homepage search's choices (one value per filter) as a positions-page query. */
export function queryFromSelection(selection: FilterSelection): RolesQuery {
  return LIST_PARAMS.reduce((query, id) => {
    const value = selection[id];
    return value === null ? query : withValues(query, id, [value]);
  }, EMPTY_QUERY);
}
