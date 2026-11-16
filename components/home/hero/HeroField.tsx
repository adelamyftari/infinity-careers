"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { InfinityMark } from "@/components/brand/InfinityMark";

gsap.registerPlugin(ScrollTrigger);

/**
 * The hero's colour field: deep petrol, ending halfway down the role cards so
 * they stand across it into the ivory below. In it, the monogram at
 * architectural scale, passing behind the search. The monogram drifts slower
 * than the page as it scrolls.
 */
export function HeroField() {
  const mark = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = mark.current;
    if (!el) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to(el, {
        yPercent: 9,
        ease: "none",
        scrollTrigger: { trigger: el.parentElement, start: "top top", end: "bottom top", scrub: true },
      });
    });
    return () => media.revert();
  }, []);

  return (
    <div
      data-hero-field
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-20 bottom-[calc(-1*var(--hero-field-reach)-var(--card-h)*0.5)] overflow-hidden bg-petrol"
    >
      <InfinityMark ref={mark} fill="var(--infinity-petrol-mark)" className="absolute -right-[12vw] top-[26vw] size-[84vw] lg:right-(--gutter) lg:top-[3vw] lg:size-[30vw]" />
    </div>
  );
}
