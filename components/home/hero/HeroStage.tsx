"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { onIntroReveal } from "@/lib/intro/reveal-signal";
import { EASE, prefersReducedMotion } from "@/lib/motion";

/**
 * Plays the hero entrance as the intro clears. Children opt in with:
 * `data-line` (headline lines rising out of their masks), `data-enter="fade"`
 * (small type), and `data-enter="float"` (the search, rising into place).
 * The intro covers the page until then, so the hidden start is never seen.
 */
export function HeroStage({ children, className = "" }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const lines = el.querySelectorAll("[data-line]");
    const fades = el.querySelectorAll('[data-enter="fade"]');
    const floats = el.querySelectorAll('[data-enter="float"]');

    gsap.set(lines, { yPercent: 112, rotate: 3, transformOrigin: "0% 100%" });
    gsap.set(fades, { autoAlpha: 0, y: 14 });
    gsap.set(floats, { autoAlpha: 0, y: 60 });

    let timeline: gsap.core.Timeline | undefined;
    const stop = onIntroReveal(() => {
      timeline = gsap
        .timeline({ defaults: { ease: EASE } })
        .to(lines, { yPercent: 0, rotate: 0, duration: 1.4, stagger: 0.1 }, 0.05)
        .to(fades, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.07 }, 0.4)
        .to(floats, { autoAlpha: 1, y: 0, duration: 1.5 }, 0.55);
    });
    return () => {
      stop();
      timeline?.kill();
    };
  }, []);

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
