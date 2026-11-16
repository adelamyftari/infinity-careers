import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { PropertiesSection } from "@/components/home/properties/PropertiesSection";

export const metadata: Metadata = {
  title: "7 Properties. One World. · Infinity Careers",
  description: "Discover the destinations behind Infinity. Explore our properties across Albania and the opportunities that connect them.",
};

/** The properties: the map of Albania and the seven destinations as glass cards, then the site's footer. */
export default function PropertiesPage() {
  return (
    <>
      <SiteHeader />
      <ViewTransition enter="page-enter" exit="page-exit" default="none">
        {/* The section clears the fixed header itself, so its dark field runs up under it. */}
        <main className="flex-1">
          {/* The selection comes from the URL (?property=…): streamed with the request, so the
              page opens on the named property. The fallback is the bare field, never a default. */}
          <Suspense fallback={<div aria-hidden="true" className="min-h-svh bg-petrol" />}>
            <PropertiesSection />
          </Suspense>
        </main>
      </ViewTransition>
      <SiteFooter />
    </>
  );
}
