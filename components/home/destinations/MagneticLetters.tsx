"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";

const ACTIVE = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
/** The letter right under the cursor. */
const MAX_SCALE = 1.3;
/** How far the cursor reaches: in proportion to the letter's height, within these limits (px). */
const REACH_PER_HEIGHT = 1.3;
const REACH_MIN = 45;
const REACH_MAX = 190;
/** Shape of the falloff: about 1.08–1.15 next door, 1.02 further out, exactly 1 beyond it. */
const FALLOFF = 2.2;
/**
 * By default the hover colour starts at this much of the pull and is full at the next,
 * so that only the letter under the cursor takes it: its neighbours, half pulled, keep
 * their own colour instead of passing through a muddy mix of the two.
 */
const COLOR_FROM = 0.6;
const FULL_COLOR_AT = 0.85;

export type MagneticOptions = {
  /** The CSS custom property holding the hover colour. */
  color?: string;
  /**
   * Colour every letter whose pull (0 → 1) passes this, outright, with a short
   * transition, instead of blending with the pull: then no letter at the edge of the
   * cursor's reach ever rests between the two colours (dark to yellow passes olive).
   */
  snap?: number;
  /** How far the cursor reaches, in letter heights (within REACH_MIN–REACH_MAX). */
  reach?: number;
  /** The scale of the letter right under the cursor. */
  scale?: number;
};
const RISE_MS = 70;
const FALL_MS = 260;
const SETTLED = 0.002;

/**
 * One span per letter, for `useMagneticLetters`, in a word that never breaks
 * between them. Inline until the effect turns on, so it sets as plain text.
 */
export function Letters({ text }: { text: string }) {
  return (
    <span className="whitespace-nowrap">
      {[...text].map((letter, i) => (
        <span key={i} data-magnetic>
          {letter}
        </span>
      ))}
    </span>
  );
}

/**
 * Letters can only be transformed as inline-blocks, which lose the kerning
 * between them. Each gets it back as a margin in ems, so switching display moves
 * nothing, and it holds at any size.
 */
function keepKerning(letters: HTMLElement[]) {
  const inline = letters.map((el) => el.getBoundingClientRect());
  letters.forEach((el) => {
    el.style.display = "inline-block";
  });
  const block = letters.map((el) => el.getBoundingClientRect());
  letters.forEach((el, i) => {
    if (i === 0 || inline[i].top !== inline[i - 1].top) return;
    const kerning = inline[i].left - block[i].left - (inline[i - 1].left - block[i - 1].left);
    const size = parseFloat(getComputedStyle(el).fontSize);
    el.style.marginLeft = `${(kerning * (el.offsetWidth / block[i].width || 1)) / size}em`;
  });
}

/**
 * Each `[data-magnetic]` letter in `root` measures its own distance to the
 * cursor, swelling and turning the hover colour by it (the dark petrol green
 * unless told otherwise). It only ever transforms the letters: whatever moves
 * their wrappers (the scroll) is untouched, and the positions are read live
 * because of it. Mouse only; off for reduced motion.
 */
export function useMagneticLetters(
  root: RefObject<HTMLElement | null>,
  { color: hoverColor = "--infinity-petrol", snap, reach: reachPerHeight = REACH_PER_HEIGHT, scale: maxScale = MAX_SCALE }: MagneticOptions = {},
) {
  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    const media = gsap.matchMedia();

    media.add(ACTIVE, () => {
      const elements = gsap.utils.toArray<HTMLElement>(scope.querySelectorAll("[data-magnetic]"));
      const hover = getComputedStyle(document.documentElement).getPropertyValue(hoverColor).trim();
      let alive = true;
      let running = false;
      let ready = false;
      let pointer: { x: number; y: number } | null = null;
      const letters = elements.map((el) => ({
        el,
        pull: 0,
        idle: true,
        lit: false,
        setScaleX: gsap.quickSetter(el, "scaleX") as (value: number) => void,
        setScaleY: gsap.quickSetter(el, "scaleY") as (value: number) => void,
        // From its own colour, white or warm off-white, and back to it.
        color: gsap.utils.interpolate(getComputedStyle(el).color, hover),
      }));

      const tick = (_time: number, deltaMs: number) => {
        const rise = 1 - Math.exp(-deltaMs / RISE_MS);
        const fall = 1 - Math.exp(-deltaMs / FALL_MS);
        // Read everything first: the wrappers move with the scroll, so positions are live.
        const targets = letters.map((letter) => {
          if (!pointer) return 0;
          const box = letter.el.getBoundingClientRect();
          const size = box.height / (1 + (maxScale - 1) * letter.pull);
          const reach = gsap.utils.clamp(REACH_MIN, REACH_MAX, size * reachPerHeight);
          const t = Math.hypot(box.left + box.width / 2 - pointer.x, box.top + box.height / 2 - pointer.y) / reach;
          return t < 1 ? (1 - t) ** FALLOFF : 0;
        });
        let settled = true;
        letters.forEach((letter, i) => {
          const target = targets[i];
          if (letter.idle && target === 0) return;
          letter.pull += (target - letter.pull) * (target > letter.pull ? rise : fall);
          const atRest = target === 0 && letter.pull < SETTLED;
          if (atRest) letter.pull = 0;
          else settled = false;
          letter.idle = atRest;
          const scale = 1 + (maxScale - 1) * letter.pull;
          letter.setScaleX(scale);
          letter.setScaleY(scale);
          if (snap !== undefined) {
            const lit = letter.pull > snap;
            // As a reference to the token, not its value: if the token changes (a section whose
            // colours move with the scroll), a lit letter follows it.
            if (lit !== letter.lit) letter.el.style.color = lit ? `var(${hoverColor})` : "";
            letter.lit = lit;
          } else {
            letter.el.style.color = letter.pull > 0 ? letter.color(Math.min(1, Math.max(0, (letter.pull - COLOR_FROM) / (FULL_COLOR_AT - COLOR_FROM)))) : "";
          }
        });
        if (settled && !pointer) {
          running = false;
          gsap.ticker.remove(tick);
        }
      };

      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !ready) return;
        // Nothing to compute unless the section is on screen.
        const box = scope.getBoundingClientRect();
        const near = box.top < window.innerHeight - 1 && box.bottom > 0;
        pointer = near ? { x: event.clientX, y: event.clientY } : null;
        if (near && !running) {
          running = true;
          gsap.ticker.add(tick);
        }
      };
      const onLeave = () => {
        pointer = null;
      };

      if (snap !== undefined) elements.forEach((el) => (el.style.transition = "color 0.2s ease-out"));
      void document.fonts.ready.then(() => {
        if (!alive) return;
        keepKerning(elements);
        ready = true;
      });
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);

      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        gsap.set(elements, { clearProps: "transform" });
        elements.forEach((el) => {
          el.style.removeProperty("display");
          el.style.removeProperty("margin-left");
          el.style.removeProperty("color");
          el.style.removeProperty("transition");
        });
      };
    });

    return () => media.revert();
  }, [root, hoverColor, snap, reachPerHeight, maxScale]);
}
