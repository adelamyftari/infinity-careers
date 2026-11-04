"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { EASE, hasFinePointer, prefersReducedMotion } from "@/lib/motion";

/**
 * Pulls an element toward the cursor while it hovers, and lets it settle back
 * on leave. `strength` is the share of the cursor's offset the element follows.
 * Fine pointers only, and off under reduced motion.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.3) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !hasFinePointer()) return;
    const x = gsap.quickTo(el, "x", { duration: 0.7, ease: EASE });
    const y = gsap.quickTo(el, "y", { duration: 0.7, ease: EASE });
    // Measured at rest on entry, so the pull never feeds back into itself.
    let centre = { x: 0, y: 0 };

    const enter = () => {
      const box = el.getBoundingClientRect();
      const offset = { x: Number(gsap.getProperty(el, "x")), y: Number(gsap.getProperty(el, "y")) };
      centre = { x: box.left + box.width / 2 - offset.x, y: box.top + box.height / 2 - offset.y };
    };
    const move = (event: PointerEvent) => {
      x((event.clientX - centre.x) * strength);
      y((event.clientY - centre.y) * strength);
    };
    const leave = () => {
      x(0);
      y(0);
    };

    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [strength]);

  return ref;
}
