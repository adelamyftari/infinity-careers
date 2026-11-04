"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { RoleArtwork } from "@/components/careers/RoleArtwork";
import type { Job } from "@/lib/careers/jobs";

type JobCardProps = {
  job: Job;
};

/** The "Explore role" pill, and the gap the card keeps around it. */
const PILL_HEIGHT = 50;
/** Share of the card's width: shorter on the wide landscape card. */
const PILL_WIDTH = 0.42;
const GAP = 10;

/**
 * The card's silhouette, in pixels: rounded top and bottom-left corners, and
 * a bottom-right notch the pill sits in. The card's lower edge rises into the
 * notch on a smooth S-curve that wraps the pill's rounded end.
 */
function silhouette(w: number, h: number) {
  const r = Math.min(36, Math.max(24, h * 0.1)); // outer corners
  const corner = 24; // where the notch meets the right edge
  const notchTop = h - PILL_HEIGHT - GAP;
  const notchLeft = w - w * PILL_WIDTH - GAP; // the wave's midpoint
  const wave = Math.min(104, w * 0.18); // horizontal span of the wave
  return [
    `M0 ${r}`,
    `A${r} ${r} 0 0 1 ${r} 0`,
    `H${w - r}`,
    `A${r} ${r} 0 0 1 ${w} ${r}`,
    `V${notchTop - corner}`,
    `A${corner} ${corner} 0 0 1 ${w - corner} ${notchTop}`,
    `H${notchLeft + wave / 2}`,
    `C${notchLeft} ${notchTop} ${notchLeft} ${h} ${notchLeft - wave / 2} ${h}`,
    `H${r}`,
    `A${r} ${r} 0 0 1 0 ${h - r}`,
    "Z",
  ].join(" ");
}

/** Measures the card so its silhouette can be drawn in exact pixels. */
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
 * A role as a sculpted glass object: a full-bleed photo cut to a silhouette
 * with a curved bottom-right notch, and the "Explore role" pill floating in
 * that notch, in warm ivory glass with a fine gold edge, the same on every
 * card. The carousel tilts the hovered card and passes the cursor
 * in as --px/--py (-0.5 to 0.5) for a gentle photo parallax.
 */
export const JobCard = memo(function JobCard({ job }: JobCardProps) {
  const [ref, size] = useSize<HTMLAnchorElement>();
  const path = size ? silhouette(size.w, size.h) : null;
  const gradientId = `edge-${job.slug}`;

  return (
    <Link
      ref={ref}
      href={`/jobs/${job.slug}`}
      draggable={false}
      className="group relative block h-(--card-h) w-full cursor-grab select-none outline-none"
    >
      {/* The glass body: a natural, neutral shadow that follows the silhouette. */}
      <div className="absolute inset-0 transition-[filter] duration-700 ease-premium [filter:drop-shadow(0_26px_30px_rgb(20_21_24/0.24))_drop-shadow(0_4px_8px_rgb(20_21_24/0.1))] group-hover:[filter:drop-shadow(0_34px_38px_rgb(20_21_24/0.3))_drop-shadow(0_5px_10px_rgb(20_21_24/0.12))]">
        <div
          className="absolute inset-0 overflow-hidden bg-ink"
          style={{ clipPath: path ? `path('${path}')` : "inset(0 round 36px)" }}
        >
          {/* Photo, over-scaled so its parallax drift never shows an edge. */}
          <div className="absolute -inset-[6%] transition-transform duration-[1200ms] ease-premium [transform:translate3d(calc(var(--px,0)*-22px),calc(var(--py,0)*-22px),0)_scale(1)] group-hover:[transform:translate3d(calc(var(--px,0)*-22px),calc(var(--py,0)*-22px),0)_scale(1.02)]">
            <RoleArtwork job={job} sizes="(min-width: 1024px) 640px, 84vw" className="size-full" />
          </div>

          {/* Glass: a cool sheen from the top, readability shade at the base. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(165deg,rgb(255_255_255/0.2),transparent_28%),linear-gradient(to_top,rgb(8_8_10/0.72),rgb(8_8_10/0.18)_38%,transparent_58%)]"
          />
          <h3
            className="absolute left-7 right-7 max-w-[70%] text-[clamp(1.6rem,2.15vw,2.5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white text-balance [text-shadow:0_2px_16px_rgb(0_0_0/0.3)]"
            style={{ bottom: PILL_HEIGHT + GAP + 20 }}
          >
            {job.title}
          </h3>

          {/* Atmospheric depth: cards further round the orbit fade toward the page. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background opacity-(--veil,0)" />
        </div>

        {/* The glass edge, traced along the silhouette: a cool, neutral rim. */}
        {path && size && (
          <svg aria-hidden="true" viewBox={`0 0 ${size.w} ${size.h}`} className="pointer-events-none absolute inset-0 size-full overflow-visible">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0.4" y2="1">
                <stop offset="0" stopColor="white" stopOpacity="0.6" />
                <stop offset="0.45" stopColor="white" stopOpacity="0.1" />
                <stop offset="1" stopColor="white" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            <path d={path} fill="none" stroke={`url(#${gradientId})`} strokeWidth="1" />
          </svg>
        )}
      </div>

      {/* "Explore role": warm ivory glass with a fine gold edge. The highlight and hover reflection are inset shadows. */}
      <span
        className="absolute bottom-0 right-0 flex cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[rgb(233_163_0/0.55)] bg-[rgb(245_241_230/0.45)] text-[14px] font-semibold tracking-[-0.01em] text-[#141518] opacity-[calc(1-var(--veil,0))] shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_6px_16px_-8px_rgb(20_21_24/0.22)] [backdrop-filter:blur(14px)_saturate(140%)] transition-[border-color,background-color,box-shadow] duration-[250ms] ease-premium group-hover:border-[rgb(233_163_0/0.8)] group-hover:bg-[rgb(245_241_230/0.65)] group-hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.85),inset_0_12px_14px_-12px_rgb(255_255_255/0.7),0_6px_16px_-8px_rgb(20_21_24/0.22)] group-focus-visible:shadow-[inset_0_1px_0_rgb(255_255_255/0.85),0_0_0_2px_var(--ink)]"
        style={{ width: `${PILL_WIDTH * 100}%`, height: PILL_HEIGHT }}
      >
        <span className="relative">Explore role</span>
      </span>
    </Link>
  );
});
