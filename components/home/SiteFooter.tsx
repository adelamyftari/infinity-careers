"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { CITIES } from "@/lib/properties/destinations";
import { CONTACT, LEGAL_LINKS, SOCIALS } from "@/lib/site/contact";
import { DOTTED_FIELD } from "@/lib/site/surfaces";

gsap.registerPlugin(ScrollTrigger);

/** Column headings: small capitals, lightly tracked. */
const label = "text-label font-medium tracking-[0.14em] text-petrol/65";
/** Every column's items share one size and rhythm. */
const item = "text-[clamp(1.0625rem,0.97rem+0.32vw,1.3125rem)] leading-snug";
const list = "mt-6 space-y-2.5";
/** Links: petrol, darkening on hover, as an Infinity Yellow underline slides in beneath from the left. */
const link = `inline-block whitespace-nowrap pb-1 ${item} text-petrol bg-[linear-gradient(var(--color-accent),var(--color-accent))] bg-size-[0%_2px] bg-left-bottom bg-no-repeat transition-[color,background-size] duration-500 ease-premium hover:bg-size-[100%_2px] hover:text-[#091a1c] focus-visible:bg-size-[100%_2px] focus-visible:text-[#091a1c]`;
/**
 * The footer's own, wider measure: about 90% of the viewport, at most 1600px of content, centred.
 * (The rest of the site keeps --gutter, which stops at 1440px.)
 */
// 100%, not 100vw: the footer's own width, so a classic scrollbar does not shave the content or tilt the margins.
const frame = "px-[max(clamp(1.25rem,5vw,6rem),calc((100%_-_1600px)/2))]";
/**
 * Four columns at 1280px and up (brand 1.5fr, the rest 1fr); two from tablet (brand | careers,
 * locations | follow us); on phones the brand and FOLLOW US full width, careers and locations side by side.
 */
const columns =
  "grid grid-cols-2 gap-x-6 gap-y-12 sm:gap-x-10 md:gap-x-[clamp(3rem,6vw,5rem)] md:gap-y-14 xl:grid-cols-[1.5fr_1fr_1fr_1fr] xl:gap-x-[clamp(3rem,4.2vw,5rem)]";
/**
 * The wordmark's length in em (INFINITY CAREERS, in its weight and tracking): its size is the
 * content width divided by it, so it spans the columns edge to edge. Measured for Inter Tight;
 * the browser measures the font it actually renders with and replaces it (--wordmark-ems).
 */
const WORDMARK_EMS = 8.16;

/**
 * The footer: the page's warm white with its dotted grid, in petrol type, where the journey ends. On the home
 * page it is drawn up over the last pinned screen of The Infinity Advantage, so
 * it rises from below and covers "JOIN OUR TEAM." (the scene holds still for it, and only there
 * is the footer a full screen tall); then the page scrolls on as usual. Its parts come in once it
 * has risen. Without that scene (reduced motion, no WebGL) it simply follows the page, and
 * without JavaScript it is all there from the start.
 *
 * Four columns (the brand, the careers routes that exist, the four cities, FOLLOW US), then
 * INFINITY CAREERS across the full width in type alone, then the copyright. Only real
 * information: contact details, social profiles and legal pages come from lib/site/contact.ts,
 * and appear (or become links) once set there.
 */
export function SiteFooter({ surface = "own" }: {
  /**
   * "own" (every page but /roles): its own warm white, dots and the shadow it rises with.
   * "shared": transparent, on the page's one continuous dotted surface (no edge, no shadow).
   */
  surface?: "own" | "shared";
} = {}) {
  const footer = useRef<HTMLElement>(null);
  const own = surface === "own";

  useLayoutEffect(() => {
    const el = footer.current;
    if (!el) return;
    // The current year, read in the browser (a prerendered page would freeze it at build time).
    const year = el.querySelector("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());

    // The wordmark's true length in em, once its font has loaded: then it fits the width exactly.
    const mark = el.querySelector<HTMLElement>("[data-wordmark]");
    const text = mark?.firstElementChild;
    let live = true;
    const fit = () => {
      if (!live || !mark || !(text instanceof HTMLElement)) return;
      const size = parseFloat(getComputedStyle(mark).fontSize);
      if (size > 0) mark.style.setProperty("--wordmark-ems", (text.getBoundingClientRect().width / size).toFixed(4));
    };
    fit();
    document.fonts.ready.then(fit);

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const parts = el.querySelectorAll("[data-footer-reveal]");
      gsap.from(parts, {
        autoAlpha: 0,
        y: 28,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.07,
        scrollTrigger: { trigger: el, start: "top 35%", toggleActions: "play none none reverse" },
      });
    });
    return () => {
      live = false;
      mm.revert();
    };
  }, []);

  return (
    <footer
      ref={footer}
      data-header-surface
      data-tone="light"
      className={`relative z-30 text-petrol ${own ? "bg-neutral shadow-[0_-30px_70px_-30px_rgb(16_47_50/0.28)]" : ""} [html:has([data-journey=on])_&]:-mt-[100vh]`}
    >
      {/* The page's own dotted grid, aligned with the other warm white sections. */}
      {own && <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${DOTTED_FIELD}`} />}
      {/* Its own height, except over the home page's last pinned screen, which it must cover: there
          it is a screen tall, the composition centred in it. */}
      <div className={`relative flex flex-col ${frame} pb-[clamp(1.5rem,2.5vw,2.25rem)] pt-[clamp(4.5rem,7vw,6.75rem)] [html:has([data-journey=on])_&]:min-h-svh`}>
        <div className="[html:has([data-journey=on])_&]:my-auto">
          <div className={columns}>
            {/* The brand, and what this site is for. */}
            <div data-footer-reveal className="col-span-2 max-w-[27rem] md:col-span-1 xl:max-w-none">
              <Link href="/" aria-label="Infinity Careers, home" className="inline-flex items-center gap-3">
                <InfinityMark className="size-11" />
                <span className="flex flex-col gap-[3px] text-small/none font-semibold tracking-[0.2em]">
                  <span>INFINITY</span>
                  <span>CAREERS</span>
                </span>
              </Link>
              <p className="mt-7 max-w-[25rem] text-[clamp(1.125rem,1rem+0.4vw,1.4375rem)]/[1.5] text-petrol/85">
                Discover career opportunities across Infinity&apos;s hospitality, entertainment and corporate businesses.
              </p>
              {(CONTACT.email || CONTACT.phone) && (
                <ul className={list}>
                  {CONTACT.email && (
                    <li>
                      <a href={`mailto:${CONTACT.email}`} className={link}>
                        {CONTACT.email}
                      </a>
                    </li>
                  )}
                  {CONTACT.phone && (
                    <li>
                      <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className={link}>
                        {CONTACT.phone}
                      </a>
                    </li>
                  )}
                </ul>
              )}
            </div>

            <nav data-footer-reveal aria-label="Careers">
              <p className={label}>CAREERS</p>
              <ul className={list}>
                <li>
                  <Link href="/roles" className={link}>
                    Positions
                  </Link>
                </li>
                <li>
                  <Link href="/properties" className={link}>
                    Explore Properties
                  </Link>
                </li>
                <li>
                  <Link href="/#why-infinity" className={link}>
                    Why Infinity
                  </Link>
                </li>
              </ul>
            </nav>

            <div data-footer-reveal>
              <p className={label}>OUR LOCATIONS</p>
              <ul className={list}>
                {CITIES.map((city) => (
                  <li key={city} className={`pb-1 ${item}`}>
                    {city}
                  </li>
                ))}
              </ul>
            </div>

            {/* FOLLOW US, without icons: each channel on a faint rule, its name in medium weight and a
                small arrow at the right. On hover the name turns Infinity Yellow, the arrow slips up and
                to the right, and a yellow line draws across from the left. A channel without a confirmed
                profile URL (lib/site/contact.ts) is the same line as plain text, not a link. */}
            <nav data-footer-reveal aria-label="Follow us" className="col-span-2 md:col-span-1">
              <p className={label}>FOLLOW US</p>
              <ul className="mt-3.5">
                {SOCIALS.map((social) => {
                  const row = "relative flex items-center justify-between gap-8 border-b border-petrol/10 py-2.5";
                  const arrow = (
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-[0.8em] shrink-0 transition-[translate,color] duration-500 ease-premium group-hover/social:translate-x-[3px] group-hover/social:-translate-y-[3px] group-hover/social:text-accent group-focus-visible/social:translate-x-[3px] group-focus-visible/social:-translate-y-[3px] group-focus-visible/social:text-accent">
                      <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  );
                  return (
                    <li key={social.label} className={`${item} font-medium`}>
                      {social.href ? (
                        <a href={social.href} target="_blank" rel="noreferrer" className={`group/social ${row} text-petrol outline-none`}>
                          <span className="transition-colors duration-500 ease-premium group-hover/social:text-accent group-focus-visible/social:text-accent">{social.label}</span>
                          {arrow}
                          <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-accent transition-transform duration-500 ease-premium group-hover/social:scale-x-100 group-focus-visible/social:scale-x-100" />
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <span className={`${row} text-petrol`}>
                          <span>{social.label}</span>
                          <span className="text-petrol/35">{arrow}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* The signature: INFINITY CAREERS in type alone (the mark stays with the brand above), bold
              petrol, its size the full content width divided by its length in em, so it spans the
              columns edge to edge at every width. */}
          <div data-footer-reveal className="@container mt-[clamp(4.5rem,8vw,8.5rem)]">
            <p
              aria-hidden="true"
              data-wordmark
              className="whitespace-nowrap font-bold leading-[0.78] tracking-[-0.035em] text-petrol"
              style={{ fontSize: `calc(100cqw / var(--wordmark-ems, ${WORDMARK_EMS}))` }}
            >
              {/* The pad gives back the last letter's negative tracking, so the measure is its full advance. */}
              <span className="inline-block pr-[0.035em]">INFINITY CAREERS</span>
            </p>
          </div>
        </div>

        <div className="mt-[clamp(2.25rem,3.5vw,3rem)] flex flex-wrap items-center justify-between gap-4 border-t border-petrol/10 pt-5 text-small text-petrol/65">
          <p>
            © <span data-year /> Infinity Careers
          </p>
          {LEGAL_LINKS.length > 0 && (
            <ul className="flex flex-wrap gap-6">
              {LEGAL_LINKS.map((legal) => (
                <li key={legal.href}>
                  <Link href={legal.href} className="underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-300 hover:text-[#091a1c] hover:decoration-accent">
                    {legal.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
