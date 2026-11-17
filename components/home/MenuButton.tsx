"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { prefersReducedMotion } from "@/lib/motion";
import { CITIES } from "@/lib/properties/destinations";
import { jumpToSection, onSectionRequest, requestSection, type HomeSection } from "@/lib/site/navigation";

/**
 * The main menu, in its fixed order: home and the site's four pages, numbered
 * 01–05 by their place here. An item without a `section` or `href` is listed but
 * not linked ("Coming soon"); none is, at present.
 */
type MenuItem = { label: string; section?: HomeSection; href?: string };

const ITEMS: MenuItem[] = [
  { label: "Home", section: "home" },
  { label: "Company", href: "/company" },
  { label: "Properties", href: "/properties" },
  { label: "Positions", href: "/roles" },
  { label: "Contact", href: "/contact" },
];

const HREF: Record<HomeSection, string> = { home: "/", properties: "/", positions: "/#roles" };

/** The page each item stands for: its own route (and what belongs to it: a job's page is a position). */
function isCurrent(item: MenuItem, pathname: string) {
  if (item.section === "home") return pathname === "/";
  if (!item.href) return false;
  if (item.href === "/roles" && pathname.startsWith("/jobs/")) return true;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Holds the page still under the open menu. A scrollbar keeps its space (so
 * nothing shifts), painted the menu's teal; the header's light type stays until
 * the menu has drawn back. Returns how to let it go.
 */
function holdPage(header: HTMLElement | null) {
  const root = document.documentElement;
  const before = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter, color: root.style.backgroundColor, image: root.style.backgroundImage };
  if (window.innerWidth > root.clientWidth) {
    root.style.scrollbarGutter = "stable";
    root.style.backgroundColor = "#102f32";
    root.style.backgroundImage = "none";
  }
  root.style.overflow = "hidden";
  if (header) header.dataset.tone = "dark";
  return () => {
    root.style.overflow = before.overflow;
    root.style.scrollbarGutter = before.gutter;
    root.style.backgroundColor = before.color;
    root.style.backgroundImage = before.image;
    window.dispatchEvent(new Event("header:tone"));
  };
}

/**
 * The menu trigger and the full-screen menu it opens. The dark teal floods out
 * from the button, the links rise out of their lines one after another, and it
 * all draws back into the button on closing; the page underneath moves while
 * it is covered, so a destination is simply there when the menu lifts.
 */
/**
 * Where the menu is drawn: straight into <body>, outside the header. A full-screen `fixed` layer
 * must not have a transformed, filtered or contained ancestor (any of them becomes its containing
 * block, and the "full-screen" menu shrinks to that ancestor's box): the header slides, and the
 * intro animates the wrapper around this button. On the server, and while hydrating, there is no
 * host yet; the menu is closed then, so nothing is missing.
 */
const noSubscribe = () => () => {};
const useBody = () => useSyncExternalStore(noSubscribe, () => document.body, () => null);

export function MenuButton() {
  const [open, setOpen] = useState(false);
  // Its own id: the pages Next.js keeps alive for Back and Forward each keep their own header.
  const menuId = useId();
  const host = useBody();
  const pathname = usePathname();
  const onHome = pathname === "/";
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  /** Lets the page go once the menu has drawn back (holdPage). */
  const release = useRef<(() => void) | null>(null);

  // The choreography, built once; opening plays it, closing reverses it.
  useLayoutEffect(() => {
    const nav = panel.current;
    const trigger = button.current;
    if (!nav || !trigger) return;
    const q = gsap.utils.selector(nav);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        paused: true,
        onReverseComplete: () => {
          gsap.set(nav, { visibility: "hidden" });
          release.current?.();
          release.current = null;
        },
      });
      // Not at once: a set at the very start of a paused timeline would otherwise apply as it is
      // built, marking the closed menu visible (clipped to nothing, but not hidden as it should be).
      tl.set(nav, { visibility: "visible", immediateRender: false });
      if (prefersReducedMotion()) {
        tl.fromTo(nav, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none" });
      } else {
        // From the button's centre, wide enough to cover the farthest corner.
        const origin = () => {
          const box = trigger.getBoundingClientRect();
          const x = box.left + box.width / 2;
          const y = box.top + box.height / 2;
          return { x, y, r: Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) };
        };
        tl.fromTo(
          nav,
          { clipPath: () => { const o = origin(); return `circle(0px at ${o.x}px ${o.y}px)`; } },
          { clipPath: () => { const o = origin(); return `circle(${o.r}px at ${o.x}px ${o.y}px)`; }, duration: 0.85, ease: "power4.inOut" },
        )
          .fromTo(q("[data-menu-mark]"), { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 1.2, ease: "expo.out" }, 0.3)
          .fromTo(q("[data-menu-rule]"), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "expo.out", stagger: 0.06 }, 0.38)
          .fromTo(q("[data-menu-label]"), { yPercent: 110, rotate: 2 }, { yPercent: 0, rotate: 0, duration: 0.95, ease: "expo.out", stagger: 0.07 }, 0.42)
          .fromTo(q("[data-menu-number]"), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.7, ease: "power3.out", stagger: 0.07 }, 0.55)
          .fromTo(q("[data-menu-foot]"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }, 0.7);
      }
      timeline.current = tl;
    }, nav);
    return () => {
      ctx.revert();
      // The open effect shows the panel directly (outside this context, so the first link can take
      // focus at once): take that back too, or a page Next.js keeps for Back/Forward, hidden while
      // its menu was closing, comes back with the panel marked visible.
      nav.style.removeProperty("visibility");
      timeline.current = null;
      release.current?.();
      release.current = null;
    };
  }, [host]);

  // Open: play, hold the page still, keep focus inside; closed: reverse, a little quicker.
  useEffect(() => {
    const tl = timeline.current;
    if (!tl) return;
    if (!open) {
      if (tl.progress() > 0) tl.timeScale(1.5).reverse();
      return;
    }
    tl.invalidate().timeScale(1).play();
    if (!release.current) release.current = holdPage(button.current?.closest<HTMLElement>("[data-site-header]") ?? null);
    // Visible now, not on the timeline's next tick, so the first link can take focus.
    if (panel.current) gsap.set(panel.current, { visibility: "visible" });
    panel.current?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      // The button (now Close) and the menu's links are the only stops.
      const stops = [button.current, ...(panel.current?.querySelectorAll<HTMLElement>("a[href]") ?? [])].filter((el): el is HTMLElement => !!el);
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!stops.includes(document.activeElement as HTMLElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // A section asked for from another page, once the home page is ready for it.
  useEffect(() => (onHome ? onSectionRequest() : undefined), [onHome]);

  function toggle() {
    setOpen((value) => !value);
  }

  function go(event: MouseEvent<HTMLAnchorElement>, section: HomeSection) {
    if (onHome) {
      // Under the menu, the page moves at once; the menu lifts onto the destination.
      event.preventDefault();
      jumpToSection(section);
    } else {
      requestSection(section);
    }
    setOpen(false);
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        data-menu-trigger
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={toggle}
        className={`group relative z-10 flex h-11 cursor-pointer items-center gap-2.5 rounded-full pl-4 pr-1.5 text-button font-medium transition-colors duration-[250ms] ease-out ${
          open
            ? "bg-neutral text-primary hover:bg-accent active:bg-accent focus-visible:outline-neutral"
            : "bg-petrol text-neutral ring-1 ring-neutral/45 hover:bg-petrol-soft active:bg-petrol"
        }`}
      >
        {/* Label rolls from "Menu" to "Close". */}
        <span aria-hidden="true" className="relative block h-5 overflow-hidden">
          <span className={`block transition-transform duration-500 ease-premium ${open ? "-translate-y-1/2" : ""}`}>
            <span className="block h-5 leading-5">Menu</span>
            <span className="block h-5 leading-5">Close</span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative flex size-8 items-center justify-center rounded-full transition-colors duration-[250ms] ease-out ${open ? "bg-petrol" : "bg-accent"}`}
        >
          <span
            className={`absolute h-[1.5px] w-3.5 rounded-full transition-transform duration-500 ease-premium ${
              open ? "rotate-45 bg-neutral" : "-translate-y-[3px] bg-primary"
            }`}
          />
          <span
            className={`absolute h-[1.5px] w-3.5 rounded-full transition-transform duration-500 ease-premium ${
              open ? "-rotate-45 bg-neutral" : "translate-y-[3px] bg-primary"
            }`}
          />
        </span>
      </button>

      {host &&
        createPortal(
      <nav ref={panel} id={menuId} aria-label="Main" inert={!open} className="invisible fixed inset-0 z-[39] overflow-hidden bg-petrol text-neutral">
        {/* The brand's mark, large and barely there, on the right. */}
        <InfinityMark
          data-menu-mark
          aria-hidden="true"
          fill="#f7f7f2"
          className="pointer-events-none absolute -right-[8vw] top-1/2 h-auto w-[min(58vw,92vh)] -translate-y-1/2 opacity-0 [&>polygon]:opacity-[0.035] max-md:-right-[30vw] max-md:w-[110vw]"
        />

        <div className="relative flex h-full flex-col overflow-y-auto overscroll-contain px-(--gutter) pb-[clamp(1.5rem,4vh,2.5rem)] pt-[clamp(5rem,15vh,9rem)]">
          <ol className="group/list my-auto w-full max-w-[64rem]">
            {ITEMS.map((item, i) => {
              const number = String(i + 1).padStart(2, "0");
              // A home section (scrolled to) or a page of its own (/properties, /roles): either is a link.
              const href = item.section ? HREF[item.section] : item.href;
              const isActive = isCurrent(item, pathname);
              const inner = (
                <>
                  <span data-menu-number className="w-[clamp(2.25rem,4vw,3.5rem)] shrink-0 pt-[0.5em] text-small font-medium tabular-nums tracking-normal text-neutral/55 transition-colors duration-300 group-hover/link:text-accent group-focus-visible/link:text-accent group-aria-[current=page]/link:text-accent">
                    {number}
                  </span>
                  <span className="-my-[0.12em] block overflow-hidden py-[0.12em] pr-[0.2em]">
                    <span data-menu-label className="block origin-bottom-left">
                      <span className="block transition-[color,translate] duration-500 ease-premium group-hover/link:translate-x-[0.12em] group-hover/link:text-accent group-focus-visible/link:translate-x-[0.12em] group-focus-visible/link:text-accent group-aria-[current=page]/link:text-accent">
                        {item.label}
                      </span>
                    </span>
                  </span>
                  {href ? (
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="ml-auto hidden size-[clamp(1.5rem,2.4vw,2.25rem)] shrink-0 -translate-x-3 self-center text-accent opacity-0 transition-[opacity,translate] duration-500 ease-premium group-hover/link:translate-x-0 group-hover/link:opacity-100 group-focus-visible/link:translate-x-0 group-focus-visible/link:opacity-100 md:block"
                    >
                      <path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="ml-auto self-center whitespace-nowrap pl-4 text-small tracking-normal text-neutral/45">Coming soon</span>
                  )}
                </>
              );
              const row = "flex items-start py-[clamp(0.45rem,1.6vh,1rem)] text-[min(clamp(2.5rem,1.2rem+5vw,6.25rem),10.5svh)] font-medium leading-none tracking-[-0.035em]";
              return (
                <li key={item.label} className="relative">
                  {href ? (
                    <Link
                      href={href}
                      onClick={(event) => (item.section ? go(event, item.section) : setOpen(false))}
                      aria-current={isActive ? "page" : undefined}
                      className={`group/link ${row} outline-none transition-opacity duration-500 ease-premium group-hover/list:opacity-40 hover:opacity-100! focus-visible:opacity-100!`}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className={`${row} text-neutral/35`}>
                      {inner}
                    </div>
                  )}
                  <span data-menu-rule aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px origin-left bg-neutral/12" />
                </li>
              );
            })}
          </ol>

          {/* The tagline and cities: left out on a very short screen (a phone on its side), where they would make the menu scroll. */}
          <div className="mt-[clamp(2rem,6vh,4rem)] flex flex-col gap-4 text-small text-neutral/65 sm:flex-row sm:items-end sm:justify-between [@media(max-height:30rem)]:hidden">
            <p data-menu-foot>
              Infinity <span className="text-accent">·</span> Hospitality &amp; Entertainment
            </p>
            <ul data-menu-foot aria-label="Our locations" className="flex flex-wrap gap-x-5 gap-y-1">
              {CITIES.map((city) => (
                <li key={city}>{city}</li>
              ))}
            </ul>
          </div>
        </div>
      </nav>,
          host,
        )}
    </>
  );
}
