"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { EASE } from "@/lib/motion";
import { getDepartment } from "@/lib/careers/taxonomy";
import {
  CAREER_AREAS,
  CAREER_AREAS_LABEL,
  openPositionsHref,
  openRoleCount,
  PROPERTY_CATEGORY_LABEL,
  type Property,
} from "@/lib/properties/properties";

const pad = (n: number) => String(n).padStart(2, "0");

/** The card's lower-right notch, where "Explore open positions" stands outside the glass. */
const PILL = { height: 46, gap: 8, share: 0.5, min: 236 };
/** The card's tilt toward the cursor, at most (deg), and its lift (px). */
const TILT = { max: 3, lift: 4, follow: 0.5 };
/** A property's hand-over: out, a short step one way; in, from the other. */
const SWAP = { distance: 28, out: 0.26, in: 0.6 };
/** The gallery: the share of its width one photo takes (the rest previews the next), the gap, the glide. */
const GALLERY = { share: 0.8, gap: 10, glide: 0.6 };
/** Up to this many photographs, a "more to come" tile closes the gallery. */
const FULL_GALLERY = 5;

type ExplorerProps = {
  /** The seven, in order. */
  properties: Property[];
  /** The headquarters: shown here when chosen on the map, outside the count of seven. */
  headquarters: Property;
  selected: Property;
  onSelect: (id: string) => void;
};

/**
 * The selected location as one glass card beside the map: its photographs, its
 * information and the way to its open positions. Choosing another plays one short
 * hand-over; a newer choice always wins, so quick clicks never stack or skip.
 * Below it: where it stands in the seven, and the arrows between them.
 */
export function PropertyExplorer({ properties, headquarters, selected, onSelect }: ExplorerProps) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(selected);
  const target = useRef(selected);
  const card = useRef<HTMLDivElement>(null);
  const motion = useRef<gsap.core.Timeline | null>(null);
  const direction = useRef(1);
  const displayed = reduced ? selected : shown;

  const index = properties.findIndex((property) => property.id === selected.id);
  const isHeadquarters = selected.id === headquarters.id;
  const total = properties.length;
  const displayedIndex = properties.findIndex((property) => property.id === displayed.id);

  // Out: the current card steps away; then the newest choice comes in.
  useEffect(() => {
    target.current = selected;
    const el = card.current;
    if (reduced || !el || selected.id === shown.id) return;
    const from = properties.findIndex((property) => property.id === shown.id);
    const to = properties.findIndex((property) => property.id === selected.id);
    direction.current = to >= 0 && from >= 0 && to < from ? -1 : 1;
    motion.current?.kill();
    motion.current = gsap.timeline({ onComplete: () => setShown(target.current) }).to(el, {
      x: -direction.current * SWAP.distance,
      autoAlpha: 0,
      duration: SWAP.out,
      ease: "power2.in",
    });
  }, [selected, reduced, shown, properties]);

  // In: the new card arrives from the other side.
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = card.current;
    if (first.current || !el || reduced) {
      first.current = false;
      return;
    }
    motion.current?.kill();
    motion.current = gsap
      .timeline()
      .fromTo(el, { x: direction.current * SWAP.distance, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: SWAP.in, ease: EASE });
  }, [shown.id, reduced]);

  useEffect(() => () => void motion.current?.kill(), []);

  const step = (delta: number) => {
    // From the headquarters, the arrows lead into the seven.
    const from = isHeadquarters ? (delta > 0 ? -1 : total) : index;
    onSelect(properties[(from + delta + total) % total].id);
  };

  return (
    <div className="flex h-full flex-col justify-center">
      <div ref={card} className="relative">
        {/* Keyed by property, so its gallery starts again at the first photograph. */}
        <GlassCard key={displayed.id} property={displayed} number={displayedIndex >= 0 ? displayedIndex + 1 : null} total={total} reduced={reduced} />
      </div>

      {/* Between the seven: where this one stands, each by its mark, and the arrows. */}
      <nav aria-label="Properties" className="mt-6 flex items-center justify-between gap-4">
        <p className="min-w-[4.5rem] text-small tabular-nums text-neutral/60" aria-hidden="true">
          {isHeadquarters ? (
            <span className="font-medium text-neutral">HQ</span>
          ) : (
            <>
              <span className="font-medium text-neutral">{pad(index + 1)}</span> / {pad(total)}
            </>
          )}
        </p>
        <ol className="hidden items-center gap-1 lg:flex">
          {properties.map((property, i) => (
            <li key={property.id}>
              <button
                type="button"
                aria-label={`${property.name}, ${property.city}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => onSelect(property.id)}
                className="group flex h-10 cursor-pointer items-center px-1.5"
              >
                <span
                  className={`block h-[3px] rounded-full transition-[width,background-color] duration-500 ease-premium ${
                    i === index ? "w-7 bg-accent" : "w-3 bg-neutral/25 group-hover:bg-neutral/60"
                  }`}
                />
              </button>
            </li>
          ))}
        </ol>
        <div className="flex gap-2">
          <ArrowButton label="Previous property" onClick={() => step(-1)} path="M10 3 5 8l5 5" />
          <ArrowButton label="Next property" onClick={() => step(1)} path="m6 3 5 5-5 5" />
        </div>
      </nav>

      <p aria-live="polite" className="sr-only">
        {isHeadquarters ? `${selected.name}, ${selected.city}. Administrative location.` : `${selected.name}, ${selected.city}. Property ${index + 1} of ${total}.`}
      </p>
    </div>
  );
}

/** The card's outline in pixels: rounded, with a stepped notch at the lower right for the button. */
function silhouette(w: number, h: number, pillWidth: number) {
  const r = 26;
  const step = 14;
  const notchTop = h - PILL.height - PILL.gap;
  const notchLeft = w - pillWidth - PILL.gap;
  return [
    `M0 ${r}`,
    `A${r} ${r} 0 0 1 ${r} 0`,
    `H${w - r}`,
    `A${r} ${r} 0 0 1 ${w} ${r}`,
    `V${notchTop - step}`,
    `A${step} ${step} 0 0 1 ${w - step} ${notchTop}`,
    `H${notchLeft + step}`,
    `A${step} ${step} 0 0 0 ${notchLeft} ${notchTop + step}`,
    `V${h - step}`,
    `A${step} ${step} 0 0 1 ${notchLeft - step} ${h}`,
    `H${r}`,
    `A${r} ${r} 0 0 1 0 ${h - r}`,
    "Z",
  ].join(" ");
}

/** Measures an element, so the silhouette and the gallery can work in exact pixels. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * One location as glass: the photographs, then its category and place, its name, its
 * copy, the career areas of its kind of business and its openings; "Explore open
 * positions" stands in the notch, outside the glass and clear of the photographs. The card
 * leans a few degrees toward the cursor and lifts a little; the photographs stay flat
 * within it.
 */
function GlassCard({ property, number, total, reduced }: { property: Property; number: number | null; total: number; reduced: boolean }) {
  const [box, size] = useSize<HTMLDivElement>();
  const tilt = useRef<HTMLDivElement>(null);
  const roles = openRoleCount(property);
  const areas = (property.careerAreas ?? CAREER_AREAS[property.category]).map((id) => getDepartment(id).name);
  const pillWidth = size ? Math.max(Math.min(PILL.min, size.w * 0.66), size.w * PILL.share) : PILL.min;
  // On a narrow card the button takes most of the last row: the openings line moves up into the copy.
  const narrow = size !== null && size.w < 440;
  const openings = roles > 0 ? `${roles} open ${roles === 1 ? "position" : "positions"}` : "No current openings listed";
  const path = size ? silhouette(size.w, size.h, pillWidth) : null;

  const turnTo = (rotationY: number, rotationX: number, y: number) => {
    if (tilt.current) gsap.to(tilt.current, { rotationY, rotationX, y, duration: TILT.follow, ease: "power3.out", overwrite: true });
  };
  useEffect(() => {
    const el = tilt.current;
    return () => void (el && gsap.killTweensOf(el));
  }, []);

  function onMove(event: ReactPointerEvent<HTMLDivElement>) {
    const el = tilt.current;
    if (!el || reduced || event.pointerType === "touch" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (event.clientX - r.left) / r.width;
    const py = (event.clientY - r.top) / r.height;
    turnTo((px - 0.5) * 2 * TILT.max, -(py - 0.5) * 2 * TILT.max, -TILT.lift);
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
  }

  return (
    <div className="[perspective:1600px]">
      <div ref={tilt} onPointerMove={onMove} onPointerLeave={() => turnTo(0, 0, 0)} className="group/card relative [transform-style:preserve-3d]">
        <div ref={box} className="relative">
          <article
            aria-labelledby={`property-${property.id}`}
            className="relative bg-[rgb(247_247_242/0.06)] text-neutral shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)] backdrop-blur-xl"
            style={{ clipPath: path ? `path('${path}')` : "inset(0 round 26px)" }}
          >
            {/* The glass: a soft inner light from above, and a highlight that follows the cursor. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(247_247_242/0.07),transparent_38%)]" />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 [background:radial-gradient(26rem_circle_at_var(--mx,50%)_var(--my,0%),rgb(247_247_242/0.08),transparent_62%)] group-hover/card:opacity-100"
            />

            <Gallery property={property} reduced={reduced} />

            <div className="relative px-[clamp(1.25rem,2.2vw,1.75rem)] pt-4">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label font-medium tracking-[0.14em]">
                <span className="text-accent">{PROPERTY_CATEGORY_LABEL[property.category].toUpperCase()}</span>
                <span aria-hidden="true" className="size-1 rounded-full bg-neutral/30" />
                <span className="tracking-[0.04em] text-neutral/65">{property.place ?? `${property.city}, Albania`}</span>
                {number !== null ? (
                  <span className="ml-auto tracking-normal text-neutral/45 tabular-nums">
                    {pad(number)} / {pad(total)}
                  </span>
                ) : (
                  <span className="ml-auto tracking-[0.08em] text-neutral/45">ADMINISTRATIVE LOCATION</span>
                )}
              </p>
              <h2 id={`property-${property.id}`} className="mt-2.5 text-balance text-[clamp(1.55rem,1.05rem+1.25vw,2.35rem)] font-medium leading-[1.04] tracking-[-0.02em]">
                {property.name}
              </h2>
              {property.organization && <p className="mt-1.5 text-small text-neutral/60">{property.organization}</p>}
              {/* The copy: one paragraph, or several where the description has blank lines between them. */}
              <div data-description className="mt-3 max-w-[56ch] space-y-2.5 text-body text-neutral/78">
                {property.description.split(/\n\s*\n/).map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-4 border-t border-neutral/10 pt-3.5">
                <p className="text-label text-neutral/50">{CAREER_AREAS_LABEL[property.category]}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {areas.map((area) => (
                    <li key={area} className="rounded-full bg-neutral/[0.06] px-3 py-1 text-label text-neutral/80 ring-1 ring-neutral/10">
                      {area}
                    </li>
                  ))}
                </ul>
                {narrow && <p className="mt-3 text-small text-neutral/60">{openings}</p>}
              </div>
            </div>

            {/* Beside the notch: the openings, as the published listings say. */}
            <div className="relative flex items-center px-[clamp(1.25rem,2.2vw,1.75rem)]" style={{ height: PILL.height + PILL.gap, paddingRight: pillWidth + PILL.gap + 12 }}>
              {!narrow && <p className="text-small text-neutral/60">{openings}</p>}
            </div>
          </article>

          {/* The glass edge, traced along the silhouette. */}
          {path && size && (
            <svg aria-hidden="true" viewBox={`0 0 ${size.w} ${size.h}`} className="pointer-events-none absolute inset-0 size-full overflow-visible">
              <path d={path} fill="none" className="stroke-neutral/20 transition-[stroke] duration-500 group-hover/card:stroke-neutral/35" strokeWidth="1" />
            </svg>
          )}

          {/* "Explore open positions": outside the glass, in its notch, to the open positions filtered to this location. */}
          <Link
            href={openPositionsHref(property)}
            className="group/cta absolute bottom-0 right-0 inline-flex items-center justify-center gap-2 rounded-[14px] bg-neutral text-small font-semibold tracking-[0.06em] text-petrol shadow-[0_16px_30px_-16px_rgb(0_0_0/0.7)] transition-colors duration-300 hover:bg-accent focus-visible:bg-accent"
            style={{ width: pillWidth, height: PILL.height }}
          >
            EXPLORE OPEN POSITIONS
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 transition-transform duration-500 ease-premium group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5">
              <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * The location's photographs: one whole, the next one's first fifth beside it, a clear gap
 * between. Its own arrows (and swipe, and the arrow keys while it has focus) move through
 * them, looping; they never change the property. A gallery short of five closes with a
 * tile that says more is to come, never pretending to be a photograph.
 */
function Gallery({ property, reduced }: { property: Property; reduced: boolean }) {
  const photos = property.gallery;
  const count = photos.length;
  const slides = count + (count < FULL_GALLERY ? 1 : 0);
  const [index, setIndex] = useState(0);
  const [viewport, size] = useSize<HTMLDivElement>();
  const track = useRef<HTMLDivElement>(null);
  const placed = useRef(false);

  // Glide to the photograph: the next one's fifth always previewed, the last one flush right.
  useLayoutEffect(() => {
    const el = track.current;
    if (!el || !size) return;
    const slide = size.w * GALLERY.share;
    const span = slides * slide + (slides - 1) * GALLERY.gap;
    const shift = Math.min(index * (slide + GALLERY.gap), Math.max(0, span - size.w));
    if (!placed.current || reduced) gsap.set(el, { x: -shift });
    else gsap.to(el, { x: -shift, duration: GALLERY.glide, ease: "power3.inOut", overwrite: true });
    placed.current = true;
  }, [index, size, slides, reduced]);

  const go = (delta: number) => setIndex((current) => (current + delta + count) % count);

  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse") swipe.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from || count < 2) return;
    const dx = event.clientX - from.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - from.y)) go(dx < 0 ? 1 : -1);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (count < 2) return;
    if (event.key === "ArrowRight") go(1);
    else if (event.key === "ArrowLeft") go(-1);
    else return;
    event.preventDefault();
  };

  return (
    <div role="group" aria-roledescription="gallery" aria-label={`${property.name} photographs`} onKeyDown={onKeyDown} className="relative p-2.5">
      <div ref={viewport} onPointerDown={onPointerDown} onPointerUp={onPointerUp} className="overflow-hidden rounded-[18px] [touch-action:pan-y]">
        <div ref={track} className="flex will-change-transform" style={{ gap: GALLERY.gap }}>
          {photos.map((photo, i) => (
            <div key={photo.src} className="relative aspect-[16/10] shrink-0 overflow-hidden rounded-[18px] bg-[#1d4245]" style={{ width: `${GALLERY.share * 100}%` }} aria-hidden={i !== index}>
              <Image
                src={photo.src}
                alt={i === index ? photo.alt : ""}
                fill
                sizes="(min-width: 1024px) 32vw, (min-width: 768px) 40vw, 76vw"
                loading={i <= index + 1 ? "eager" : "lazy"}
                className="object-cover transition-transform duration-[1.2s] ease-premium group-hover/card:scale-[1.03]"
              />
            </div>
          ))}
          {count < FULL_GALLERY && (
            <div aria-hidden="true" className="relative flex aspect-[16/10] shrink-0 flex-col items-center justify-center gap-3 rounded-[18px] bg-neutral/[0.04] text-neutral/45 ring-1 ring-inset ring-neutral/10" style={{ width: count === 0 ? "100%" : `${GALLERY.share * 100}%` }}>
              <InfinityMark fill="currentColor" className="size-7" />
              <span className="px-4 text-center text-label">{count === 0 ? "Photography to come" : "More photography to come"}</span>
            </div>
          )}
        </div>
      </div>

      {/* The gallery's own controls, below the photographs, never over them. */}
      {count > 1 && (
        <div className="mt-2.5 flex items-center justify-between px-1">
          <p className="text-label tabular-nums text-neutral/60" aria-live="polite">
            <span className="text-neutral">{pad(index + 1)}</span> / {pad(count)}
            <span className="sr-only">: {photos[index].alt}</span>
          </p>
          <div className="flex gap-1.5">
            <GalleryButton label="Previous photograph" onClick={() => go(-1)} path="M10 3 5 8l5 5" />
            <GalleryButton label="Next photograph" onClick={() => go(1)} path="m6 3 5 5-5 5" />
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryButton({ label, path, onClick }: { label: string; path: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-8 cursor-pointer items-center justify-center rounded-full text-neutral ring-1 ring-neutral/25 transition-colors duration-200 hover:bg-neutral hover:text-petrol hover:ring-neutral"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** The arrows between the seven, on the dark field. */
function ArrowButton({ label, path, onClick }: { label: string; path: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 cursor-pointer items-center justify-center rounded-button border border-neutral/30 text-neutral transition-colors duration-[220ms] ease-out hover:border-accent hover:bg-accent hover:text-petrol"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
