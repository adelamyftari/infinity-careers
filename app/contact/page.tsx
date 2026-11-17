import type { Metadata } from "next";
import { ViewTransition } from "react";
import { CareersCall, ContactHero, LocationMap, MessageSection, VisitHeadquarters } from "@/components/contact/ContactSections";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";

export const metadata: Metadata = {
  title: "Contact | Infinity Careers",
  description: "Contact Infinity Investment Group's headquarters at Arena Center in Tirana, Albania.",
};

/** The Contact page: the headquarters, where it is, a message, and the way to the positions. */
export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <ViewTransition enter="page-enter" exit="page-exit" default="none">
        <main className="flex-1">
          <ContactHero />
          <VisitHeadquarters />
          <LocationMap />
          <MessageSection />
          <CareersCall />
        </main>
      </ViewTransition>
      <SiteFooter />
    </>
  );
}
