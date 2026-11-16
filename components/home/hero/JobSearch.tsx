"use client";

import { useState, type FormEvent } from "react";
import { button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/Dropdown";
import {
  activeFilterCount,
  EMPTY_SELECTION,
  filterOptions,
  JOB_FILTERS,
  MORE_FILTERS,
  PRIMARY_FILTERS,
  valueLabel,
  withFilter,
  type FilterSelection,
  type JobFilter,
} from "@/lib/careers/filters";

type JobSearchProps = {
  selection: FilterSelection;
  onChange: (selection: FilterSelection) => void;
  /** Published listings matching the selection. */
  resultCount: number;
  /** All published listings. */
  totalCount: number;
  /** "Search jobs" (and "Apply filters" in the fold): takes the visitor to the matching roles. */
  onSearch: () => void;
};

/**
 * The floating search: a form whose choices Search jobs takes to the positions
 * page (it never filters the carousel below). Location
 * narrows Property and Career Group narrows Department. The advanced ones fold
 * away behind "More filters", with the active filters as removable chips.
 */
export function JobSearch({ selection, onChange, resultCount, totalCount, onSearch }: JobSearchProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  // The fold clips while it animates, then lets its menus overflow.
  const [moreSettled, setMoreSettled] = useState(false);

  const activeMore = activeFilterCount(selection, MORE_FILTERS);
  const activeAll = activeFilterCount(selection);
  const chips = JOB_FILTERS.flatMap((filter) => {
    const label = valueLabel(filter.id, selection);
    return label === null ? [] : [{ filter, label }];
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  function toggleMore() {
    setMoreSettled(false);
    setMoreOpen((open) => !open);
  }

  function apply() {
    setMoreSettled(false);
    setMoreOpen(false);
    onSearch();
  }

  const dropdown = (filter: JobFilter) => (
    <Dropdown
      key={filter.id}
      id={`filter-${filter.id}`}
      label={filter.label}
      anyLabel={filter.anyLabel}
      options={filterOptions(filter.id, selection)}
      value={selection[filter.id]}
      onChange={(value) => onChange(withFilter(selection, filter.id, value))}
      className="min-w-0 flex-1"
    />
  );

  const status =
    resultCount === 0
      ? "No open positions match these filters yet."
      : resultCount === totalCount
        ? ""
        : `${resultCount} of ${totalCount} open positions match`;

  return (
    <div className="relative">
      <form
        role="search"
        aria-label="Search jobs"
        onSubmit={onSubmit}
        className="relative rounded-[14px] bg-neutral p-2 shadow-[0_36px_70px_-44px_rgb(0_0_0/0.6)] lg:p-1.5"
      >
        <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-0">
          {PRIMARY_FILTERS.map((filter, i) => (
            <div key={filter.id} className="flex min-w-0 items-center lg:flex-1">
              {i > 0 && <span aria-hidden="true" className="mx-1 hidden h-8 w-px shrink-0 bg-line lg:block" />}
              {dropdown(filter)}
            </div>
          ))}

          <span aria-hidden="true" className="mx-1 hidden h-8 w-px shrink-0 bg-line lg:block" />
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="more-filters"
            onClick={toggleMore}
            className={`group ${button.tertiary} justify-between lg:justify-start`}
          >
            <span className="flex items-center gap-2">
              More filters
              {activeMore > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-label font-medium tabular-nums text-neutral">
                  {activeMore}
                  <span className="sr-only"> active</span>
                </span>
              )}
            </span>
            <span aria-hidden="true" className="relative size-3.5 transition-transform duration-300 ease-premium group-aria-expanded:rotate-45">
              <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-current" />
              <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 rounded-full bg-current" />
            </span>
          </button>

          <button type="submit" className={`group ${button.search} mt-2 justify-between lg:ml-3 lg:mt-0 lg:shrink-0`}>
            <span className="flex items-baseline gap-2">
              Search jobs
              <span className="font-medium tabular-nums opacity-75 group-hover:opacity-100">
                {resultCount}
                <span className="sr-only"> open {resultCount === 1 ? "position" : "positions"}</span>
              </span>
            </span>
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 transition-transform duration-[220ms] ease-out group-hover:translate-x-0.5">
              <path d="M3 8h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div
          id="more-filters"
          role="group"
          aria-label="More filters"
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && moreOpen) setMoreSettled(true);
          }}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-premium ${
            moreOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          inert={!moreOpen}
        >
          <div className={moreOpen && moreSettled ? "overflow-visible" : "overflow-hidden"}>
            <div className="mt-2 grid gap-1 border-t border-line pt-2 lg:grid-cols-3">{MORE_FILTERS.map(dropdown)}</div>

            <div className="mt-2 flex flex-col gap-3 border-t border-line px-2 pb-1 pt-3 lg:flex-row lg:items-center lg:justify-between">
              <ul aria-label="Active filters" className="flex min-h-8 flex-wrap items-center gap-1.5">
                {chips.length === 0 ? (
                  <li className="text-small text-muted">No filters applied</li>
                ) : (
                  chips.map(({ filter, label }) => (
                    <li key={filter.id}>
                      <button
                        type="button"
                        onClick={() => onChange(withFilter(selection, filter.id, null))}
                        aria-label={`Remove filter ${filter.label}: ${label}`}
                        className="group/chip flex h-8 cursor-pointer items-center gap-2 rounded-full bg-primary/[0.07] pl-3 pr-2 text-small text-primary transition-colors duration-[220ms] ease-out hover:bg-accent"
                      >
                        <span className="text-muted group-hover/chip:text-primary">{filter.label}</span>
                        <span className="font-medium">{label}</span>
                        <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
                          <path d="m3 3 6 6M9 3 3 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="flex shrink-0 items-center justify-between gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => onChange(EMPTY_SELECTION)}
                  disabled={activeAll === 0}
                  className={`${button.tertiary}`}
                >
                  Clear All Filters
                  {activeAll > 0 && <span className="tabular-nums text-muted">({activeAll})</span>}
                </button>
                <button type="button" onClick={apply} className={`${button.primary}`}>
                  Apply Filters
                  <span className="tabular-nums opacity-75">{resultCount}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <div className="absolute inset-x-0 top-full mt-2 flex min-h-5 items-center justify-between gap-4 px-1 text-small text-neutral/85">
        <p aria-live="polite">{status}</p>
        <button
          type="button"
          onClick={() => onChange(EMPTY_SELECTION)}
          className={`shrink-0 cursor-pointer py-1 underline-offset-4 transition-opacity duration-[220ms] hover:text-neutral hover:underline ${
            activeAll > 0 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          tabIndex={activeAll > 0 ? 0 : -1}
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}
