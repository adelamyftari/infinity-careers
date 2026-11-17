import type { Metadata } from "next";
import { ViewTransition } from "react";
import { CompanyCall, CompanyHero, OurDestinations, OurExpertise, OurPeople, OurResponsibility, OurVision, WhoWeAre } from "@/components/company/CompanySections";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";

export const metadata: Metadata = {
  title: "About Infinity | Infinity Careers",
  description: "Discover Infinity Entertainment, its expertise in casino development and management, its people, and the destinations behind the group.",
};

/**
 * The Company page: who Infinity is, in its own words, from the headquarters to the seven
 * destinations, ending on the way into its careers.
 */
export default function CompanyPage() {
  return (
    <>
      <SiteHeader />
      <ViewTransition enter="page-enter" exit="page-exit" default="none">
        <main className="flex-1">
          <CompanyHero />
          <WhoWeAre />
          <OurExpertise />
          <OurPeople />
          <OurResponsibility />
          <OurVision />
          <OurDestinations />
          <CompanyCall />
        </main>
      </ViewTransition>
      <SiteFooter />
    </>
  );
}
