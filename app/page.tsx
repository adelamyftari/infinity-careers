import { ViewTransition } from "react";
import { InfinityAdvantage } from "@/components/home/advantage/InfinityAdvantage";
import { DestinationsShowcase } from "@/components/home/destinations/DestinationsShowcase";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { Hero } from "@/components/home/hero/Hero";
import { LoadingScreen } from "@/components/loader/LoadingScreen";

export default function Home() {
  return (
    <LoadingScreen>
      <SiteHeader />
      <ViewTransition enter="page-enter" exit="page-exit" default="none">
        {/* The dotted off-white comes from the page canvas (globals.css). */}
        <main className="flex-1">
          {/* The properties section plays inside the roles orbit's scroll scene, in front of the cards. */}
          <Hero handoff={<DestinationsShowcase />} />
          <InfinityAdvantage />
        </main>
      </ViewTransition>
      {/* Rises over The Infinity Advantage's last screen, then the page ends with it. */}
      <SiteFooter />
    </LoadingScreen>
  );
}
