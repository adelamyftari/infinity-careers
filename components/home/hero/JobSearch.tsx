"use client";

import { useState, type FormEvent } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { EMPTY_SELECTION, filterOptions, JOB_FILTERS, type FilterSelection } from "@/lib/careers/filters";
import type { Job } from "@/lib/careers/jobs";
import { useMagnetic } from "@/lib/hooks/use-magnetic";
import { FilterIcon } from "./FilterIcon";

type JobSearchProps = {
  jobs: Job[];
  selection: FilterSelection;
  onChange: (selection: FilterSelection) => void;
  resultCount: number;
  /** "Search jobs": takes the visitor to the matching roles. */
  onSearch: () => void;
};

const PRIMARY = JOB_FILTERS.filter((filter) => filter.primary);
const MORE = JOB_FILTERS.filter((filter) => !filter.primary);

/**
 * The floating search. Filters apply live to the carousel below; the three
 * secondary ones fold away behind "More filters".
 */
export function JobSearch({ jobs, selection, onChange, resultCount, onSearch }: JobSearchProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  // The fold clips while it animates, then lets its menus overflow.
  const [moreSettled, setMoreSettled] = useState(false);
  const searchButton = useMagnetic<HTMLButtonElement>(0.22);

  const activeMore = MORE.filter((filter) => selection[filter.id] !== null).length;
  const anyActive = JOB_FILTERS.some((filter) => selection[filter.id] !== null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  function toggleMore() {
    setMoreSettled(false);
    setMoreOpen((open) => !open);
  }

  const dropdown = (filter: (typeof JOB_FILTERS)[number]) => (
    <Dropdown
      key={filter.id}
      id={`filter-${filter.id}`}
      label={filter.label}
      anyLabel={filter.anyLabel}
      options={filterOptions(filter, jobs)}
      value={selection[filter.id]}
      onChange={(value) => onChange({ ...selection, [filter.id]: value })}
      icon={<FilterIcon id={filter.id} />}
      className="min-w-0 flex-1"
    />
  );

  return (
    <div>
      <form
        role="search"
        aria-label="Search jobs"
        onSubmit={onSubmit}
        className="relative rounded-[30px] bg-white/95 p-2 shadow-[0_0_0_1px_var(--line),0_2px_4px_rgb(20_21_24/0.03),0_40px_80px_-40px_rgb(20_21_24/0.32)] backdrop-blur-xl"
      >
        <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-0">
          {PRIMARY.map((filter, i) => (
            <div key={filter.id} className="flex min-w-0 items-center lg:flex-1">
              {i > 0 && <span aria-hidden="true" className="mx-1 hidden h-10 w-px shrink-0 bg-line lg:block" />}
              {dropdown(filter)}
            </div>
          ))}

          <span aria-hidden="true" className="mx-1 hidden h-10 w-px shrink-0 bg-line lg:block" />
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="more-filters"
            onClick={toggleMore}
            className="group flex items-center justify-between gap-3 rounded-[20px] px-5 py-4 text-sm font-medium text-foreground outline-none transition-colors duration-300 hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-gold/70 lg:justify-start"
          >
            <span className="flex items-center gap-2.5">
              More filters
              {activeMore > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">{activeMore}</span>
              )}
            </span>
            <span aria-hidden="true" className="relative size-3.5 transition-transform duration-500 ease-premium group-aria-expanded:rotate-45">
              <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-current" />
              <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 rounded-full bg-current" />
            </span>
          </button>

          <button
            ref={searchButton}
            type="submit"
            className="group mt-1 flex h-16 items-center justify-between gap-6 rounded-[22px] bg-gold pl-7 pr-2 lg:max-xl:gap-4 lg:max-xl:pl-5 text-[15px] font-semibold text-ink shadow-[0_14px_30px_-14px_rgb(209_140_11/0.8)] outline-none transition-[background-color,box-shadow] duration-500 hover:bg-[#ffb935] focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 lg:ml-2 lg:mt-0 lg:shrink-0"
          >
            <span className="flex items-baseline gap-2">
              Search jobs
              <span className="font-mono text-xs font-medium tabular-nums text-ink/60 lg:max-xl:hidden">({resultCount})</span>
            </span>
            <span className="flex size-12 items-center justify-center overflow-hidden rounded-[16px] bg-ink text-gold">
              <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 transition-transform duration-500 ease-premium group-hover:translate-x-[3px]">
                <path d="M3 8h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </div>

        <div
          id="more-filters"
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && moreOpen) setMoreSettled(true);
          }}
          className={`grid transition-[grid-template-rows,opacity] duration-700 ease-premium ${
            moreOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          inert={!moreOpen}
        >
          <div className={moreOpen && moreSettled ? "overflow-visible" : "overflow-hidden"}>
            <div className="mt-2 grid gap-1 border-t border-line pt-2 lg:grid-cols-3">{MORE.map(dropdown)}</div>
          </div>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-between px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        <p aria-live="polite">
          {resultCount === jobs.length ? "" : `${resultCount} of ${jobs.length} roles match`}
        </p>
        <button
          type="button"
          onClick={() => onChange(EMPTY_SELECTION)}
          className={`uppercase underline-offset-4 transition-opacity duration-300 hover:text-foreground hover:underline ${
            anyActive ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          tabIndex={anyActive ? 0 : -1}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
