import type { FilterId } from "@/lib/careers/filters";

/** Line icons on a 24 grid at a 1.4 stroke. */
const PATHS: Record<FilterId, string> = {
  location: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  property: "M4.5 21V4.5h9V21m0-11h6V21M3 21h18M7.5 8h3m-3 3.5h3m-3 3.5h3m5.5-1.5h1m-1 3h1",
  group: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0-1-5.8M17 14.2a5 5 0 0 1 4 4.8",
  department: "m12 3.5 8.5 4.25L12 12 3.5 7.75 12 3.5Zm-8.5 8.25L12 16l8.5-4.25M3.5 15.75 12 20l8.5-4.25",
  experience: "M5 20v-5m5 5V10m5 10V6m5 14V3",
  type: "M3.5 8h17v12h-17zM8.5 8V5.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V8m-12 5h17",
};

export function FilterIcon({ id }: { id: FilterId }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]">
      <path d={PATHS[id]} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
