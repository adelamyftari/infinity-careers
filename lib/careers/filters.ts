import { CATEGORIES, EXPERIENCE_LEVELS, type Job } from "./jobs";

export type FilterId = "location" | "property" | "group" | "department" | "experience" | "type";

export type JobFilter = {
  id: FilterId;
  label: string;
  /** Shown when nothing is selected. */
  anyLabel: string;
  /** Primary filters are always visible; the rest live behind "More filters". */
  primary: boolean;
  value: (job: Job) => string;
};

export const JOB_FILTERS: JobFilter[] = [
  { id: "location", label: "Location", anyLabel: "All locations", primary: true, value: (job) => job.location },
  { id: "property", label: "Property", anyLabel: "All properties", primary: true, value: (job) => job.property },
  { id: "group", label: "Career group", anyLabel: "All groups", primary: true, value: (job) => CATEGORIES[job.category].group },
  { id: "department", label: "Department", anyLabel: "Any department", primary: false, value: (job) => job.department },
  { id: "experience", label: "Experience", anyLabel: "Any level", primary: false, value: (job) => job.experience },
  { id: "type", label: "Job type", anyLabel: "Any type", primary: false, value: (job) => job.type },
];

/** `null` means "any". */
export type FilterSelection = Record<FilterId, string | null>;

export const EMPTY_SELECTION: FilterSelection = {
  location: null,
  property: null,
  group: null,
  department: null,
  experience: null,
  type: null,
};

/** Every value that occurs in the data; experience keeps its natural order. */
export function filterOptions(filter: JobFilter, jobs: Job[]) {
  const values = [...new Set(jobs.map(filter.value))];
  if (filter.id === "experience") return EXPERIENCE_LEVELS.filter((level) => values.includes(level));
  return values.sort((a, b) => a.localeCompare(b));
}

export function matchesSelection(job: Job, selection: FilterSelection) {
  return JOB_FILTERS.every((filter) => {
    const selected = selection[filter.id];
    return selected === null || filter.value(job) === selected;
  });
}
