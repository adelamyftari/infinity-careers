"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Scroll this far from the top before the header may hide (px). */
const FREE_ZONE = 64;
/** Ignore smaller movements, so a trembling trackpad doesn't flicker it (px). */
const THRESHOLD = 6;

/**
 * The fixed, transparent header steps out of the way of the page: it hides
 * while scrolling down and returns on scrolling up, so content never runs
 * underneath the logo. The rule in globals.css keeps it visible while the menu
 * is open or something inside it has keyboard focus.
 */
export function ScrollAwareHeader({ children }: { children: ReactNode }) {
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = header.current;
    if (!el) return;
    let last = window.scrollY;
    // Light type while a dark surface is under the logo: the hero's field, or a section
    // that marks itself `data-header-surface` and says its tone (it may change as it scrolls).
    const field = document.querySelector("[data-hero-field]");
    const surfaces = document.querySelectorAll<HTMLElement>("[data-header-surface]");
    const setTone = () => {
      // The last in the page wins: where surfaces overlap (one rising over another), it is the one in front.
      const surface = [...surfaces].reverse().find((s) => {
        const box = s.getBoundingClientRect();
        return box.top <= 48 && box.bottom > 48;
      });
      const dark = surface ? surface.dataset.tone === "dark" : !!field && field.getBoundingClientRect().bottom > 48;
      el.dataset.tone = dark ? "dark" : "light";
    };
    setTone();
    window.addEventListener("header:tone", setTone);
    const onScroll = () => {
      setTone();
      const y = window.scrollY;
      if (y < FREE_ZONE) el.dataset.hidden = "false";
      else if (y - last > THRESHOLD) el.dataset.hidden = "true";
      else if (last - y > THRESHOLD) el.dataset.hidden = "false";
      else return;
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("header:tone", setTone);
    };
  }, []);

  return (
    <header ref={header} data-site-header className="fixed inset-x-0 top-0 z-40">
      {children}
    </header>
  );
}
