import { ViewTransition } from "react";
import { CompanyIntro } from "@/components/home/CompanyIntro";
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
          {/* The editorial statement plays inside the roles orbit's scroll scene, in front of the cards. */}
          <Hero handoff={<CompanyIntro />} />
        </main>
      </ViewTransition>
    </LoadingScreen>
  );
}
