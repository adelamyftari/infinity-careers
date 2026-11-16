"use client";

import { memo, useRef, type MouseEvent, type PointerEvent } from "react";
import Image from "next/image";
import gsap from "gsap";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { cardSilhouette, useSize } from "@/components/home/hero/JobCard";
import { departmentName, roleWhere, type RoleEntry } from "@/lib/careers/roles";
import { roleHref } from "@/lib/careers/roles-search";
import { CAREER_GROUP_LABEL } from "@/lib/careers/taxonomy";
import { hasFinePointer, prefersReducedMotion } from "@/lib/motion";

/** The notch's button: its share of the card's width, and its height (as on the homepage's cards). */
const PILL_WIDTH = 0.5;
const PILL_HEIGHT = 44;
/** The most the card leans toward the pointer (degrees). */
const TILT = 3;

const PHOTO_SIZES = "(min-width: 1280px) 30vw, (min-width: 768px) 46vw, 92vw";

type RoleCardProps = {
  entry: RoleEntry;
  onOpen: (entry: RoleEntry) => void;
  onApply: (entry: RoleEntry) => void;
};

/**
 * A role on the positions page, in the homepage carousel's visual language:
 * the same stepped silhouette with the action standing in its notch, the
 * photograph graded and cropped the same way, the same tag, set on a quiet
 * glass panel for the facts (light glass on the page's white). The card opens the role's details; the notch
 * applies (an opening) or registers interest (a career role with no opening).
 */
export const RoleCard = memo(function RoleCard({ entry, onOpen, onApply }: RoleCardProps) {
  const [ref, size] = useSize<HTMLDivElement>();
  const tilt = useRef<HTMLDivElement>(null);
  const path = size ? cardSilhouette(size.w, size.h, PILL_WIDTH, PILL_HEIGHT) : null;
  const where = roleWhere(entry);
  const vacancy = entry.kind === "vacancy";
  // What its listings offer, all on the one card: never a card per level or per contract.
  const offered: [string, string[]][] = [
    ["LEVELS", entry.levels],
    ["CONTRACT", entry.employmentTypes],
  ];
  const facts = offered.filter(([, values]) => values.length > 0);
  const rimId = `rim-${entry.id.replace(/[^a-z0-9-]/gi, "-")}`;

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = tilt.current;
    if (!el || event.pointerType !== "mouse" || !hasFinePointer() || prefersReducedMotion()) return;
    const box = el.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - 0.5;
    const py = (event.clientY - box.top) / box.height - 0.5;
    gsap.to(el, { rotationY: px * TILT * 2, rotationX: -py * TILT * 2, y: -6, duration: 0.6, ease: "power3.out", overwrite: "auto" });
    el.style.setProperty("--glint-x", `${(px + 0.5) * 100}%`);
  }

  function onPointerLeave() {
    if (tilt.current) gsap.to(tilt.current, { rotationY: 0, rotationX: 0, y: 0, duration: 0.8, ease: "power3.out", overwrite: "auto" });
  }

  function open(event: MouseEvent<HTMLAnchorElement>) {
    // A modified click opens the role's link in a new tab, as a link should.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onOpen(entry);
  }

  return (
    <div data-role-card className="[perspective:1400px]" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <article ref={tilt} className="group/card relative h-[33rem] [transform-style:preserve-3d] will-change-transform md:h-[34rem] xl:h-[35rem]">
        <div ref={ref} className="absolute inset-0">
          {/* The glass body: a natural shadow along the silhouette. */}
          <div className="absolute inset-0 transition-[filter] duration-700 ease-premium [filter:drop-shadow(0_16px_26px_rgb(16_47_50/0.1))] group-hover/card:[filter:drop-shadow(0_28px_38px_rgb(16_47_50/0.17))]">
            <div
              className="absolute inset-0 flex flex-col overflow-hidden bg-white/80 backdrop-blur-sm"
              style={{ clipPath: path ? `path('${path}')` : "inset(0 round 16px)" }}
            >
              {/* The photograph, or the branded placeholder where a role has none yet. */}
              {/* One photo height on every card (a card with fewer details does not get a taller photo); it gives way only if the text below needs the room. */}
              <div className="relative min-h-36 shrink basis-[44%] overflow-hidden bg-primary">
                {entry.image ? (
                  <Image
                    src={entry.image}
                    alt=""
                    fill
                    sizes={PHOTO_SIZES}
                    className="object-cover [filter:contrast(1.04)] transition-transform duration-[1200ms] ease-premium group-hover/card:scale-[1.04]"
                    style={entry.imagePosition ? { objectPosition: entry.imagePosition } : undefined}
                  />
                ) : (
                  <div aria-hidden="true" className="absolute inset-0 bg-white bg-[radial-gradient(circle,rgb(16_47_50/0.08)_1px,transparent_1px)] bg-size-[18px_18px]">
                    <InfinityMark className="absolute left-1/2 top-1/2 size-[46%] max-h-36 -translate-x-1/2 -translate-y-1/2 fill-primary opacity-[0.07] transition-transform duration-[1200ms] ease-premium group-hover/card:scale-[1.05]" />
                    <span className="absolute bottom-4 left-5 text-label font-semibold tracking-[0.18em] text-primary/45">{departmentName(entry).toUpperCase()}</span>
                  </div>
                )}
                {entry.image && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,rgb(16_47_50/0.35),transparent)]" />}
                <span className="absolute left-4 top-4 flex items-center gap-2 rounded-[6px] bg-neutral px-2.5 py-1.5 text-label font-medium text-primary">
                  <span aria-hidden="true" className="size-2 bg-primary" />
                  {CAREER_GROUP_LABEL[entry.careerGroup]}
                </span>
                <span
                  className={`absolute right-4 top-4 rounded-[6px] px-2.5 py-1.5 text-label font-semibold tracking-[0.08em] ${
                    vacancy ? "bg-accent text-petrol" : "bg-white/90 text-primary ring-1 ring-primary/15"
                  }`}
                >
                  {vacancy ? "OPEN POSITION" : "FUTURE OPPORTUNITY"}
                </span>
              </div>

              {/* The facts, on the glass. */}
              <div className="flex shrink-0 flex-col border-t border-line px-5 pb-[calc(44px+1.25rem)] pt-5 lg:px-6">
                <h3 className="text-card font-medium text-balance text-primary">
                  <a
                    href={roleHref(entry.id)}
                    onClick={open}
                    className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:decoration-accent focus-visible:underline-offset-4"
                  >
                    {entry.title}
                  </a>
                </h3>
                <p className="mt-2 text-small text-primary">
                  {where.property}
                  <span aria-hidden="true" className="px-1.5 text-primary/30">·</span>
                  {where.location}
                </p>
                <p className="mt-0.5 text-small text-muted">{departmentName(entry)}</p>
                {facts.length > 0 && (
                  <dl aria-label="Available options" className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1">
                    {facts.map(([term, values]) => (
                      <div key={term} className="contents">
                        <dt className="text-label font-medium tracking-[0.14em] text-muted">{term}</dt>
                        <dd className="truncate text-small text-primary">{values.join(" · ")}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="mt-3 line-clamp-3 text-small text-muted">{entry.summary}</p>
              </div>

              {/* A small reflected highlight that follows the pointer across the top edge. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
                style={{ background: "radial-gradient(40% 100% at var(--glint-x, 50%) 0%, rgb(247 247 242 / 0.16), transparent 70%)" }}
              />
            </div>

            {/* The glass rim, traced along the silhouette; it warms toward Infinity Yellow on hover. */}
            {path && size && (
              <svg aria-hidden="true" viewBox={`0 0 ${size.w} ${size.h}`} className="pointer-events-none absolute inset-0 size-full overflow-visible">
                <defs>
                  <linearGradient id={rimId} x1="0" y1="0" x2="0.4" y2="1">
                    <stop offset="0" stopColor="#102f32" stopOpacity="0.16" />
                    <stop offset="0.5" stopColor="#102f32" stopOpacity="0.08" />
                    <stop offset="1" stopColor="#102f32" stopOpacity="0.14" />
                  </linearGradient>
                </defs>
                <path d={path} fill="none" stroke={`url(#${rimId})`} strokeWidth="1" />
                <path d={path} fill="none" className="stroke-accent/0 transition-[stroke] duration-500 group-hover/card:stroke-accent" strokeWidth="1" />
              </svg>
            )}
          </div>

          {/* What the card is: beside the notch. */}
          <p className="absolute bottom-0 left-5 flex h-11 items-center gap-2 text-label text-muted lg:left-6">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${vacancy ? "bg-accent" : "bg-primary/30"}`} />
            {vacancy ? "Applications open" : "No current opening"}
          </p>

          {/* The action, standing in the notch. */}
          <button
            type="button"
            onClick={() => onApply(entry)}
            aria-label={`${vacancy ? "Apply now" : "Express interest"}: ${entry.title}`}
            className="group/cta absolute bottom-0 right-0 z-10 inline-flex cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-primary text-small font-semibold tracking-[0.06em] text-neutral shadow-[0_14px_26px_-16px_rgb(16_47_50/0.6)] transition-colors duration-300 hover:bg-accent hover:text-primary focus-visible:bg-accent focus-visible:text-primary"
            style={{ width: `${PILL_WIDTH * 100}%`, height: PILL_HEIGHT }}
          >
            {vacancy ? "APPLY NOW" : "EXPRESS INTEREST"}
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 transition-transform duration-500 ease-premium group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5 group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5">
              <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </article>
    </div>
  );
});
