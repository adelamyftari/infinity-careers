import type { ReactNode } from "react";
import { JOBS } from "@/lib/careers/jobs";
import { HeroExplorer } from "./HeroExplorer";
import { HeroStage } from "./HeroStage";

/** A headline line that rises out of its own mask on entry. */
function Line({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    // Padding inside the mask leaves room for descenders and the italic overhang.
    <span className={`-mx-[0.1em] -mb-[0.08em] block overflow-hidden px-[0.1em] pb-[0.08em] ${className}`}>
      <span data-line className="block will-change-transform">
        {children}
      </span>
    </span>
  );
}

function Accent({ children }: { children: ReactNode }) {
  return <em className="font-serif text-[1.1em] font-normal italic tracking-[-0.02em]">{children}</em>;
}

/**
 * Homepage hero. An editorial grid: the headline set across
 * two staggered lines (the second indented by the column the search later
 * aligns to), and the role carousel breaking out to the full width.
 */
/** `handoff`: what the roles orbit hands over to as the page scrolls past it. */
export function Hero({ handoff }: { handoff?: ReactNode }) {
  return (
    <section className="relative isolate overflow-x-clip pb-16 pt-28 lg:pt-32">
      <HeroStage>
        <div className="px-(--gutter)">
          <div className="relative mt-[clamp(1.75rem,4.5vh,3.75rem)] pb-[clamp(2rem,5vh,3.5rem)]">
            <h1 className="text-[clamp(3rem,9.6vw,10.75rem)] font-medium leading-[0.88] tracking-[-0.055em] text-foreground">
              <Line>
                Your next <Accent>move</Accent>
              </Line>
              <Line className="pl-[10%] lg:pl-[26%]">
                starts <Accent>here</Accent>
                <span className="text-gold">.</span>
              </Line>
            </h1>
          </div>
        </div>

        <HeroExplorer jobs={JOBS} handoff={handoff} />
      </HeroStage>
    </section>
  );
}
