"use client";

import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { PROPERTIES } from "@/lib/properties/properties";
import { PropertyDetailPanel } from "./PropertyDetailPanel";

gsap.registerPlugin(ScrollTrigger);

// The map (MapLibre + OpenFreeMap) only exists in the browser, and its code
// only loads with the section.
const AlbaniaPropertyMap = dynamic(() => import("./AlbaniaPropertyMap").then((module) => module.AlbaniaPropertyMap), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "Where we are": Infinity's destinations on a real map of Albania, with the
 * selected one in a detail panel beside it. Map pins, the panel's arrows and
 * the index below all drive one selection.
 *
 * The /properties page; it sits on that page's dotted off-white.
 */
export function PropertiesSection() {
  const root = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState(PROPERTIES[0].id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const index = Math.max(0, PROPERTIES.findIndex((property) => property.id === selectedId));
  const selected = PROPERTIES[index];
  const count = PROPERTIES.length;

  // From the latest selection, so quick repeated presses each count.
  const step = useCallback((delta: number) => {
    setSelectedId((current) => {
      const from = PROPERTIES.findIndex((property) => property.id === current);
      return PROPERTIES[(from + delta + PROPERTIES.length) % PROPERTIES.length].id;
    });
  }, []);

  function onIndexKey(event: KeyboardEvent<HTMLDivElement>) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + count) % count;
    setSelectedId(PROPERTIES[next].id);
    tabs.current[next]?.focus();
  }

  // Entrance: plays once, as the section comes into view.
  useLayoutEffect(() => {
    const section = root.current;
    if (!section || prefersReducedMotion()) return;
    const q = gsap.utils.selector(section);

    const entrance = gsap
      .timeline({ paused: true, defaults: { ease: EASE } })
      .fromTo(q("[data-title] > *"), { yPercent: 105 }, { yPercent: 0, duration: 1.1 }, 0)
      .fromTo(q("[data-rise]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.12)
      .fromTo(q("[data-map-frame]"), { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0.22)
      .fromTo(q("[data-panel-frame]"), { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0.34);

    const view = ScrollTrigger.create({ trigger: section, start: "top 85%", once: true, onEnter: () => entrance.play() });

    return () => {
      view.kill();
      entrance.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      id="properties"
      aria-labelledby="properties-title"
      className="px-(--gutter) pb-[clamp(5rem,10vw,8rem)] pt-[clamp(3rem,7vw,6rem)] text-foreground"
    >
      <header className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p data-rise className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/55">
            <span aria-hidden="true" className="h-px w-6 bg-signature" />
            Our properties
          </p>
          <h2 id="properties-title" data-title className="mt-5 overflow-hidden pb-[0.08em]">
            <span className="block text-[clamp(3.25rem,8vw,8.5rem)] font-medium leading-[0.9] tracking-[-0.055em]">
              Where we <em className="font-serif text-[1.08em] font-normal italic tracking-[-0.02em]">are</em>
              <span className="text-signature">.</span>
            </span>
          </h2>
        </div>
        <p data-rise className="max-w-sm text-[clamp(1rem,1.15vw,1.125rem)] leading-relaxed text-foreground/65 lg:col-span-4 lg:pb-3">
          Explore the places we call home and discover opportunities across our destinations.
        </p>
      </header>

      <div className="mt-[clamp(2.5rem,5vw,4.5rem)] grid gap-4 md:grid-cols-[1.08fr_1fr] lg:grid-cols-[52fr_48fr] lg:gap-5">
        {/* Albania stands about twice as tall as it is wide: give it height. */}
        <div data-map-frame className="h-[clamp(28rem,125vw,38rem)] min-w-0 md:h-auto md:min-h-[38rem] lg:h-[min(84vh,50rem)] lg:min-h-0">
          <AlbaniaPropertyMap properties={PROPERTIES} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div data-panel-frame className="min-w-0">
          <PropertyDetailPanel
            properties={PROPERTIES}
            property={selected}
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
          />
        </div>
      </div>

      {/* The index: every destination one tap away; arrow keys move along it. */}
      <div
        data-rise
        role="group"
        aria-label="Choose a property"
        onKeyDown={onIndexKey}
        className="-mx-(--gutter) mt-6 flex gap-2 overflow-x-auto px-(--gutter) pb-1 [scrollbar-width:none]"
      >
        {PROPERTIES.map((property, i) => {
          const active = property.id === selectedId;
          return (
            <button
              key={property.id}
              ref={(node) => {
                tabs.current[i] = node;
              }}
              type="button"
              aria-pressed={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelectedId(property.id)}
              className={`group flex shrink-0 cursor-pointer items-baseline gap-2.5 rounded-full px-4 py-2.5 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-signature ${
                active ? "bg-ink/[0.06] text-foreground" : "text-foreground/50 hover:text-foreground/80"
              }`}
            >
              <span className={`font-mono text-[10.5px] ${active ? "text-gold-deep" : ""}`}>{pad(i + 1)}</span>
              <span className="whitespace-nowrap text-[13.5px]">{property.name}</span>
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {selected.name}, {selected.city}. Property {index + 1} of {count}.
      </p>
    </section>
  );
}
