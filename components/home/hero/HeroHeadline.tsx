"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

const ACTIVE = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
/** The letter right under the cursor. */
const MAX_SCALE = 1.36;
/** How far the cursor reaches, as a share of the font size (85px at the 68px headline), within these limits. */
const REACH_EM = 1.25;
const REACH_MIN = 65;
const REACH_MAX = 90;
/** Shape of the falloff: about 1.15 next door, 1.03 towards the edge, and exactly 1 beyond it. */
const FALLOFF = 1.45;
/** Letters inside the reach part by up to this share of the font size, so the swollen ones never collide. */
const PART_EM = 0.13;
/** At this much of the pull a letter is fully saffron; the ones beside it stay softer. */
const FULL_COLOR_AT = 0.75;
/** Smoothing, in milliseconds: letters answer quickly and settle slowly, with no overshoot. */
const RISE_MS = 70;
const FALL_MS = 260;
const SETTLED = 0.002;

type LetterMotion = {
  el: HTMLElement;
  /** The letter's centre at rest, relative to the heading. */
  cx: number;
  cy: number;
  /** The cursor's current pull on this letter, from 0 to 1. */
  pull: number;
  /** How far it is parted from the cursor, in pixels. */
  shift: number;
  /** Nothing to write: already back at rest. */
  idle: boolean;
  setX: (value: number) => void;
  setScaleX: (value: number) => void;
  setScaleY: (value: number) => void;
  color: (progress: number) => string;
};

/** One span per letter. Inline until the effect turns on, so it sets exactly as plain text. */
function Letters({ text }: { text: string }) {
  return (
    <>
      {[...text].map((letter, i) => (
        <span key={i} data-letter>
          {letter}
        </span>
      ))}
    </>
  );
}

/** A word never breaks between its letters, whatever they are displayed as. */
function Word({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

/** A headline line that rises out of its own mask on entry. */
function Line({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    // Padding inside the mask leaves room for descenders and the italic overhang.
    <span data-line-mask className={`-mx-[0.1em] -mb-[0.16em] block overflow-hidden px-[0.1em] pb-[0.16em] ${className}`}>
      <span data-line className="block will-change-transform">
        {children}
      </span>
    </span>
  );
}

function Accent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <em className={`font-accent text-[1.06em] font-normal italic tracking-[-0.012em] ${className}`}>{children}</em>;
}

/**
 * Letters can only be transformed as inline-blocks, which lose the kerning
 * between them. Each gets that kerning back as a margin in ems, so switching
 * display moves nothing and the result holds at every font size.
 */
function makeTransformable(letters: HTMLElement[]) {
  const inline = letters.map((el) => el.getBoundingClientRect());
  letters.forEach((el) => {
    el.style.display = "inline-block";
  });
  const block = letters.map((el) => el.getBoundingClientRect());
  letters.forEach((el, i) => {
    if (i === 0 || inline[i].top !== inline[i - 1].top) return;
    const kerning = inline[i].left - block[i].left - (inline[i - 1].left - block[i - 1].left);
    el.style.marginLeft = `${kerning / parseFloat(getComputedStyle(el).fontSize)}em`;
  });
}

/**
 * The hero heading. The cursor is a lens passing over its letters: each one
 * measures its own distance to the cursor, swelling and turning saffron by it,
 * so the peak travels letter by letter as a wave. Transforms on the letters
 * only: the layout never moves. Mouse only, and off for reduced motion: there
 * it stays plain text.
 */
export function HeroHeadline() {
  const root = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const heading = root.current;
    if (!heading) return;
    const media = gsap.matchMedia();

    media.add(ACTIVE, () => {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--brand-accent").trim();
      const elements = gsap.utils.toArray<HTMLElement>(heading.querySelectorAll("[data-letter]"));
      const lines = gsap.utils.toArray<HTMLElement>(heading.querySelectorAll("[data-line]"));
      const masks = gsap.utils.toArray<HTMLElement>(heading.querySelectorAll("[data-line-mask]"));
      let letters: LetterMotion[] = [];
      let measured = false;
      let entered = false;
      let running = false;
      let alive = true;
      let pointer: { x: number; y: number } | null = null;
      let reach = REACH_MAX;
      let part = 0;

      const measure = () => {
        const origin = heading.getBoundingClientRect();
        const fontSize = parseFloat(getComputedStyle(heading).fontSize);
        reach = gsap.utils.clamp(REACH_MIN, REACH_MAX, fontSize * REACH_EM);
        part = fontSize * PART_EM;
        letters.forEach((letter) => {
          const box = letter.el.getBoundingClientRect();
          letter.cx = box.left + box.width / 2 - origin.left;
          letter.cy = box.top + box.height / 2 - origin.top;
        });
        measured = true;
      };

      const tick = (_time: number, deltaMs: number) => {
        if (!measured) measure();
        const origin = heading.getBoundingClientRect();
        const rise = 1 - Math.exp(-deltaMs / RISE_MS);
        const fall = 1 - Math.exp(-deltaMs / FALL_MS);
        let settled = true;

        for (const letter of letters) {
          let targetPull = 0;
          let targetShift = 0;
          if (pointer) {
            const dx = letter.cx - (pointer.x - origin.left);
            const dy = letter.cy - (pointer.y - origin.top);
            const distance = Math.hypot(dx, dy);
            const t = distance / reach;
            if (t < 1) {
              targetPull = (1 - t) ** FALLOFF;
              // A lens: nothing under the cursor, most beside it, nothing at the edge, so letters beyond it never move.
              targetShift = (dx / Math.max(distance, 1)) * part * Math.sin(Math.PI * t);
            }
          }
          if (letter.idle && targetPull === 0) continue;

          letter.pull += (targetPull - letter.pull) * (targetPull > letter.pull ? rise : fall);
          letter.shift += (targetShift - letter.shift) * (targetPull > letter.pull ? rise : fall);
          const atRest = targetPull === 0 && letter.pull < SETTLED;
          if (atRest) {
            letter.pull = 0;
            letter.shift = 0;
          } else settled = false;
          letter.idle = atRest;

          const scale = 1 + (MAX_SCALE - 1) * letter.pull;
          letter.setX(letter.shift);
          letter.setScaleX(scale);
          letter.setScaleY(scale);
          letter.el.style.color = letter.pull > 0 ? letter.color(Math.min(1, letter.pull / FULL_COLOR_AT)) : "";
        }

        if (settled && !pointer) {
          running = false;
          gsap.ticker.remove(tick);
        }
      };

      /** The entrance needs the masks, and moves the letters being measured. */
      const entranceIsOver = () => {
        if (entered) return true;
        entered = lines.every((line) => !gsap.isTweening(line) && gsap.getProperty(line, "yPercent") === 0);
        if (entered) masks.forEach((mask) => (mask.style.overflow = "visible"));
        return entered;
      };

      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !letters.length || !entranceIsOver()) return;
        const box = heading.getBoundingClientRect();
        const near =
          event.clientX > box.left - REACH_MAX &&
          event.clientX < box.right + REACH_MAX &&
          event.clientY > box.top - REACH_MAX &&
          event.clientY < box.bottom + REACH_MAX;
        // Away from the heading there is nothing to compute: the letters just let go.
        pointer = near ? { x: event.clientX, y: event.clientY } : null;
        if (near && !running) {
          running = true;
          gsap.ticker.add(tick);
        }
      };

      const onLeave = () => {
        pointer = null;
      };

      // Rest positions change with the layout: put everything back and measure afresh.
      const onResize = () => {
        letters.forEach((letter) => {
          letter.pull = 0;
          letter.shift = 0;
          letter.idle = true;
          letter.setX(0);
          letter.setScaleX(1);
          letter.setScaleY(1);
          letter.el.style.color = "";
        });
        measured = false;
      };

      void document.fonts.ready.then(() => {
        if (!alive) return;
        makeTransformable(elements);
        letters = elements.map((el) => ({
          el,
          cx: 0,
          cy: 0,
          pull: 0,
          shift: 0,
          idle: true,
          setX: gsap.quickSetter(el, "x", "px") as (value: number) => void,
          setScaleX: gsap.quickSetter(el, "scaleX") as (value: number) => void,
          setScaleY: gsap.quickSetter(el, "scaleY") as (value: number) => void,
          // The saffron "here." starts from its own colour and returns to it; the rest from ivory.
          color: gsap.utils.interpolate(getComputedStyle(el).color, accent),
        }));
      });

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);

      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("resize", onResize);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        gsap.set(elements, { clearProps: "transform" });
        elements.forEach((el) => {
          el.style.removeProperty("display");
          el.style.removeProperty("margin-left");
          el.style.removeProperty("color");
        });
        masks.forEach((mask) => mask.style.removeProperty("overflow"));
      };
    });

    return () => media.revert();
  }, []);

  return (
    <h1 ref={root} aria-label="Ready to grow? Your next move starts here." className="text-display font-medium text-neutral max-lg:text-display-compact">
      <Line>
        <Word>
          <Letters text="Ready" />
        </Word>{" "}
        <Word>
          <Letters text="to" />
        </Word>{" "}
        <Word>
          <Accent>
            <Letters text="grow?" />
          </Accent>
        </Word>
      </Line>
      <Line className="pl-[8%] xl:pl-[16%]">
        {/* One line from lg up; below that it breaks here, between the two thoughts. */}
        <span className="block lg:inline">
          <Word>
            <Letters text="Your" />
          </Word>{" "}
          <Word>
            <Letters text="next" />
          </Word>{" "}
          <Word>
            <Letters text="move" />
          </Word>
        </span>{" "}
        <span className="block lg:inline">
          <Word>
            <Letters text="starts" />
          </Word>{" "}
          <Word>
            <Accent className="text-accent">
              <Letters text="here." />
            </Accent>
          </Word>
        </span>
      </Line>
    </h1>
  );
}
