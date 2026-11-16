"use client";

import { useLayoutEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { CarouselRole } from "@/lib/careers/jobs";
import { RoundButton } from "@/components/ui/RoundButton";
import { createOrbitLayout, type OrbitLayout } from "@/lib/carousel/orbit";
import {
  INTERACTIVE_UNTIL,
  OPENING,
  ORBIT_SCROLL,
  ROLES_SCENE,
  orbitHeadline,
  orbitScene,
  orbitUiOpacity,
  placeInScene,
  type OrbitScene,
  type OrbitScrollProfile,
} from "@/lib/carousel/orbit-scroll";
import { onIntroReveal } from "@/lib/intro/reveal-signal";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { JobCard } from "./JobCard";
import { button } from "@/components/ui/button";
import { Letters, useMagneticLetters } from "@/components/home/destinations/MagneticLetters";

// The orbit: every role at an equal angle round one ellipse through the
// cards' centreline, so there is no first or last card. Geometry, spacing
// and visibility live in lib/carousel/orbit.ts.
/** Camera distance (px), from one point at the stage centre for every card. */
const PERSPECTIVE = 1600;
/** Projected gap between the front card and its neighbours (px), roomier on wide stages. */
const GAP = 30;
const GAP_COMPACT = 16;
/** Below this stage width (px) the compact gap applies. */
const COMPACT_WIDTH = 768;
/** The orbit's depth as a share of its width. */
const ORBIT_DEPTH = 0.55;
/** Share of the orbit's tangent each card turns by: neighbours about 12°, the next cards about 30°. */
const ORBIT_YAW = 0.75;
/** How much smaller a card is at the very back of the orbit, on top of perspective. */
const DEPTH_SHRINK = 0.12;
/** Seconds between automatic steps, while nobody is interacting. */
const AUTO_ROTATE = 5;
/** Most cards a flick can carry the orbit past: keeps momentum controlled. */
const MAX_GLIDE = 1.5;
/** Seconds of release velocity a flick carries forward. */
const MOMENTUM = 0.2;
/** Pixels of movement before a press becomes a drag. */
const DRAG_THRESHOLD = 6;
/** How far the hovered card comes forward (px): gentle, it stays in orbit. */
const HOVER_LIFT = 24;

gsap.registerPlugin(ScrollTrigger);

const HEADLINE_LETTERS = { color: "--brand-accent", snap: 0.1, reach: 2.4 };

type Engine = {
  setCount: (count: number) => void;
  step: (delta: number) => void;
  /** Where the page scroll has carried the whole orbit (0 = the carousel as it is). */
  setScroll: (progress: number, opening: number, profile: OrbitScrollProfile, covered: boolean) => void;
  destroy: () => void;
};

type JobCarouselProps = {
  /** The cards: openings and pictured roles, in order (lib/careers/jobs: carouselRoles). */
  roles: CarouselRole[];
  onClear: () => void;
  ref?: Ref<HTMLElement>;
  /**
   * What the orbit hands over to, inside the same pinned scene: it slides over
   * the cards once they hold their final pose. Its `data-handoff-rise` block says
   * on `data-handoff-scroll` how many screens it needs in all and on
   * `data-handoff-cover` how many until the cards are fully covered, and is told
   * how far along it is, 0 → 1, by a "handoff:progress" event.
   */
  handoff?: ReactNode;
};

/**
 * Roles on an endless 3D orbit. One animation loop owns all motion: the
 * orbit's rotation eases toward a target that dragging (with momentum),
 * horizontal wheel, arrow keys, focus and a slow auto-rotation all move.
 * The rotation is a continuous number that is never reset, so the orbit
 * turns through any number of revolutions without a jump. It writes
 * transforms straight to the DOM and sleeps when settled, so React only
 * re-renders when the front role changes.
 */
export function JobCarousel({ roles, onClear, ref, handoff }: JobCarouselProps) {
  const pin = useRef<HTMLDivElement>(null);
  const runway = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const live = useRef<HTMLParagraphElement>(null);
  const engine = useRef<Engine | null>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  // Near the cursor, the heading's letters swell and turn Infinity Yellow: every letter it
  // comes near, not just the one under it, each switching outright so none rests muddy.
  useMagneticLetters(headlineRef, HEADLINE_LETTERS);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    engine.current = createEngine(el, slots.current, live, setActive);
    return () => {
      engine.current?.destroy();
      engine.current = null;
    };
  }, []);

  // Scrolling past, one pinned scene in strict order: the orbit opens into a 3D
  // ring and turns to its final pose over the page's dotted background, and
  // holds it while the handoff slides up in front. One scrubbed clock drives
  // both, so that order holds at any scroll speed, forward and back.
  // gsap.matchMedia is a gsap.context: reverting it cleans all of this up.
  // Reduced motion keeps the plain carousel, with the handoff below it.
  useLayoutEffect(() => {
    const el = pin.current;
    const space = runway.current;
    if (!el || !space) return;
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: "(min-width: 1024px)",
        tablet: "(min-width: 768px) and (max-width: 1023.98px)",
        motion: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const { desktop, tablet, motion } = context.conditions ?? {};
        if (!motion) return;
        const profile = desktop ? ORBIT_SCROLL.desktop : tablet ? ORBIT_SCROLL.tablet : ORBIT_SCROLL.phone;
        const distance = () => window.innerHeight * profile.distance;
        const state = { clock: 0, progress: 0, opening: 0, handoff: 0, covered: false };
        // The message at the orbit's heart: the engine keeps it on the ring's centre; its motion is set here.
        const headline = el.querySelector<HTMLElement>("[data-orbit-headline]");
        // How far it must descend to leave the pinned screen: from its resting top
        // (the scene is centred while pinned) to below the screen's foot, with room
        // for its growth. Measured on refresh, never per frame.
        let exit = window.innerHeight;
        const measureExit = () => {
          if (!headline) return;
          const restTop = window.innerHeight / 2 - el.offsetHeight / 2 + (headline.getBoundingClientRect().top - el.getBoundingClientRect().top);
          // The allowance covers its growth to 1.08 about its centre and the ring's small rise.
          exit = Math.max(0, window.innerHeight - restTop) + headline.offsetHeight * 0.3 + window.innerHeight * profile.rise + 24;
        };
        measureExit();
        ScrollTrigger.addEventListener("refresh", measureExit);
        const apply = () => {
          engine.current?.setScroll(state.progress, state.opening, profile, state.covered);
          if (headline) {
            const h = orbitHeadline(state.progress, exit);
            headline.style.setProperty("--headline-o", h.opacity.toFixed(3));
            headline.style.setProperty("--headline-s", h.scale.toFixed(4));
            headline.style.setProperty("--headline-y", `${h.y.toFixed(2)}px`);
            headline.style.setProperty("--headline-l1", h.lines[0].toFixed(3));
            headline.style.setProperty("--headline-l2", h.lines[1].toFixed(3));
            headline.style.visibility = h.opacity < 0.005 || h.out ? "hidden" : "visible";
          }
          const ui = orbitUiOpacity(state.progress, state.opening);
          el.style.setProperty("--orbit-ui", ui.toFixed(3));
          el.dataset.controls = ui < 0.01 ? "off" : "";
          el.dataset.orbit = state.progress > INTERACTIVE_UNTIL ? "moving" : "";
        };

        // The handoff leaves the page flow and becomes the scene's foreground:
        // one screen tall, centred on the pinned stage, so it covers exactly
        // the viewport while pinned.
        const block = el.querySelector<HTMLElement>("[data-handoff-rise]");
        if (el.querySelector("[data-handoff-layer]")) el.dataset.handoff = "overlay";

        // The scene ends pinned on its final screen, centred: the page must
        // reach that far, so room is made below for the half screen that the
        // foreground extends past the stage.
        const sizeRunway = () => {
          space.style.height = "0px";
          if (!el.dataset.handoff) return;
          const main = space.closest("main");
          const below = main ? main.getBoundingClientRect().bottom - space.getBoundingClientRect().bottom : 0;
          space.style.height = `${Math.max(0, Math.ceil((window.innerHeight - el.offsetHeight) / 2 - below) + 2)}px`;
        };
        sizeRunway();
        ScrollTrigger.addEventListener("refreshInit", sizeRunway);

        const after = () => window.innerHeight * Number(block?.dataset.handoffScroll ?? 0);
        const cover = () => window.innerHeight * Number(block?.dataset.handoffCover ?? 0);
        const sceneLength = () => distance() + after();
        ScrollTrigger.create({
          id: ROLES_SCENE,
          trigger: el,
          start: "center center",
          end: () => `+=${sceneLength()}`,
          pin: true,
          invalidateOnRefresh: true,
        });
        // The one clock of the scene. Both parts read it, so the handoff cannot
        // start before the orbit has ended, however fast the page is scrolled.
        const tick = () => {
          const scrolled = state.clock * sceneLength();
          state.progress = Math.min(1, scrolled / distance());
          // Only once it is fully behind the handoff does the orbit stop painting.
          state.covered = after() > 0 && scrolled >= distance() + cover();
          apply();
          const handoff = after() ? clamp((scrolled - distance()) / after(), 0, 1) : 0;
          if (handoff === state.handoff) return;
          state.handoff = handoff;
          block?.dispatchEvent(new CustomEvent("handoff:progress", { detail: handoff }));
        };
        gsap.fromTo(
          state,
          { clock: 0 },
          { clock: 1, ease: "none", onUpdate: tick, immediateRender: false, scrollTrigger: { trigger: el, start: "center center", end: () => `+=${sceneLength()}`, scrub: 0.8 } },
        );
        // The ring opens from the page's first scroll, before the pin begins.
        gsap.to(state, {
          opening: 1,
          ease: "none",
          onUpdate: apply,
          scrollTrigger: { start: 0, end: () => window.innerHeight * OPENING, scrub: 0.8, invalidateOnRefresh: true },
        });

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", sizeRunway);
          ScrollTrigger.removeEventListener("refresh", measureExit);
          delete el.dataset.handoff;
          space.style.height = "";
          state.clock = 0;
          state.progress = 0;
          state.opening = 0;
          state.handoff = 0;
          state.covered = false;
          apply();
        };
      },
    );
    return () => mm.revert();
  }, []);

  // A new set of roles (filters changed): the orbit re-forms around them.
  useLayoutEffect(() => {
    slots.current.length = roles.length;
    engine.current?.setCount(roles.length);
  }, [roles]);

  const count = roles.length;
  const current = count > 0 ? roles[Math.min(active, count - 1)] : undefined;

  return (
    <div className="relative">
      {/* The scroll scene, pinned while the page scroll carries the orbit away (see the scroll effect). */}
      <div ref={pin} className="relative">
        <section ref={ref} id="roles" tabIndex={-1} aria-roledescription="carousel" aria-label="Open roles" className="relative scroll-mt-24 outline-none">
          {/* The stage stays mounted when nothing matches: the engine is bound to it. */}
          <div
            ref={stage}
            role="group"
            tabIndex={count > 0 ? 0 : -1}
            aria-label="Roles. Use the left and right arrow keys to turn the carousel."
            className={`relative isolate h-[calc(var(--card-h)+10rem)] touch-pan-y select-none rounded-[40px] outline-none focus-visible:outline-2 focus-visible:-outline-offset-8 focus-visible:outline-accent/60 in-data-[orbit=moving]:pointer-events-none ${
              count > 1 ? "cursor-grab data-[dragging=true]:cursor-grabbing data-[dragging=true]:**:cursor-grabbing" : ""
            }`}
          >
            {/* The gallery floor: a soft shadow the orbit turns above. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-6 left-1/2 h-28 w-[min(90vw,80rem)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(16_47_50/0.13),transparent)] opacity-(--orbit-ui,1)"
            />
            {/*
              Flat on purpose: each card is its own 3D unit (see render), in two
              layers: the slot carries the shared camera and the scroll pose, the
              ring layer inside it the card's place on the orbit.
            */}
            <div data-scene className="absolute inset-0">
              {roles.map((role, i) => (
                <div
                  key={role.key}
                  ref={(node) => {
                    slots.current[i] = node;
                  }}
                  data-index={i}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                  className="group/slot pointer-events-none invisible absolute left-1/2 top-1/2 w-(--card-w) origin-center will-change-transform [transform-style:preserve-3d]"
                  style={{ marginLeft: "calc(var(--card-w) / -2)", marginTop: "calc(var(--card-h) / -2)" }}
                >
                  <div data-ring className="will-change-transform [transform-style:preserve-3d]">
                    <div
                      data-tilt
                      className="transition-transform duration-700 ease-premium [transform-style:preserve-3d] [transform:translateZ(var(--lift,0px))_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] in-data-[dragging=true]:transition-none"
                    >
                      {/* Opacity lives here, on a flat leaf: on a 3D layer it would flatten the card's pose. */}
                      <div data-fade className="opacity-0">
                        <JobCard role={role} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/*
              The message at the heart of the orbit. Flat, in the cards' own stacking
              context at the depth of the ring's centre (the engine sets its z-index
              and keeps it on that centre, lifted to the clear space between the rows:
              the near cards are the larger ones), so the near half of the ring passes
              in front of it and the far half behind. On phones the ring is too small to
              hold it, so it reads just below the ring instead, on the same clock. Only seen while the page scroll
              turns the ring; reduced motion keeps the plain carousel without it.
            */}
            <h2
              ref={headlineRef}
              data-orbit-headline
              aria-label="Every role has a place"
              className="pointer-events-none invisible absolute left-1/2 top-1/2 m-0 whitespace-nowrap text-center text-[clamp(2rem,4.1vw,4.375rem)]/[0.98] font-semibold tracking-[-0.03em] text-petrol [transform:translate(-50%,-50%)_translateY(calc(var(--core-y,0px)-0.42em))] max-md:[transform:translate(-50%,-50%)_translateY(calc(var(--core-y,0px)-0.42em+var(--card-h)*0.84))]"
            >
              <span className="block origin-center opacity-(--headline-o,0) [transform:translateY(var(--headline-y,0px))_scale(var(--headline-s,0.78))]">
                {/* Masks with room round the letters, so one can swell under the cursor unclipped; the negative margins keep the layout. */}
                <span className="-mx-[0.08em] -my-[0.2em] block overflow-hidden px-[0.2em] pb-[0.26em] pt-[0.2em]">
                  <span className="block [transform:translateY(calc((1-var(--headline-l1,0))*105%))]">
                    <Letters text="EVERY" /> <Letters text="ROLE" />
                  </span>
                </span>
                <span className="-mx-[0.08em] -my-[0.2em] block overflow-hidden px-[0.2em] pb-[0.3em] pt-[0.2em]">
                  <span className="block [transform:translateY(calc((1-var(--headline-l2,0))*105%))]">
                    <Letters text="HAS" /> <Letters text="A" /> <Letters text="PLACE" />
                  </span>
                </span>
              </span>
            </h2>

            {count === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-(--gutter) text-center">
                <p className="font-accent text-page font-normal italic">Nothing here, yet.</p>
                <p className="mt-4 max-w-sm text-body text-muted">No roles match these filters right now. Try widening your search.</p>
                <button
                  type="button"
                  onClick={onClear}
                  className={`${button.primary} mt-6`}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {current && (
            <div className="-mt-12 flex items-center justify-between gap-6 px-(--gutter) opacity-(--orbit-ui,1) focus-within:opacity-100 in-data-[orbit=moving]:pointer-events-none in-data-[controls=off]:not-focus-within:invisible">
              {/* The running index: which role is at the front. */}
              <p aria-hidden="true" className="flex min-w-0 items-center gap-4">
                <span className="text-title/none font-medium tabular-nums">{String(Math.min(active, count - 1) + 1).padStart(2, "0")}</span>
                <span className="min-w-0 border-l border-line pl-4 text-small">
                  <span className="block truncate font-medium">{current.title}</span>
                  <span className="block truncate text-muted">{current.subtitle}</span>
                </span>
              </p>
              {/* Announced when the visitor turns the orbit, never for auto-rotation. */}
              <p ref={live} aria-live="off" className="sr-only">
                {current.title} — {current.subtitle}
              </p>
              <div className="flex gap-2">
                <RoundButton label="Previous role" path="M10 3 5 8l5 5" onClick={() => engine.current?.step(-1)} disabled={count < 2} />
                <RoundButton label="Next role" path="m6 3 5 5-5 5" onClick={() => engine.current?.step(1)} disabled={count < 2} />
              </div>
            </div>
          )}
        </section>

        {/*
          Foreground layer: in front of the cards (the stage is its own
          stacking context), never inside their 3D transforms. Inert to the
          pointer while it floats over the stage, and clipped at the screen's
          height: the statement waits below it.
        */}
        {handoff && (
          <div
            data-handoff-layer
            className="relative z-10 in-data-[handoff=overlay]:pointer-events-none in-data-[handoff=overlay]:absolute in-data-[handoff=overlay]:inset-x-0 in-data-[handoff=overlay]:top-[calc(50%-50vh)] in-data-[handoff=overlay]:h-[calc(100vh+4px)] in-data-[handoff=overlay]:overflow-clip"
          >
            {handoff}
          </div>
        )}
      </div>
      {/* Room for the scene's final screen at the end of the page (sized in the scroll effect). */}
      <div ref={runway} aria-hidden="true" />
    </div>
  );
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const preventDefault = (event: Event) => event.preventDefault();

/** All carousel motion. Lives outside React: it touches only the DOM. */
/** Below this depth opacity a card turns see-through as it leaves the ring; above it, it is drawn solid. */
const SEE_THROUGH = 0.5;

function createEngine(
  stage: HTMLDivElement,
  slots: (HTMLDivElement | null)[],
  live: RefObject<HTMLParagraphElement | null>,
  onActive: (index: number) => void,
): Engine {
  const reduced = prefersReducedMotion();
  const headline = stage.querySelector<HTMLElement>("[data-orbit-headline]");

  let count = 0;
  // Rotation in card steps: unbounded, never wrapped. Card i is at the front
  // whenever `current` is any i + k·count.
  let current = 0;
  let target = 0;
  let activeIndex = -1;
  /** Whether the next change of front card came from the visitor (announce it). */
  let announce = false;
  /** 0 → 1: the cards fanning out of the depth into the orbit. */
  const intro = { value: reduced ? 1 : 0 };
  let layout: OrbitLayout | null = null;
  /** The page scroll's pose for the whole orbit; null while it is the plain carousel. */
  let scene: OrbitScene | null = null;
  let scrollProgress = 0;
  /** Whether the page scroll has begun to open the orbit. */
  let opened = false;

  let pressed = false;
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startTarget = 0;
  let samples: { x: number; t: number }[] = [];

  let hovered = -1;
  let pointerInside = false;
  let focusInside = false;
  let onScreen = true;

  let frame = 0;
  let last = 0;
  let wheelTimer = 0;

  /** Card i's offset from the front, wrapped to the shorter way round. */
  const offset = (i: number) => {
    const d = (((i - current) % count) + count) % count;
    return d > count / 2 ? d - count : d;
  };
  /** Projected distance between neighbours' centres (px): one step of drag. */
  const stride = () => layout?.stride ?? 500;

  function render() {
    if (!layout) return;
    const front = ((Math.round(current) % count) + count) % count;

    for (let i = 0; i < count; i++) {
      const slot = slots[i];
      if (!slot) continue;
      const d = offset(i);
      const place = layout.place(d);
      // Entrance: each card rises into place a beat after the one in front
      // of it. Only opacity and height change, so the orbit's spacing holds.
      const t = clamp(intro.value * 1.35 - Math.abs(d) * 0.1, 0, 1);
      const introY = (1 - t) * 60;
      // The scroll pose, solved against this card's place on the orbit.
      const placed = scene ? placeInScene(layout, count, d, place, introY, scene) : null;
      // The entrance's depth fade stays with the ring: the stack is a solid deck.
      const opacity = (placed?.opacity ?? place.opacity) * (t + (1 - t) * (placed?.collapse ?? 0));

      // Every card projects from the same camera point (its transform origin
      // is the stage centre) but in its own 3D context, so cards can never
      // cut through one another; nearer cards are painted over deeper ones.
      // Inner layer: the orbit (drag, keys, auto-rotation).
      const ring = slot.firstElementChild as HTMLElement | null;
      if (ring) {
        ring.style.transform = `translate3d(${place.x.toFixed(2)}px, ${introY.toFixed(2)}px, ${place.z.toFixed(2)}px) rotateY(${place.rotateY.toFixed(3)}deg) scale(${place.scale.toFixed(4)})`;
      }
      // Outer layer: the shared camera, and the page scroll's pose.
      slot.style.transform = placed ? `perspective(${PERSPECTIVE}px) ${placed.transform}` : `perspective(${PERSPECTIVE}px)`;
      // Depth reads through the veil, the perspective and the scale; the card itself stays opaque
      // until it is leaving the ring (below SEE_THROUGH). A translucent card over the hero's
      // two-tone ground (petrol above, the page's warm white below) would show a pale band across
      // its lower half and lose its contrast.
      const fade = slot.querySelector<HTMLElement>("[data-fade]");
      if (fade) fade.style.opacity = Math.min(1, opacity / SEE_THROUGH).toFixed(3);
      slot.style.visibility = opacity < 0.01 ? "hidden" : "visible";
      // On the ring layer, which is where the card is: the slot's own empty box is elsewhere once the scene moves it.
      if (ring) ring.style.pointerEvents = opacity < 0.5 || scrollProgress > INTERACTIVE_UNTIL ? "none" : "auto";
      slot.style.zIndex = String(placed?.zIndex ?? place.zIndex);
      // Depth fade: further round the orbit, the card washes toward the page.
      slot.style.setProperty("--veil", (placed?.veil ?? place.fade).toFixed(3));
      const isActive = String(i === front && t > 0.6);
      if (slot.dataset.active !== isActive) slot.dataset.active = isActive;
    }

    // The message at the orbit's heart sits at the depth of the ring's centre, on its projection.
    if (headline) {
      const rz = layout.radiusZ;
      headline.style.zIndex = String(Math.round(10_000 - rz));
      headline.style.setProperty("--core-y", `${((scene?.y ?? 0) * (PERSPECTIVE / (PERSPECTIVE + rz))).toFixed(2)}px`);
    }

    if (front !== activeIndex && count > 0) {
      activeIndex = front;
      live.current?.setAttribute("aria-live", announce ? "polite" : "off");
      onActive(front);
    }
  }

  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 1 / 60);
    last = now;
    // While dragging the orbit follows the pointer exactly; otherwise it
    // eases to its target without overshooting.
    const ease = reduced || dragging ? 1 : 1 - Math.exp(-dt * 6);
    current += (target - current) * ease;
    const settled = !dragging && Math.abs(target - current) < 0.0004;
    if (settled) current = target;
    render();
    frame = settled ? 0 : requestAnimationFrame(tick);
  }

  function kick() {
    if (frame || count === 0) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  /** Turn to card `index` the shorter way round. */
  function goTo(index: number) {
    if (count === 0) return;
    const d = (((index - target) % count) + count) % count;
    target += d > count / 2 ? d - count : d;
    kick();
  }

  function stepBy(delta: number, byVisitor: boolean) {
    if (count < 2) return;
    announce = byVisitor;
    target = Math.round(target) + delta;
    kick();
  }

  function setHovered(index: number) {
    if (index === hovered) return;
    const previous = slots[hovered]?.querySelector<HTMLElement>("[data-tilt]");
    previous?.style.setProperty("--lift", "0px");
    previous?.style.setProperty("--rx", "0deg");
    previous?.style.setProperty("--ry", "0deg");
    previous?.style.setProperty("--px", "0");
    previous?.style.setProperty("--py", "0");
    hovered = index;
    if (index >= 0 && !reduced) slots[index]?.querySelector<HTMLElement>("[data-tilt]")?.style.setProperty("--lift", `${HOVER_LIFT}px`);
  }

  const slotIndex = (el: EventTarget | null) => {
    const slot = (el as Element | null)?.closest?.<HTMLElement>("[data-index]");
    return slot ? Number(slot.dataset.index) : -1;
  };

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    pressed = true;
    moved = false;
    startX = event.clientX;
    // Catch the orbit where it is on screen, even mid-glide: dragging from
    // the pending target instead would jump it there on the first move.
    target = current;
    startTarget = current;
    samples = [{ x: event.clientX, t: event.timeStamp }];
  }

  /** Ends a drag. With `velocity` (px/ms) the orbit carries on a little, then settles on a card. */
  function endDrag(pointerId: number, velocity: number) {
    dragging = false;
    delete stage.dataset.dragging;
    if (stage.hasPointerCapture(pointerId)) stage.releasePointerCapture(pointerId);
    const glide = (-velocity * 1000 * MOMENTUM) / stride();
    target = Math.round(current + clamp(glide, -MAX_GLIDE, MAX_GLIDE));
    kick();
  }

  function onPointerMove(event: PointerEvent) {
    if (pressed && count > 1) {
      const dx = event.clientX - startX;
      if (!dragging && Math.abs(dx) > DRAG_THRESHOLD) {
        dragging = true;
        moved = true;
        announce = true;
        stage.dataset.dragging = "true";
        stage.setPointerCapture(event.pointerId);
        setHovered(-1);
      }
      if (dragging) {
        target = startTarget - dx / stride();
        samples.push({ x: event.clientX, t: event.timeStamp });
        while (samples.length > 2 && event.timeStamp - samples[0].t > 100) samples.shift();
        kick();
      }
    }

    if (!dragging && event.pointerType === "mouse") {
      // No hover while the orbit is still turning: cards passing under a
      // resting cursor would otherwise lift and tilt mid-motion.
      const index = Math.abs(target - current) > 0.002 ? -1 : slotIndex(event.target);
      setHovered(index);
      // A subtle tilt toward the cursor; the card's photo reads --px/--py for parallax.
      const tilt = index >= 0 && !reduced ? slots[index]?.querySelector<HTMLElement>("[data-tilt]") : null;
      if (tilt) {
        const card = tilt.getBoundingClientRect();
        const nx = clamp((event.clientX - card.left) / card.width - 0.5, -0.5, 0.5);
        const ny = clamp((event.clientY - card.top) / card.height - 0.5, -0.5, 0.5);
        tilt.style.setProperty("--ry", `${(nx * 5).toFixed(2)}deg`);
        tilt.style.setProperty("--rx", `${(-ny * 4).toFixed(2)}deg`);
        tilt.style.setProperty("--px", nx.toFixed(3));
        tilt.style.setProperty("--py", ny.toFixed(3));
      }
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (!pressed) return;
    pressed = false;
    if (!dragging) {
      // A press that caught the orbit mid-glide without dragging: settle on a card.
      if (target !== Math.round(target)) {
        target = Math.round(current);
        kick();
      }
      return;
    }
    // Momentum from the last ~100ms of movement; a cancelled gesture has none.
    const first = samples[0];
    const elapsed = event.timeStamp - first.t;
    const velocity = elapsed > 0 && event.type === "pointerup" ? (event.clientX - first.x) / elapsed : 0;
    endDrag(event.pointerId, velocity);
  }

  // The browser took the pointer away from the stage mid-drag (e.g. the
  // window lost focus): end the drag there, or it would stay stuck in drag
  // mode. Only the stage's own capture counts: on touch, the card's link
  // holds the pointer first and fires this too as the drag moves capture to
  // the stage.
  function onLostPointerCapture(event: PointerEvent) {
    if (!dragging || event.target !== stage) return;
    pressed = false;
    endDrag(event.pointerId, 0);
  }

  function onPointerEnter() {
    pointerInside = true;
  }

  function onPointerLeave() {
    pointerInside = false;
    if (!dragging) setHovered(-1);
  }

  // A drag ends on a card: that release is not a click.
  function onClickCapture(event: MouseEvent) {
    if (!moved) return;
    event.preventDefault();
    event.stopPropagation();
    moved = false;
  }

  // Horizontal wheel and trackpad swipes only: vertical scrolling stays the page's.
  function onWheel(event: WheelEvent) {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (!delta || count < 2 || pressed) return;
    event.preventDefault();
    announce = true;
    target += delta / stride();
    kick();
    window.clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(() => {
      target = Math.round(target);
      kick();
    }, 160);
  }

  function onKeyDown(event: KeyboardEvent) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    stepBy(moves[event.key], true);
    // Keyboard focus travels with the orbit when it is on a card.
    if (slotIndex(document.activeElement) >= 0) {
      const index = (((Math.round(target) % count) + count) % count);
      slots[index]?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    }
  }

  function onFocusIn(event: FocusEvent) {
    focusInside = true;
    // Pressing a card focuses its link; that must never steer the orbit away
    // from a drag that is starting (after arrow keys, the browser can report
    // that focus as :focus-visible).
    if (pressed) return;
    const index = slotIndex(event.target);
    if (index >= 0 && (event.target as Element).matches(":focus-visible")) {
      announce = true;
      goTo(index);
    }
  }

  function onFocusOut(event: FocusEvent) {
    focusInside = stage.contains(event.relatedTarget as Node | null);
  }

  /** Rebuilds the orbit from the measured card and stage. */
  function measure() {
    const cardWidth = slots.find(Boolean)?.offsetWidth;
    if (!cardWidth || count === 0) return;
    layout = createOrbitLayout({
      cardWidth,
      perspective: PERSPECTIVE,
      gap: stage.clientWidth < COMPACT_WIDTH ? GAP_COMPACT : GAP,
      depth: ORBIT_DEPTH,
      shrink: DEPTH_SHRINK,
      yaw: ORBIT_YAW,
      count,
    });
    render();
  }

  // A slow auto-rotation, paused whenever the visitor is interacting or away.
  const autoRotate = reduced
    ? 0
    : window.setInterval(() => {
        if (pointerInside || focusInside || pressed || !onScreen || document.hidden || intro.value < 1 || opened) return;
        stepBy(1, false);
      }, AUTO_ROTATE * 1000);

  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
  });
  visibility.observe(stage);

  const resize = new ResizeObserver(measure);
  resize.observe(stage);
  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);
  stage.addEventListener("lostpointercapture", onLostPointerCapture);
  stage.addEventListener("pointerenter", onPointerEnter);
  stage.addEventListener("pointerleave", onPointerLeave);
  stage.addEventListener("click", onClickCapture, true);
  stage.addEventListener("wheel", onWheel, { passive: false });
  stage.addEventListener("keydown", onKeyDown);
  stage.addEventListener("focusin", onFocusIn);
  stage.addEventListener("focusout", onFocusOut);
  stage.addEventListener("dragstart", preventDefault);

  let introTween: gsap.core.Tween | undefined;
  const stopReveal = onIntroReveal(() => {
    if (reduced) return;
    introTween = gsap.to(intro, { value: 1, duration: 2, delay: 0.35, ease: EASE, onUpdate: kick });
  });

  return {
    setCount(next) {
      const refilter = count > 0;
      count = next;
      setHovered(-1);
      // A new orbit starts with its first role at the front.
      current = target = 0;
      activeIndex = -1;
      announce = false;
      measure();
      // A filtered set settles into its orbit from slightly deeper.
      if (refilter && !reduced && intro.value === 1) {
        introTween?.kill();
        introTween = gsap.fromTo(intro, { value: 0.55 }, { value: 1, duration: 1.2, ease: EASE, onUpdate: kick });
      }
      kick();
    },
    step(delta) {
      stepBy(delta, true);
    },
    setScroll(progress, opening, profile, covered) {
      scrollProgress = progress;
      opened = progress > 0 || opening > 0;
      scene = opened ? orbitScene(progress, opening, profile, window.innerHeight) : null;
      // Fully covered by what follows: no paint, no hit-testing.
      const container = stage.querySelector<HTMLElement>("[data-scene]");
      if (container) {
        container.style.visibility = covered ? "hidden" : "";
        container.style.pointerEvents = covered ? "none" : "";
      }
      render();
    },
    destroy() {
      cancelAnimationFrame(frame);
      window.clearTimeout(wheelTimer);
      window.clearInterval(autoRotate);
      stopReveal();
      introTween?.kill();
      resize.disconnect();
      visibility.disconnect();
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", onPointerUp);
      stage.removeEventListener("pointercancel", onPointerUp);
      stage.removeEventListener("lostpointercapture", onLostPointerCapture);
      stage.removeEventListener("pointerenter", onPointerEnter);
      stage.removeEventListener("pointerleave", onPointerLeave);
      stage.removeEventListener("click", onClickCapture, true);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("keydown", onKeyDown);
      stage.removeEventListener("focusin", onFocusIn);
      stage.removeEventListener("focusout", onFocusOut);
      stage.removeEventListener("dragstart", preventDefault);
    },
  };
}
