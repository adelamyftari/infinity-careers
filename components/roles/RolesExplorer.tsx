"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import gsap from "gsap";
import { Dropdown } from "@/components/ui/Dropdown";
import { newDraft, type ApplicationDraft } from "@/lib/careers/application";
import { getRoleEntry, ROLE_ENTRIES, type RoleEntry } from "@/lib/careers/roles";
import {
  canSortByDate,
  EMPTY_QUERY,
  PAGE_SIZE,
  pageCount,
  pageFromParams,
  queryFromParams,
  queryToParams,
  ROLE_PARAM,
  searchRoles,
  SORT_OPTIONS,
  type RolesQuery,
  type SortId,
} from "@/lib/careers/roles-search";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { Pagination } from "./Pagination";
import { RoleCard } from "./RoleCard";
import { RoleDetail } from "./RoleDetail";
import { RolesSearch } from "./RolesSearch";

// The application's code is not in the page's first load; it is fetched once the page is idle
// (warmApplication, below), so the first APPLY NOW opens at once instead of after a download.
const loadApplication = () => import("./application/ApplicationDialog");
const ApplicationDialog = dynamic(loadApplication, { ssr: false });

/** Fetches the application's code when the browser has nothing else to do. */
function warmApplication(): () => void {
  if ("requestIdleCallback" in window) {
    const handle = window.requestIdleCallback(() => void loadApplication(), { timeout: 4000 });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = setTimeout(() => void loadApplication(), 2000);
  return () => clearTimeout(timer);
}

/** The page's address: the search, the page (once the visitor has paged or filtered), the open role. */
function urlFor(query: RolesQuery, page: number | undefined, roleId: string | null) {
  const params = queryToParams(query, new URLSearchParams(), page);
  if (roleId) params.set(ROLE_PARAM, roleId);
  return params.size ? `/roles?${params}` : "/roles";
}

/** The page number the URL carries, if any (a landing without one is page 1, and stays without one). */
const urlPage = () => (new URLSearchParams(window.location.search).has("page") ? pageFromParams(new URLSearchParams(window.location.search)) : undefined);

/**
 * The positions page's interactive part: the search, the results (nine to a
 * page, numbered) and the two modals (a role's details, the application). The
 * query, the page and the open role live in the URL
 * (?location=tirana&careerGroup=casino&page=2&role=…): each filter change and
 * each page is a history entry, so Back and Forward step through them; typing
 * replaces its entry rather than adding one per letter. Every filter change
 * returns to page 1; a page past the end shows the last one. Drafts of applications are kept per role while
 * the page is open, so closing the form never loses what was entered.
 */
export function RolesExplorer() {
  useEffect(() => warmApplication(), []);
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<RolesQuery>(() => queryFromParams(new URLSearchParams(searchParams.toString())));
  const [roleId, setRoleId] = useState<string | null>(() => searchParams.get(ROLE_PARAM));
  const [applyId, setApplyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ApplicationDraft>>({});
  const [page, setPage] = useState(() => pageFromParams(new URLSearchParams(searchParams.toString())));
  const openedHere = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  const resultsHead = useRef<HTMLDivElement>(null);

  // Filtered first, then divided into pages.
  const results = useMemo(() => searchRoles(ROLE_ENTRIES, query), [query]);
  const openCount = useMemo(() => results.filter((entry) => entry.kind === "vacancy").length, [results]);
  const pages = pageCount(results.length);
  const current = Math.min(page, pages);
  const shown = useMemo(() => results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), [results, current]);
  const detail = roleId ? getRoleEntry(roleId) : undefined;
  const applying = applyId ? getRoleEntry(applyId) : undefined;
  const missingRole = roleId !== null && !detail;

  // Back and Forward: read the search and the open role from the URL.
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      openedHere.current = false;
      setQuery(queryFromParams(params));
      setRoleId(params.get(ROLE_PARAM));
      setPage(pageFromParams(params));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const onQuery = useCallback(
    (next: RolesQuery, mode: "push" | "replace" = "push") => {
      setQuery(next);
      setPage(1);
      const url = urlFor(next, 1, null);
      if (url !== `${window.location.pathname}${window.location.search}`) window.history[mode === "push" ? "pushState" : "replaceState"](null, "", url);
      if (roleId !== null) setRoleId(null);
    },
    [roleId],
  );

  const openRole = useCallback(
    (entry: RoleEntry) => {
      openedHere.current = true;
      setRoleId(entry.id);
      window.history.pushState(null, "", urlFor(query, urlPage(), entry.id));
    },
    [query],
  );

  const closeRole = useCallback(() => {
    setRoleId(null);
    if (openedHere.current) {
      openedHere.current = false;
      window.history.back();
    } else window.history.replaceState(null, "", urlFor(query, urlPage(), null));
  }, [query]);

  const apply = useCallback((entry: RoleEntry) => setApplyId(entry.id), []);

  function goToPage(next: number) {
    if (next === current) return;
    setPage(next);
    window.history.pushState(null, "", urlFor(query, next, null));
    showResults();
  }

  // A page past the end (a shared link, a shorter list): the URL says the page shown.
  useEffect(() => {
    if (page > pages && urlPage() !== undefined) window.history.replaceState(null, "", urlFor(query, current, roleId));
  }, [page, pages, current, query, roleId]);

  function showResults() {
    resultsHead.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    resultsHead.current?.focus({ preventScroll: true });
  }

  // The search enters as the hero's headline settles.
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    const tween = gsap.fromTo(root.current.querySelector("[data-roles-search]"), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE, delay: 0.55 });
    return () => void tween.revert();
  }, []);

  // A new page or a new set: the cards settle in, briefly and together.
  useLayoutEffect(() => {
    const list = grid.current;
    if (!list || prefersReducedMotion()) return;
    const tween = gsap.fromTo(list.children, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: EASE, stagger: 0.03, clearProps: "transform" });
    return () => void tween.revert();
  }, [shown]);

  const sortOptions = SORT_OPTIONS.filter((o) => o.value !== "relevant" && (o.value !== "recent" || canSortByDate(ROLE_ENTRIES)));

  return (
    <div ref={root}>
      <div data-roles-search className="relative z-20 mt-[clamp(1.75rem,3.5vw,2.75rem)]">
        <RolesSearch query={query} onQuery={onQuery} resultCount={results.length} onShowResults={showResults} />
      </div>

      {/* The results: their count, their order, then the cards of this page. */}
      <div ref={resultsHead} tabIndex={-1} className="mt-[clamp(2rem,4vw,3.5rem)] flex scroll-mt-24 flex-col gap-4 outline-none md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-label font-medium tracking-[0.18em] text-muted">{query.availability === "open" ? "OPEN POSITIONS" : "ALL ROLES"}</h2>
          <p aria-live="polite" className="mt-1.5 text-title font-medium text-primary">
            <span className="tabular-nums">{results.length}</span> {results.length === 1 ? "role" : "roles"} found
            {/* One unit: beside the count where it fits, on its own line where it doesn't (never broken mid-phrase). */}
            <span className="ml-3 inline-block text-small font-normal text-muted">
              <span className="tabular-nums">{openCount}</span> {openCount === 1 ? "open position" : "open positions"}
              {pages > 1 && (
                <>
                  <span aria-hidden="true" className="px-1.5">·</span>
                  page <span className="tabular-nums">{current}</span> of <span className="tabular-nums">{pages}</span>
                </>
              )}
            </span>
          </p>
          {missingRole && <p className="mt-2 text-small font-medium text-primary">The role you followed is no longer listed. Here are the roles Infinity lists now.</p>}
        </div>
        <div className="w-full rounded-[14px] bg-white p-1 text-primary shadow-[0_0_0_1px_var(--line),0_14px_30px_-22px_rgb(16_47_50/0.35)] md:w-60">
          <Dropdown
            id="roles-sort"
            label="Sort by"
            anyLabel="Relevant"
            options={sortOptions}
            value={query.sort === "relevant" ? null : query.sort}
            onChange={(value) => onQuery({ ...query, sort: (value ?? "relevant") as SortId })}
          />
        </div>
      </div>
      {!canSortByDate(ROLE_ENTRIES) && <p className="mt-2 text-label text-muted">“Recently Published” appears once HR publishes listings with dates.</p>}

      {results.length === 0 ? (
        <div className="mt-10 flex flex-col items-start rounded-surface border border-line bg-white/80 px-6 py-12 md:items-center md:px-10 md:py-16 md:text-center">
          <p className="text-[clamp(1.75rem,1.2rem+2vw,3rem)] font-bold leading-[0.95] tracking-[-0.03em] text-primary">NO MATCHING POSITIONS.</p>
          <p className="mt-3 max-w-[32rem] text-lead text-muted">Try adjusting your filters to discover other opportunities at Infinity.</p>
          <button
            type="button"
            onClick={() => onQuery({ ...EMPTY_QUERY, sort: query.sort })}
            className="mt-7 inline-flex h-12 cursor-pointer items-center gap-2 rounded-[14px] bg-primary px-6 text-small font-semibold tracking-[0.06em] text-neutral transition-colors hover:bg-accent hover:text-primary"
          >
            CLEAR FILTERS
          </button>
        </div>
      ) : (
        <>
          <ul ref={grid} aria-label={pages > 1 ? `Roles, page ${current} of ${pages}` : "Roles"} className="mt-8 grid gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((entry) => (
              <li key={entry.id}>
                <RoleCard entry={entry} onOpen={openRole} onApply={apply} />
              </li>
            ))}
          </ul>
          {pages > 1 && <Pagination current={current} total={pages} hrefFor={(n) => urlFor(query, n, null)} onPage={goToPage} />}
        </>
      )}

      {detail && <RoleDetail key={detail.id} entry={detail} onClose={closeRole} onApply={apply} />}
      {applying && (
        <ApplicationDialog
          key={applying.id}
          entry={applying}
          draft={drafts[applying.id] ?? newDraft()}
          onDraft={(draft) =>
            setDrafts((all) => {
              const next = { ...all };
              if (draft) next[applying.id] = draft;
              else delete next[applying.id];
              return next;
            })
          }
          onClose={() => setApplyId(null)}
          onExplore={() => {
            setApplyId(null);
            if (roleId) closeRole();
            requestAnimationFrame(showResults);
          }}
        />
      )}
    </div>
  );
}
