"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EMPTY_SELECTION, selectionFromParams, type FilterSelection } from "@/lib/careers/filters";
import { carouselRoles, openJobs, ROLE_PREVIEWS, type Job } from "@/lib/careers/jobs";
import { ROLE_ENTRIES } from "@/lib/careers/roles";
import { queryFromSelection, rolesHref, searchRoles } from "@/lib/careers/roles-search";
import { HeroField } from "./HeroField";
import { JobCarousel } from "./JobCarousel";
import { JobSearch } from "./JobSearch";

/** Open vacancies matching a search, counted by the positions page's own search (one implementation for both pages). */
const openMatches = (selection: FilterSelection) => searchRoles(ROLE_ENTRIES, { ...queryFromSelection(selection), availability: "open" }).length;

/**
 * The hero's search and the carousel below it, independent of each other.
 * The search is a form: its choices are held here until Search Jobs takes them
 * to the positions page (/roles?location=tirana&careerGroup=casino), and its
 * count is the published vacancies that match. The carousel always shows its
 * whole collection and keeps its own navigation; the search never narrows,
 * reorders or moves it.
 */
export function HeroExplorer({ jobs, heading, handoff }: { jobs: Job[]; heading: ReactNode; handoff?: ReactNode }) {
  const [selection, setSelection] = useState<FilterSelection>(EMPTY_SELECTION);
  // Built once: the carousel's set does not depend on the search.
  const roles = useMemo(() => carouselRoles(openJobs(jobs), ROLE_PREVIEWS), [jobs]);
  const resultCount = useMemo(() => openMatches(selection), [selection]);
  const totalCount = useMemo(() => openMatches(EMPTY_SELECTION), []);
  const carousel = useRef<HTMLElement>(null);
  const router = useRouter();

  // Search Jobs (and Apply Filters): the positions page, with these filters, on its first page.
  function search() {
    router.push(rolesHref(queryFromSelection(selection)));
  }

  // An older shared link (/?location=Tirana&group=casino) fills the form in; it changes nothing else.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.size === 0) return;
    const shared = selectionFromParams(params);
    queueMicrotask(() => setSelection(shared));
  }, []);

  return (
    <>
      <div className="relative -mb-[calc(2.5rem-var(--hero-cards-space))]">
        <HeroField />
        <div className="relative px-(--gutter) pb-[calc(clamp(1.5rem,3.6vh,2.5rem)+var(--hero-search-space))] pt-[calc(clamp(0.5rem,1.6vh,1.25rem)+var(--hero-title-space))] lg:pt-[calc(clamp(2.5rem,5vh,3.5rem)+var(--hero-title-space))]">{heading}</div>
        <div className="relative z-20 px-(--gutter)">
          <div data-enter="float" className="xl:ml-[16%]">
            <JobSearch selection={selection} onChange={setSelection} resultCount={resultCount} totalCount={totalCount} onSearch={search} />
          </div>
        </div>
      </div>

      <JobCarousel ref={carousel} roles={roles} onClear={() => setSelection(EMPTY_SELECTION)} handoff={handoff} />
    </>
  );
}
