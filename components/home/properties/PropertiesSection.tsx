"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import gsap from "gsap";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { HEADQUARTERS, LOCATIONS, PROPERTIES, PROPERTY_PARAM, propertyBySlug } from "@/lib/properties/properties";
import { PropertyExplorer } from "./PropertyExplorer";

// The map (MapLibre + OpenFreeMap) only exists in the browser, and its code
// only loads with the section.
const AlbaniaPropertyMap = dynamic(() => import("./AlbaniaPropertyMap").then((module) => module.AlbaniaPropertyMap), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

/**
 * The /properties page: an editorial introduction, then the seven destinations as
 * one system, the map of Albania on the left and the glass cards beside it. A
 * marker, a card, an arrow or a number all drive one selection; a card under the
 * pointer shows its marker on the map.
 *
 * On Dark Forest Teal, so the light map plate stands out and the cards read as glass.
 *
 * The selection lives in the URL (/properties?property=hotel-butrinti): read from
 * it, so a shared, refreshed or homepage link opens on that property from the first
 * frame; choosing another pushes a history entry (no reload), so back and forward
 * step through the choices. A missing or unknown value is the first property.
 */
export function PropertiesSection() {
  const root = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();
  const named = propertyBySlug(searchParams.get(PROPERTY_PARAM));
  const selected = named ?? PROPERTIES[0];
  const selectedId = selected.id;
  const select = useCallback((id: string) => {
    const property = LOCATIONS.find((candidate) => candidate.id === id);
    if (!property) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(PROPERTY_PARAM) === property.slug) return;
    params.set(PROPERTY_PARAM, property.slug);
    window.history.pushState(null, "", `?${params.toString()}`);
  }, []);

  // Opened on a named property (a link from the homepage, a shared address): bring the map and
  // its card into view, once, under the introduction.
  const stage = useRef<HTMLDivElement>(null);
  const arrivedNamed = useRef(Boolean(named));
  useEffect(() => {
    if (!arrivedNamed.current) return;
    arrivedNamed.current = false;
    const frame = window.setTimeout(() => stage.current?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" }), 450);
    return () => window.clearTimeout(frame);
  }, []);

  // The entrance, in order: the eyebrow, the headline's two lines, the description, then the
  // map rising into place and the cards stepping in from depth.
  useLayoutEffect(() => {
    const section = root.current;
    if (!section || prefersReducedMotion()) return;
    const q = gsap.utils.selector(section);
    const intro = gsap
      .timeline({ defaults: { ease: EASE } })
      .fromTo(q("[data-eyebrow]"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.1)
      .fromTo(q("[data-line]"), { yPercent: 108 }, { yPercent: 0, duration: 1.15, stagger: 0.12 }, 0.18)
      .fromTo(q("[data-lede]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.55)
      .fromTo(q("[data-map-frame]"), { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.7)
      .fromTo(q("[data-explorer]"), { autoAlpha: 0, y: 24, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1.1 }, 0.85);
    return () => void intro.revert();
  }, []);

  return (
    <section
      ref={root}
      id="properties"
      aria-labelledby="properties-title"
      data-header-surface
      data-tone="dark"
      className="relative isolate overflow-x-clip bg-petrol px-(--gutter) pb-[clamp(4rem,8vw,7rem)] pt-[calc(5rem+clamp(2.5rem,6vw,5rem))] text-neutral"
    >
      {/* The field's own faint dotted grid. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle,rgb(247_247_242/0.07)_1.2px,transparent_1.2px)] bg-size-[28px_28px]" />

      <header className="max-w-[72rem]">
        <p data-eyebrow className="text-label font-medium tracking-[0.18em] text-accent">
          EXPLORE INFINITY
        </p>
        <h1 id="properties-title" aria-label="7 Properties. One world." className="mt-5 text-[clamp(2.75rem,1.2rem+6.6vw,8.25rem)] font-bold leading-[0.9] tracking-[-0.04em]">
          <span aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
            <span data-line className="block">7 PROPERTIES.</span>
          </span>
          <span aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
            <span data-line className="block text-accent">ONE WORLD.</span>
          </span>
        </h1>
        <p data-lede className="mt-[clamp(1.25rem,2.5vw,2rem)] max-w-[38rem] text-lead text-neutral/75">
          Discover the destinations behind Infinity. Explore our properties across Albania and the opportunities that connect them.
        </p>
      </header>

      <div ref={stage} className="mt-[clamp(2.5rem,6vw,5rem)] grid scroll-mt-24 items-center gap-[clamp(1.5rem,3vw,3rem)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)]">
        {/* Albania stands about twice as tall as it is wide: give it height. */}
        <div data-map-frame className="relative h-[clamp(26rem,118vw,34rem)] min-w-0 md:h-[min(80vh,46rem)] lg:h-[min(86vh,52rem)]">
          <AlbaniaPropertyMap locations={LOCATIONS} selectedId={selectedId} onSelect={select} />
          {/* A property without verified coordinates has no pin: say so, in the map's free top corner. */}
          {!selected.position && (
            <p role="status" className="absolute left-0 top-0 max-w-[15rem] rounded-2xl bg-petrol/85 px-4 py-3 text-small text-neutral/80 ring-1 ring-neutral/15 backdrop-blur-md">
              <span className="font-medium text-neutral">{selected.name}</span> is shown at {selected.city}&apos;s city point: its exact location is still to be confirmed.
            </p>
          )}
        </div>

        <div data-explorer className="min-w-0">
          <PropertyExplorer properties={PROPERTIES} headquarters={HEADQUARTERS} selected={selected} onSelect={select} />
        </div>
      </div>
    </section>
  );
}
