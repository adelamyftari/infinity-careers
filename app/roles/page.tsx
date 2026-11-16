import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { RolesExplorer } from "@/components/roles/RolesExplorer";
import { RolesHero } from "@/components/roles/RolesHero";
import { DOTTED_FIELD } from "@/lib/site/surfaces";

export const metadata: Metadata = {
  title: "Open Positions · Infinity Careers",
  description: "Explore career opportunities across Infinity's casinos, restaurants, hotel and corporate teams. Discover where your skills, ambition and future can grow.",
};

/**
 * The positions page: the introduction, then the search, the roles and the
 * application (RolesExplorer), then the site's footer. The introduction is
 * static; the rest reads the URL (?group=…&role=…), so it streams with the
 * request behind a fallback the size of the search.
 */
export default function RolesPage() {
  return (
    <>
      <SiteHeader />
      {/* One surface for the whole page, hero to the footer's last line: the footer's warm white and
          dotted field, drawn once here; the section and the footer on it are transparent. */}
      <div className="relative isolate flex flex-1 flex-col bg-neutral">
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 ${DOTTED_FIELD}`} />
        <ViewTransition enter="page-enter" exit="page-exit" default="none">
          <main className="flex-1">
            <section
              aria-labelledby="roles-title"
              data-header-surface
              data-tone="light"
              className="relative overflow-x-clip px-(--gutter) pb-[clamp(4rem,8vw,7rem)] pt-[calc(5rem+clamp(2rem,5vw,4rem))] text-primary"
            >
              <RolesHero />
              <Suspense fallback={<div aria-hidden="true" className="mt-[clamp(1.75rem,3.5vw,2.75rem)] h-[60svh]" />}>
                <RolesExplorer />
              </Suspense>
            </section>
          </main>
        </ViewTransition>
        <SiteFooter surface="shared" />
      </div>
    </>
  );
}
