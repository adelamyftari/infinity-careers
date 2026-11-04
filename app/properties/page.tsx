import type { Metadata } from "next";
import { ViewTransition } from "react";
import { SiteHeader } from "@/components/home/SiteHeader";
import { PropertiesSection } from "@/components/home/properties/PropertiesSection";

export const metadata: Metadata = {
  title: "Our properties · Infinity Careers",
  description: "Explore Infinity's destinations across Albania and the open roles at each one.",
};

/** "Where we are": the properties map, on its own page. */
export default function PropertiesPage() {
  return (
    <>
      <SiteHeader />
      <ViewTransition enter="page-enter" exit="page-exit" default="none">
        {/* On the page's dotted off-white (globals.css); the top padding clears the fixed header. */}
        <main className="flex-1 pt-24">
          <PropertiesSection />
        </main>
      </ViewTransition>
    </>
  );
}
