import type { ReactNode } from "react";
import { JOBS } from "@/lib/careers/jobs";
import { HeroExplorer } from "./HeroExplorer";
import { HeroHeadline } from "./HeroHeadline";
import { HeroStage } from "./HeroStage";

/**
 * Homepage hero, composed for the whole first screen: the headline stepped
 * across two lines, the search set on the second line's indent and running off
 * the page's right edge, the role cards standing across the end of the colour
 * field. `handoff` is what the orbit hands over to as the page scrolls past it.
 *
 * The vertical rhythm, set here for every width: --hero-title-space above the
 * headline, --hero-search-space below it, --hero-cards-space between the search
 * and the orbit, and --hero-field-reach for how far past the search the colour
 * field runs (on top of half a card).
 */
export function Hero({ handoff }: { handoff?: ReactNode }) {
  return (
    <section className="relative isolate overflow-x-clip pb-16 pt-20 [--card-h:calc(var(--card-w)*0.66)] [--card-w:min(84vw,26rem)] [--hero-cards-space:0.5rem] [--hero-field-reach:3.5rem] [--hero-search-space:0.25rem] [--hero-title-space:0.75rem] md:[--hero-cards-space:0.75rem] md:[--hero-field-reach:4.25rem] md:[--hero-search-space:0.5rem] md:[--hero-title-space:1.25rem] lg:[--card-w:clamp(24rem,27vw,32rem)] xl:[--hero-cards-space:1.375rem] xl:[--hero-field-reach:5.75rem] xl:[--hero-search-space:0.75rem] xl:[--hero-title-space:2rem]">
      <HeroStage>
        <HeroExplorer jobs={JOBS} heading={<HeroHeadline />} handoff={handoff} />
      </HeroStage>
    </section>
  );
}
