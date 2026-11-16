"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { EASE, prefersReducedMotion } from "@/lib/motion";

/**
 * The positions page's introduction, on its white page: the eyebrow, the
 * two-line headline (INFINITY. in Infinity Yellow), the lede, and the
 * monogram as a faint oversized watermark. Kept short, so the search and the
 * first cards are in view without scrolling far; the search below it
 * (RolesExplorer) enters as the headline settles.
 */
export function RolesHero() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const q = gsap.utils.selector(el);
    const intro = gsap
      .timeline({ defaults: { ease: EASE } })
      // From nothing to the watermark's own faint opacity (CSS).
      .from(q("[data-watermark]"), { autoAlpha: 0, scale: 0.94, duration: 1.6 }, 0)
      .fromTo(q("[data-eyebrow]"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.1)
      .fromTo(q("[data-line]"), { yPercent: 108 }, { yPercent: 0, duration: 1.1, stagger: 0.12 }, 0.16)
      .fromTo(q("[data-lede]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.5);
    return () => void intro.revert();
  }, []);

  return (
    <div ref={root} className="relative">
      {/* The monogram, oversized and barely there, past the headline's end. */}
      <InfinityMark
        data-watermark
        className="pointer-events-none absolute -right-[6%] -top-[30%] -z-10 size-[min(34rem,72vw)] fill-primary opacity-[0.04] max-lg:-right-[22%] max-lg:-top-[12%]"
      />

      <header className="relative max-w-[64rem]">
        <p data-eyebrow className="flex items-center gap-2.5 text-label font-semibold tracking-[0.18em] text-primary">
          <span aria-hidden="true" className="size-2 bg-accent" />
          <span>
            INFINITY CAREERS <span className="text-accent">/</span> OPEN POSITIONS
          </span>
        </p>
        <h1 id="roles-title" aria-label="Find your place at Infinity." className="mt-4 text-[clamp(2.5rem,1.1rem+5.2vw,6.5rem)] font-bold leading-[0.9] tracking-[-0.04em]">
          <span aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
            <span data-line className="block">FIND YOUR PLACE</span>
          </span>
          <span aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
            <span data-line className="block">
              AT <span className="text-accent">INFINITY.</span>
            </span>
          </span>
        </h1>
        <p data-lede className="mt-[clamp(1rem,2vw,1.5rem)] max-w-[40rem] text-lead text-muted">
          Explore career opportunities across Infinity&apos;s casinos, restaurants, hotel and corporate teams. Discover where your skills, ambition and future can grow.
        </p>
      </header>
    </div>
  );
}
