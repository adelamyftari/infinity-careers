"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EMPTY_SELECTION, matchesSelection, type FilterSelection } from "@/lib/careers/filters";
import { onPropertyFilterRequest } from "@/lib/careers/property-filter";
import type { Job } from "@/lib/careers/jobs";
import { prefersReducedMotion } from "@/lib/motion";
import { JobCarousel } from "./JobCarousel";
import { JobSearch } from "./JobSearch";

/** Owns the filter state shared by the search and the carousel it narrows. */
export function HeroExplorer({ jobs, handoff }: { jobs: Job[]; handoff?: ReactNode }) {
  const [selection, setSelection] = useState<FilterSelection>(EMPTY_SELECTION);
  const matches = useMemo(() => jobs.filter((job) => matchesSelection(job, selection)), [jobs, selection]);
  const carousel = useRef<HTMLElement>(null);

  function showResults() {
    carousel.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    carousel.current?.focus({ preventScroll: true });
  }

  // "Explore opportunities" elsewhere on the page: show that property's roles.
  useEffect(
    () =>
      onPropertyFilterRequest((property) => {
        setSelection({ ...EMPTY_SELECTION, property });
        carousel.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
        carousel.current?.focus({ preventScroll: true });
      }),
    [],
  );

  return (
    <>
      <div className="relative z-20 px-(--gutter)">
        <div data-enter="float" className="lg:ml-[26%] xl:mr-[4%]">
          <JobSearch jobs={jobs} selection={selection} onChange={setSelection} resultCount={matches.length} onSearch={showResults} />
        </div>
      </div>

      <JobCarousel ref={carousel} jobs={matches} onClear={() => setSelection(EMPTY_SELECTION)} handoff={handoff} />
    </>
  );
}
