"use client";

import { useState, type FormEvent } from "react";
import { button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/Dropdown";
import {
  activeCount,
  AVAILABILITY_LABEL,
  EMPTY_QUERY,
  KEYWORD_MAX,
  ROLES_FILTERS,
  rolesFilterOptions,
  rolesValueLabel,
  withValues,
  type Availability,
  type RolesFilter,
  type RolesQuery,
} from "@/lib/careers/roles-search";

type RolesSearchProps = {
  query: RolesQuery;
  /** `replace` while typing (one history entry per search, not per letter). */
  onQuery: (query: RolesQuery, mode?: "push" | "replace") => void;
  resultCount: number;
  onShowResults: () => void;
};

const PRIMARY = ROLES_FILTERS.filter((f) => f.primary);
const MORE = ROLES_FILTERS.filter((f) => !f.primary);

/**
 * The positions page's search, in the homepage search's visual system: the
 * keyword and the three main filters in the bar, the rest behind "More
 * filters", every active choice as a removable chip. Each filter takes several
 * values; results update as the visitor chooses.
 */
export function RolesSearch({ query, onQuery, resultCount, onShowResults }: RolesSearchProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  // The fold clips while it animates, then lets its menus overflow.
  const [moreSettled, setMoreSettled] = useState(false);

  const activeMore = activeCount(query, MORE.map((f) => f.id)) + (query.availability === "open" ? 1 : 0);
  const activeAll = activeCount(query);
  const chips = [
    ...(query.q.trim() ? [{ key: "q", label: "Keyword", value: `“${query.q.trim()}”`, remove: () => ({ ...query, q: "" }) }] : []),
    ...ROLES_FILTERS.flatMap((filter) =>
      query[filter.id].map((value) => ({
        key: `${filter.id}:${value}`,
        label: filter.label,
        value: rolesValueLabel(filter.id, value),
        remove: () => withValues(query, filter.id, (query[filter.id] as readonly string[]).filter((v) => v !== value)),
      })),
    ),
    ...(query.availability === "open" ? [{ key: "availability", label: "Availability", value: "Open Positions", remove: () => ({ ...query, availability: "all" as const }) }] : []),
  ];

  const dropdown = (filter: RolesFilter) => (
    <Dropdown
      key={filter.id}
      id={`roles-filter-${filter.id}`}
      multiple
      label={filter.label}
      anyLabel={filter.anyLabel}
      options={rolesFilterOptions(filter.id, query)}
      value={query[filter.id]}
      onChange={(values) => onQuery(withValues(query, filter.id, values))}
      className="min-w-0 flex-1"
    />
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMoreOpen(false);
    onShowResults();
  }

  return (
    <div>
      <form role="search" aria-label="Search positions" onSubmit={onSubmit} className="relative rounded-[14px] bg-white p-2 text-primary shadow-[0_0_0_1px_var(--line),0_30px_60px_-40px_rgb(16_47_50/0.45)] xl:py-1.5 xl:pl-1.5">
        <div className="grid gap-1 md:grid-cols-2 xl:flex xl:items-center xl:gap-0">
          {/* The keyword: titles, other names, departments, properties and cities. */}
          <label className="group flex min-w-0 cursor-text items-center gap-3 rounded-inner px-4 py-2 transition-colors duration-[220ms] ease-out focus-within:bg-primary/[0.06] hover:bg-primary/[0.06] md:col-span-2 xl:flex-[1.4]">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0 text-muted">
              <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.5 10.5 3.25 3.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block text-label text-muted">Search by job title or keyword</span>
              <input
                type="search"
                value={query.q}
                maxLength={KEYWORD_MAX}
                onChange={(event) => onQuery({ ...query, q: event.target.value }, "replace")}
                placeholder="Dealer, chef, finance…"
                enterKeyHint="search"
                autoComplete="off"
                className="mt-0.5 block w-full bg-transparent text-button font-medium text-primary outline-none placeholder:font-normal placeholder:text-muted/70 [&::-webkit-search-cancel-button]:hidden"
              />
            </span>
            {query.q && (
              <button
                type="button"
                onClick={() => onQuery({ ...query, q: "" })}
                aria-label="Clear the keyword"
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-primary/10 hover:text-primary"
              >
                <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
                  <path d="m3 3 6 6M9 3 3 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </label>

          {PRIMARY.map((filter) => (
            <div key={filter.id} className="flex min-w-0 items-center xl:flex-1">
              <span aria-hidden="true" className="mx-1 hidden h-8 w-px shrink-0 bg-line xl:block" />
              {dropdown(filter)}
            </div>
          ))}

          <div className="flex min-w-0 items-center">
            <span aria-hidden="true" className="mx-1 hidden h-8 w-px shrink-0 bg-line xl:block" />
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="roles-more-filters"
              onClick={() => {
                setMoreSettled(false);
                setMoreOpen((open) => !open);
              }}
              className={`group ${button.tertiary} w-full justify-between xl:w-auto xl:justify-start`}
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
          </div>

          <button type="submit" className={`group ${button.search} mt-1 justify-between md:col-span-2 xl:ml-2 xl:mt-0 xl:shrink-0`}>
            <span className="flex items-baseline gap-2">
              Search jobs
              <span className="font-medium tabular-nums opacity-75 group-hover:opacity-100">
                {resultCount}
                <span className="sr-only"> {resultCount === 1 ? "role" : "roles"} found</span>
              </span>
            </span>
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 transition-transform duration-[220ms] ease-out group-hover:translate-x-0.5">
              <path d="M3 8h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div
          id="roles-more-filters"
          role="group"
          aria-label="More filters"
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && moreOpen) setMoreSettled(true);
          }}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-premium ${moreOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          inert={!moreOpen}
        >
          <div className={moreOpen && moreSettled ? "overflow-visible" : "overflow-hidden"}>
            <div className="mt-2 grid gap-1 border-t border-line pt-2 md:grid-cols-2 xl:grid-cols-4">
              {MORE.map(dropdown)}
              {/* Availability: every career role, or only the current openings. */}
              <fieldset className="flex min-w-0 flex-col justify-center rounded-inner px-4 py-2">
                <legend className="sr-only">Availability</legend>
                <span aria-hidden="true" className="text-label text-muted">
                  Availability
                </span>
                <span className="mt-1 inline-flex w-full rounded-[10px] bg-primary/[0.07] p-0.5">
                  {(["all", "open"] as const satisfies readonly Availability[]).map((value) => (
                    <label key={value} className="relative flex-1 cursor-pointer">
                      <input
                        type="radio"
                        name="roles-availability"
                        value={value}
                        checked={query.availability === value}
                        onChange={() => onQuery({ ...query, availability: value })}
                        className="peer sr-only"
                      />
                      <span className="block whitespace-nowrap rounded-[8px] px-3 py-1.5 text-center text-small font-medium text-muted transition-colors duration-200 peer-checked:bg-primary peer-checked:text-neutral peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-primary">
                        {AVAILABILITY_LABEL[value]}
                      </span>
                    </label>
                  ))}
                </span>
              </fieldset>
            </div>
          </div>
        </div>
      </form>

      {/* The active filters, removable one by one, and Clear All. */}
      <div className="mt-3 flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2">
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={() => onQuery(chip.remove())}
                aria-label={`Remove filter ${chip.label}: ${chip.value}`}
                className="group/chip flex h-8 cursor-pointer items-center gap-2 rounded-full border border-primary/15 bg-white pl-3 pr-2 text-small text-primary transition-colors duration-[220ms] ease-out hover:border-accent hover:bg-accent"
              >
                <span className="text-muted group-hover/chip:text-primary/75">{chip.label}</span>
                <span className="font-medium">{chip.value}</span>
                <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
                  <path d="m3 3 6 6M9 3 3 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
        {activeAll > 0 && (
          <button
            type="button"
            onClick={() => onQuery({ ...EMPTY_QUERY, sort: query.sort })}
            className="cursor-pointer py-1 text-small font-medium text-primary underline-offset-4 transition-colors duration-[220ms] hover:underline"
          >
            Clear All Filters <span className="tabular-nums text-muted">({activeAll})</span>
          </button>
        )}
      </div>
    </div>
  );
}
