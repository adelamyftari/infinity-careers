"use client";

import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { pageItems } from "@/lib/careers/roles-search";

const WIDE = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/**
 * Numbered pagination: Previous, the pages (the current one in Infinity
 * Yellow) with an ellipsis for each gap, Next. Each page is a real link
 * (/roles?…&page=3), so it can be opened in a new tab; an ordinary click
 * changes the page in place. Phones show fewer numbers around the current
 * page, never a different page size.
 */
export function Pagination({ current, total, hrefFor, onPage }: { current: number; total: number; hrefFor: (page: number) => string; onPage: (page: number) => void }) {
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => true);
  const items = pageItems(current, total, wide ? 1 : 0);

  const click = (page: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onPage(page);
  };

  const step = "inline-flex h-11 items-center gap-2 rounded-button border px-3 text-small font-semibold tracking-[0.04em] transition-colors duration-[220ms] md:px-4";
  const arrow = (d: string) => (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const edge = (page: number, label: string, rel: "prev" | "next", children: ReactNode) =>
    (rel === "prev" ? current > 1 : current < total) ? (
      <a href={hrefFor(page)} rel={rel} onClick={click(page)} aria-label={label} className={`${step} border-primary/25 text-primary hover:border-primary hover:bg-primary hover:text-neutral`}>
        {children}
      </a>
    ) : (
      <span aria-disabled="true" className={`${step} border-primary/10 text-primary/30`}>
        {children}
      </span>
    );

  return (
    <nav aria-label="Pages of results" className="mt-12 flex items-center justify-center gap-1.5 md:gap-2">
      {edge(current - 1, "Previous page", "prev", <>{arrow("M10 3.5 5.5 8l4.5 4.5")}<span className="max-sm:sr-only">Previous</span></>)}
      <ol className="flex items-center gap-1 md:gap-1.5">
        {items.map((item, i) =>
          item === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="flex w-6 justify-center text-small text-muted">
              …
            </li>
          ) : (
            <li key={item}>
              <a
                href={hrefFor(item)}
                onClick={click(item)}
                aria-label={`Page ${item}`}
                aria-current={item === current ? "page" : undefined}
                className={`inline-flex size-10 items-center justify-center rounded-button text-small font-semibold tabular-nums transition-colors duration-[220ms] md:size-11 ${
                  item === current ? "bg-accent text-primary" : "border border-primary/20 text-primary hover:border-primary hover:bg-primary hover:text-neutral"
                }`}
              >
                {item}
              </a>
            </li>
          ),
        )}
      </ol>
      {edge(current + 1, "Next page", "next", <><span className="max-sm:sr-only">Next</span>{arrow("M6 3.5 10.5 8 6 12.5")}</>)}
    </nav>
  );
}
