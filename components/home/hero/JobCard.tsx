"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { RoleArtwork } from "@/components/careers/RoleArtwork";
import { button } from "@/components/ui/button";
import { CATEGORIES, type CarouselRole } from "@/lib/careers/jobs";
import { roleHref } from "@/lib/careers/roles-search";

type JobCardProps = {
  role: CarouselRole;
};

/** The "Explore role" button (h-11 in the shared style), and the gap the card keeps around it. */
const PILL_HEIGHT = 44;
/** Share of the card's width: shorter on the wide landscape card. */
const PILL_WIDTH = 0.36;
const GAP = 8;
/**
 * The photograph's real width: the card's (--card-w in Hero: min(84vw, 26rem), from lg clamp(24rem,
 * 27vw, 32rem)) × 1.12 for its over-scale (-6% each side, so the parallax never shows an edge) × 1.02
 * on hover, so the browser picks a source sharp at the front card's full size on any screen density.
 */
const PHOTO_SIZES = "(min-width: 1024px) min(586px, max(439px, 30.9vw)), min(96vw, 476px)";

/**
 * The card's silhouette, in pixels: a crisp frame with a stepped notch at the
 * lower right, the button standing in it like a tab cut from the print. Shared
 * with the positions page's cards (components/roles/RoleCard), whose button
 * takes its own share of the width.
 */
export function cardSilhouette(w: number, h: number, pillWidth = PILL_WIDTH, pillHeight = PILL_HEIGHT, gap = GAP) {
  const r = 16; // outer corners
  const step = 12; // the notch's three corners
  const notchTop = h - pillHeight - gap;
  const notchLeft = w - w * pillWidth - gap;
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

/** Measures the card so its silhouette can be drawn in exact pixels. */
export function useSize<T extends HTMLElement>() {
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
 * A role as a cinematic panel: a full-bleed photograph cut to a stepped
 * silhouette, the title set low on its own shadow rather than on a wash over
 * the whole image, a tag in its career group's colour, and "Explore role"
 * standing in the notch. The carousel tilts the hovered card and passes the
 * cursor in as --px/--py (-0.5 to 0.5) for a gentle photo parallax. Each card
 * opens its own role on the positions page (/roles?role=…).
 */
export const JobCard = memo(function JobCard({ role }: JobCardProps) {
  const [ref, size] = useSize<HTMLAnchorElement>();
  const path = size ? cardSilhouette(size.w, size.h) : null;
  const gradientId = `edge-${role.key}`;
  const category = CATEGORIES[role.category];

  return (
    <Link
      ref={ref}
      href={roleHref(role.roleId)}
      draggable={false}
      className="group relative block h-(--card-h) w-full cursor-grab select-none outline-none"
    >
      {/* The glass body: a natural, neutral shadow that follows the silhouette. */}
      <div className="absolute inset-0 transition-[filter] duration-700 ease-premium [filter:drop-shadow(0_28px_30px_rgb(0_0_0/0.3))] group-hover:[filter:drop-shadow(0_36px_38px_rgb(0_0_0/0.38))]">
        <div
          className="absolute inset-0 overflow-hidden bg-primary"
          style={{ clipPath: path ? `path('${path}')` : "inset(0 round 16px)" }}
        >
          {/* Photo, over-scaled so its parallax drift never shows an edge, and graded so every card reads as one set. */}
          <div className="absolute -inset-[6%] [filter:contrast(1.04)] transition-transform duration-[1200ms] ease-premium [transform:translate3d(calc(var(--px,0)*-22px),calc(var(--py,0)*-22px),0)_scale(1)] group-hover:[transform:translate3d(calc(var(--px,0)*-22px),calc(var(--py,0)*-22px),0)_scale(1.02)]">
            <RoleArtwork job={role} sizes={PHOTO_SIZES} quality={90} className="size-full" />
          </div>

          {/* Shadow only where the title stands: the rest of the photograph stays untouched. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(90%_62%_at_0%_100%,rgb(16_47_50/0.82),rgb(16_47_50/0.42)_48%,transparent_78%)]"
          />
          <span className="absolute left-4 top-4 flex items-center gap-2 rounded-[6px] bg-neutral px-2.5 py-1.5 text-label font-medium text-primary">
            <span aria-hidden="true" className="size-2" style={{ backgroundColor: category.accent }} />
            {category.label}
          </span>
          <h3
            className="absolute bottom-5 left-5 text-card font-medium text-neutral text-balance lg:bottom-6 lg:left-6"
            style={{ maxWidth: `${(1 - PILL_WIDTH) * 100 - 12}%` }}
          >
            {role.title}
          </h3>

          {/* Atmospheric depth: cards further round the orbit fade toward the page. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-neutral opacity-(--veil,0)" />
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

      {/* "Explore role": the shared secondary button. */}
      <span
        className={`${button.secondary} absolute bottom-0 right-0 opacity-[calc(1-var(--veil,0))]`}
        style={{ width: `${PILL_WIDTH * 100}%` }}
      >
        Explore role
      </span>
    </Link>
  );
});
