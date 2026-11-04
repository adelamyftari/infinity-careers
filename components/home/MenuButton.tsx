"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMagnetic } from "@/lib/hooks/use-magnetic";

const LINKS = [
  { label: "Open roles", href: "/#roles" },
  { label: "Our properties", href: "/properties" },
  { label: "Life at Infinity", href: "#" },
  { label: "Students & graduates", href: "#" },
  { label: "Contact", href: "#" },
];

/** The menu trigger and the panel it unfolds: a clip-path wipe, links rising in turn. */
export function MenuButton() {
  const [open, setOpen] = useState(false);
  const button = useMagnetic<HTMLButtonElement>(0.25);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, button]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((value) => !value)}
        className={`group relative z-10 flex h-12 items-center gap-3 rounded-full pl-5 pr-1.5 text-sm font-medium outline-none transition-colors duration-500 ease-premium focus-visible:ring-2 focus-visible:ring-gold ${
          open ? "bg-white text-ink" : "bg-ink text-white"
        }`}
      >
        {/* Label rolls from "Menu" to "Close". */}
        <span className="relative block h-5 overflow-hidden">
          <span className={`block transition-transform duration-500 ease-premium ${open ? "-translate-y-full" : ""}`}>
            <span className="block h-5 leading-5">Menu</span>
            <span className="block h-5 leading-5">Close</span>
          </span>
        </span>
        <span
          className={`relative flex size-9 items-center justify-center rounded-full transition-colors duration-500 ${open ? "bg-ink" : "bg-gold"}`}
        >
          <span
            className={`absolute h-[1.5px] w-3.5 rounded-full transition-transform duration-500 ease-premium ${
              open ? "rotate-45 bg-white" : "-translate-y-[3px] bg-ink group-hover:w-3"
            }`}
          />
          <span
            className={`absolute h-[1.5px] w-3.5 rounded-full transition-transform duration-500 ease-premium ${
              open ? "-rotate-45 bg-white" : "translate-y-[3px] bg-ink"
            }`}
          />
        </span>
      </button>

      <nav
        id="site-menu"
        aria-label="Main"
        inert={!open}
        className={`fixed right-3 top-3 w-[min(calc(100vw-1.5rem),30rem)] rounded-[32px] bg-ink px-8 pb-8 pt-24 text-white shadow-[0_40px_80px_-30px_rgb(20_21_24/0.6)] transition-[clip-path] duration-900 ease-premium ${
          open ? "[clip-path:inset(0_0_0_0_round_32px)]" : "[clip-path:inset(0_0_100%_40%_round_32px)]"
        }`}
      >
        <ul>
          {LINKS.map((link, i) => (
            <li key={link.label} className="overflow-hidden border-b border-white/10">
              <Link
                ref={i === 0 ? firstLink : undefined}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{ transitionDelay: open ? `${120 + i * 50}ms` : "0ms" }}
                className={`group/link flex items-baseline justify-between py-4 text-[clamp(1.6rem,3vw,2.1rem)] font-medium tracking-[-0.03em] outline-none transition-[transform,opacity] duration-700 ease-premium focus-visible:text-gold ${
                  open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                }`}
              >
                <span className="transition-transform duration-500 ease-premium group-hover/link:translate-x-2">{link.label}</span>
                <span className="font-mono text-[11px] tracking-[0.16em] text-white/35 transition-colors group-hover/link:text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
          Infinity <span className="text-gold">·</span> Hospitality &amp; Entertainment
        </p>
      </nav>
    </>
  );
}
