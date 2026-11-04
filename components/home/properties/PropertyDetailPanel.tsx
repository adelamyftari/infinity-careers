"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { requestPropertyFilter } from "@/lib/careers/property-filter";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { EASE } from "@/lib/motion";
import { openRoleCount, PROPERTY_CATEGORY_LABEL, type Property } from "@/lib/properties/properties";

const pad = (n: number) => String(n).padStart(2, "0");

type PanelProps = {
  properties: Property[];
  property: Property;
  onPrevious: () => void;
  onNext: () => void;
};

/**
 * The selected destination. Switching plays a short hand-over: the current
 * name rises out of its mask and the image closes upward; the new image
 * opens from below with a touch of perspective while its name rises in.
 */
export function PropertyDetailPanel({ properties, property, onPrevious, onNext }: PanelProps) {
  const root = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(property);
  const target = useRef(property);
  const motion = useRef<gsap.core.Timeline | null>(null);
  const displayed = reduced ? property : shown;

  // Out: when the selection moves on, clear the stage, then swap content.
  useEffect(() => {
    target.current = property;
    const el = root.current;
    if (reduced || !el || property.id === shown.id) return;
    const q = gsap.utils.selector(el);
    motion.current?.kill();
    motion.current = gsap
      .timeline({ defaults: { ease: "power2.in" }, onComplete: () => setShown(target.current) })
      .to(q("[data-name] > *"), { yPercent: -105, duration: 0.26 }, 0)
      .to(q("[data-swap]"), { autoAlpha: 0, y: -8, duration: 0.2, stagger: 0.02 }, 0)
      .to(q("[data-media]"), { clipPath: "inset(0% 0% 100% 0% round 24px)", duration: 0.3, ease: "power3.in" }, 0);
  }, [property, reduced, shown.id]);

  // In: the new destination arrives.
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = root.current;
    if (first.current || !el) {
      first.current = false;
      return;
    }
    const q = gsap.utils.selector(el);
    // The second image is optional.
    const inset = q("[data-inset]");
    motion.current?.kill();
    motion.current = gsap
      .timeline({ defaults: { ease: EASE } })
      .fromTo(
        q("[data-media]"),
        { clipPath: "inset(100% 0% 0% 0% round 24px)", rotateX: 6, transformPerspective: 1000, transformOrigin: "50% 100%" },
        { clipPath: "inset(0% 0% 0% 0% round 24px)", rotateX: 0, duration: 0.85 },
        0,
      )
      .fromTo(q("[data-zoom]"), { scale: 1.18 }, { scale: 1, duration: 1.1 }, 0)
      .fromTo(q("[data-name] > *"), { yPercent: 105 }, { yPercent: 0, duration: 0.8 }, 0.12)
      .fromTo(q("[data-swap]"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05 }, 0.22);
    if (inset.length) motion.current.fromTo(inset, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.3);
  }, [shown.id]);

  useEffect(() => () => void motion.current?.kill(), []);

  // A gentle parallax: the image drifts against the pointer.
  function drift(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    gsap.to(event.currentTarget.querySelector("[data-parallax]"), { x: x * -18, y: y * -12, duration: 0.9, ease: "power3.out" });
  }
  function settle(event: PointerEvent<HTMLDivElement>) {
    gsap.to(event.currentTarget.querySelector("[data-parallax]"), { x: 0, y: 0, duration: 1, ease: EASE });
  }

  // Everything below describes the displayed property, which trails the
  // selection by the length of the hand-over.
  const index = properties.findIndex((candidate) => candidate.id === displayed.id);
  const total = properties.length;
  const [hero, second] = displayed.images ?? [];
  const roles = openRoleCount(displayed);

  return (
    <article
      ref={root}
      aria-labelledby="property-name"
      className="relative flex h-full flex-col rounded-[32px] bg-white/70 p-2.5 shadow-[0_30px_60px_-36px_rgb(20_21_24/0.35)] ring-1 ring-ink/[0.06] backdrop-blur-sm"
    >
      {/* Media */}
      <div
        onPointerMove={drift}
        onPointerLeave={settle}
        className="relative aspect-[16/10] w-full shrink-0 [perspective:1000px] md:aspect-[4/3] lg:aspect-auto lg:min-h-[14rem] lg:flex-1"
      >
        <div data-media className="absolute inset-0 overflow-hidden rounded-[24px] bg-[#e8e4da] will-change-[clip-path]">
          <div data-parallax className="absolute -inset-4">
            <div data-zoom className="absolute inset-0">
              {hero ? (
                <Image
                  key={hero.src}
                  src={hero.src}
                  alt={hero.alt}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <MediaPlaceholder index={index} />
              )}
            </div>
          </div>
          {/* Legibility for the chip over photography, kept low. */}
          {hero && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />}

          <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-warm backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-signature" />
            {PROPERTY_CATEGORY_LABEL[displayed.category]}
          </span>
        </div>

        {second && (
          <div
            data-inset
            className="absolute bottom-3 right-3 hidden aspect-[4/3] w-[32%] overflow-hidden rounded-[18px] shadow-[0_18px_40px_-16px_rgb(0_0_0/0.8)] ring-1 ring-white/15 sm:block"
          >
            <Image key={second.src} src={second.src} alt={second.alt} fill unoptimized sizes="15vw" className="object-cover" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col px-3 pb-3 pt-6 sm:px-5 sm:pb-5">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/45">
            <span className="text-foreground">{pad(index + 1)}</span> / {pad(total)}
          </p>
          <div className="flex gap-2">
            <RoundButton label="Previous property" onClick={onPrevious} path="M10 3 5 8l5 5" />
            <RoundButton label="Next property" onClick={onNext} path="m6 3 5 5-5 5" />
          </div>
        </div>

        <h3 id="property-name" data-name className="mt-5 overflow-hidden pb-[0.08em]">
          <span className="block text-balance text-[clamp(1.85rem,2.7vw,3.1rem)] font-medium leading-[1.02] tracking-[-0.035em] text-foreground">
            {displayed.name}
          </span>
        </h3>

        <p data-swap className="mt-3 text-[14px] text-foreground/55">
          <span className="text-foreground/85">{displayed.city}</span>
          {displayed.address ? <> · {displayed.address}</> : <> · Albania</>}
          {!displayed.position && <span className="mt-1 block text-[12.5px] text-foreground/45">Map location to be confirmed.</span>}
        </p>

        <p data-swap className="mt-4 line-clamp-3 max-w-[46ch] text-[15px] leading-relaxed text-foreground/65">
          {displayed.description ?? <span className="italic text-foreground/45">Description coming soon.</span>}
        </p>

        <div data-swap className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-5">
          {roles > 0 ? (
            <>
              <p className="flex items-baseline gap-2.5">
                <span className="font-serif text-4xl italic leading-none text-foreground">{roles}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground/55">
                  Open {roles === 1 ? "position" : "positions"}
                </span>
              </p>
              <Link
                href="/#roles"
                onClick={() => requestPropertyFilter(displayed.jobProperty)}
                className="group inline-flex items-center gap-3 rounded-full bg-signature py-2 pl-6 pr-2 text-[14px] font-medium text-ink transition-[background-color,transform] duration-500 ease-premium hover:bg-[#f5b51c] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signature"
              >
                Explore opportunities
                <span className="flex size-9 items-center justify-center rounded-full bg-ink text-signature transition-transform duration-500 ease-premium group-hover:translate-x-0.5">
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
                    <path d="M3 8h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </>
          ) : (
            <>
              <p className="text-[14px] leading-snug text-foreground/65">
                No open positions here right now.
              </p>
              <Link
                href="/#roles"
                className="text-[13px] font-medium text-foreground underline decoration-signature decoration-2 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signature"
              >
                See all open roles
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function RoundButton({ label, onClick, path }: { label: string; onClick: () => void; path: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 cursor-pointer items-center justify-center rounded-full text-foreground ring-1 ring-ink/15 transition-[background-color,color,box-shadow] duration-500 ease-premium hover:bg-signature hover:text-ink hover:ring-signature focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signature"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** No approved or Google photography yet: say so, in the house style. */
function MediaPlaceholder({ index }: { index: number }) {
  return (
    <div className="absolute inset-0 flex items-end justify-between bg-[radial-gradient(120%_90%_at_80%_10%,#efebe2,#e3dfd4)] p-8">
      <span
        aria-hidden="true"
        className="font-semibold leading-none tracking-[-0.06em] text-transparent [-webkit-text-stroke:1px_rgb(20_21_24/0.14)] text-[clamp(6rem,14vw,11rem)]"
      >
        {pad(index + 1)}
      </span>
      <span className="flex flex-col items-end gap-3 pb-2">
        <InfinityMark className="size-8 opacity-60" />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground/40">Photography coming soon</span>
      </span>
    </div>
  );
}
