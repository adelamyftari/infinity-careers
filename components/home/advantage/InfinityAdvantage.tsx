"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ADVANTAGE_RISE } from "@/components/home/destinations/DestinationsShowcase";
import { Letters, useMagneticLetters } from "@/components/home/destinations/MagneticLetters";
import { createBenefitsScene, entering, ENTERING, type BenefitsLayout, type BenefitsScene, type Target } from "@/lib/advantage/benefits-scene";
import type { FieldPointer } from "@/lib/advantage/field";
import { ROLES_SCENE } from "@/lib/carousel/orbit-scroll";
import { BenefitOverlay } from "./BenefitOverlay";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { FinalCall } from "./FinalCall";

gsap.registerPlugin(ScrollTrigger);

/*
 * The pacing, in screens of scrolling, all on one clock (one pinned ScrollTrigger).
 * The heading writes itself and holds while a first golden filament is drawn
 * across beneath it (INTRO). Then (ENTER) the heading leaves, the whole frame turns
 * deep petrol, and the camera tracks right to the first benefit (ENTERING in
 * the scene sets the order); at each, the mark WEAVEs
 * through the type to its resting place in an opening and the description is
 * read (HOLD); the camera TRAVELs on to the next, easing out of one and into the
 * other. After the third the journey along X is over. The FINAL screen begins:
 * the first forward step into it releases the drop, a timed animation that plays
 * through on its own (its length set by the scene's kinematics), so one scroll
 * is all it takes: the camera dives as "JOIN OUR TEAM." and its button come up;
 * the mark falls under gravity onto the button, which gives under it and flashes
 * Infinity Yellow; it rebounds, is pushed out past the button's end, falls again
 * and lands hard in the collection, which scatters and settles. The rest of that
 * screen is time to read it; then the footer rises.
 */
/** Once pinned, the heading's last moment of writing: most of it is written as the section rises into view (APPROACH). */
const REVEAL = 0.25;
/** Where the heading begins to write itself as the section rises (its top this far down the screen), and is done. */
const APPROACH = { start: "top 80%", end: "top 8%" };
const INTRO_HOLD = 0.45;
const ENTER = 0.65;
const WEAVE = 0.45;
const HOLD = 0.35;
const TRAVEL = 0.65;
/** A description comes in this long after its headline's letters begin, over this long (seconds). */
const DESCRIPTION = { delay: 0.35, fade: 0.7 };
const FINAL = 1.1;
/** How far into the final screen the drop is released (a single wheel step or swipe): in screens. */
const RELEASE_AT = 0.04;
/** Back above it by this much (a little less than a step), the drop runs back up. */
const RETURN_BELOW = 0.03;
/** The button's flash when struck, in seconds: up at contact, held, back to white. */
const STRIKE = { rise: 0.15, hold: 0.3, fade: 0.4 };
/** Running back up is quicker. */
const RETURN_SPEED = 1.8;
/** The footer's rise: it is drawn up over this last screen (see SiteFooter). */
export const FOOTER_RISE = 1;

type World = { bg: string; text: string; hover: string; dark: boolean };
/**
 * The worlds, in the brand's colours only: the heading on the page's dotted warm
 * white; the benefits and the ending in deep petrol, with a restrained depth. Text: petrol on warm white 11:1, warm white on petrol 11:1; near
 * the cursor the letters only grow on light, and turn yellow on dark.
 */
const LIGHT: World = { bg: "#f7f7f2", text: "#102f32", hover: "#102f32", dark: false };
/* The ending stays in the petrol world: "JOIN OUR TEAM." in warm white above the collection. */
const PETROL: World = { bg: "#102f32", text: "#f7f7f2", hover: "#e9ae00", dark: true };

const LETTERS = { color: "--adv-hover", snap: 0.1, reach: 2.4, scale: 1.22 };

const clamp = gsap.utils.clamp;
const smooth = (t: number) => t * t * (3 - 2 * t);

type Kind = "reveal" | "intro" | "enter" | "weave" | "hold" | "travel" | "final" | "footer";
type Phase = { kind: Kind; from: number; length: number; index: number };

/**
 * The Infinity Advantage: the benefits in one horizontally travelling 3D scene.
 * The section rises over the properties and holds the screen: the heading writes
 * itself on the page's dotted warm white; then the world turns deep petrol and
 * the camera travels from left to right through three benefits in dimensional
 * type, the Infinity mark weaving through them on a golden flow; then, with one
 * scroll, the mark falls from the last O into a collection of tiny marks,
 * "JOIN OUR TEAM." comes up, and the footer rises over it.
 *
 * The 3D (lib/advantage/benefits-scene) is a pure function of scroll progress and
 * of the drop's own progress, so every step runs backward exactly as forward. The heading, the descriptions and
 * the final call are HTML, driven through CSS variables; the titles stay in the
 * page as text for assistive technology. Without motion, or without WebGL, it is
 * a plain section.
 */
export function InfinityAdvantage() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  useMagneticLetters(stage, LETTERS);

  // The slide up: drawn up over the properties scene's last screen, it enters at the
  // screen's foot as the deck closes and reaches the top as the scene ends, where
  // this one pins. Measured after each refresh, not assumed: if its margin must
  // change it asks for one more refresh (it lies below that scene, so one pass settles it).
  useLayoutEffect(() => {
    const el = section.current;
    if (!el) return;
    const lift = () => {
      const scene = ScrollTrigger.getById(ROLES_SCENE);
      const current = parseFloat(el.style.marginTop) || 0;
      if (!scene || !document.querySelector("[data-handoff=overlay]")) {
        if (!current) return false;
        el.style.removeProperty("margin-top");
        return true;
      }
      const natural = el.getBoundingClientRect().top + window.scrollY - current;
      const margin = Math.round(scene.end + window.innerHeight * (1 - ADVANTAGE_RISE) - natural);
      if (Math.abs(margin - current) < 1) return false;
      el.style.marginTop = `${margin}px`;
      return true;
    };
    let frame = 0;
    const onRefresh = () => {
      if (lift()) frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    ScrollTrigger.addEventListener("refresh", onRefresh);
    onRefresh();
    return () => {
      cancelAnimationFrame(frame);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      el.style.removeProperty("margin-top");
    };
  }, []);

  useLayoutEffect(() => {
    const root = section.current;
    const box = stage.current;
    if (!root || !box) return;
    const canvas = box.querySelector<HTMLCanvasElement>("[data-adv-canvas]");
    const heading = box.querySelector<HTMLElement>("[data-adv-heading]");
    const bar = box.querySelector<HTMLElement>("[data-adv-bar]");
    const counter = box.querySelector<HTMLElement>("[data-adv-count]");
    const cta = box.querySelector<HTMLElement>("[data-cta]");
    const lines = Array.from(box.querySelectorAll<HTMLElement>("[data-adv-line]"));
    const chapters = Array.from(box.querySelectorAll<HTMLElement>("[data-chapter]"));
    if (!canvas || !heading || !bar || !counter) return;
    const count = chapters.length;

    // The phases, in screens: one master clock for everything.
    const phases: Phase[] = [];
    let at = 0;
    const add = (kind: Kind, length: number, index = 0) => {
      phases.push({ kind, from: at, length, index });
      at += length;
    };
    add("reveal", REVEAL);
    add("intro", INTRO_HOLD);
    add("enter", ENTER);
    for (let i = 0; i < count; i++) {
      if (i > 0) add("travel", TRAVEL, i);
      add("weave", WEAVE, i);
      add("hold", HOLD, i);
    }
    add("final", FINAL);
    add("footer", FOOTER_RISE);
    const screens = at;
    /** A phase's progress on the clock: 0 before it, 1 after it, its progress during it. */
    const progressOf = (u: number, kind: Kind, index = 0) => {
      const ph = phases.find((p) => p.kind === kind && p.index === index);
      return ph ? clamp(0, 1, (u - ph.from) / ph.length) : 0;
    };

    const setVar = (el: HTMLElement, name: string, value: string) => el.style.setProperty(name, value);
    const setData = (el: HTMLElement, key: string, value: string) => {
      if (el.dataset[key] !== value) el.dataset[key] = value;
    };

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      let scene: BenefitsScene;
      try {
        scene = createBenefitsScene(canvas);
      } catch {
        return; // No WebGL: the plain section stays.
      }
      root.dataset.journey = "on";
      // The mark's journey, one continuous measure from the first benefit's arrival to the last
      // one's reading: where each benefit's reading begins and ends along it.
      {
        const first = phases.find((ph) => ph.kind === "weave");
        const end = phases.find((ph) => ph.kind === "final");
        const from = first ? first.from : 0;
        const span = (end ? end.from : screens) - from;
        const at = (kind: Kind, i: number, edge: "start" | "end") => {
          const ph = phases.find((p) => p.kind === kind && p.index === i);
          return ph ? (ph.from + (edge === "end" ? ph.length : 0) - from) / span : 0;
        };
        scene.setRhythm(
          chapters.map((_, i) => at("weave", i, "start")),
          chapters.map((_, i) => at("hold", i, "end")),
        );
      }
      // The drop: one timed animation, played forward once the visitor steps into the final screen,
      // and back if they return above it. `raw` is the scroll position itself (not the smoothed one),
      // so the release answers the very first step.
      const drop = { d: 0 };
      // (Its length is the scene's, set on each layout: the kinematics depend on the screen.)
      const dropTween = gsap.to(drop, { d: 1, duration: 1.8, ease: "none", paused: true, onUpdate: () => void (dirty = true) });
      const finalPhase = phases.find((ph) => ph.kind === "final");
      const releaseAt = (finalPhase ? finalPhase.from : screens) + RELEASE_AT;
      let raw = 0;
      let released = false;
      let settled = false;
      let landedAt = -1;
      /** How far the section has risen into view (0 → 1), set once its trigger exists. */
      let readApproach = () => 0;
      /** Whether a headline's letters are still coming in (frames are drawn until they are). */
      let revealing = false;
      let dirty = true;
      // The pointer (mouse, pen or touch) over the scene, for the field of marks: only where it is
      // recorded; it is turned into the scene's coordinates once per frame, and never over the footer.
      const footer = document.querySelector("footer");
      const client = { x: 0, y: 0, on: false, fine: false };
      const pointer: FieldPointer = { x: 0, y: 0, on: false };
      // The headlines answer a mouse or pen only, on a device that hovers (never a touch).
      const hovers = window.matchMedia("(hover: hover) and (pointer: fine)");
      const onPointer = (e: PointerEvent) => {
        client.x = e.clientX;
        client.y = e.clientY;
        client.on = true;
        client.fine = hovers.matches && e.pointerType !== "touch";
        if (client.fine) dirty = true;
      };
      const onTouch = (e: TouchEvent) => {
        const touch = e.touches[0];
        if (!touch) return;
        client.x = touch.clientX;
        client.y = touch.clientY;
        client.on = true;
        client.fine = false;
      };
      const onLeave = () => {
        client.on = false;
        dirty = true;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("touchstart", onTouch, { passive: true });
      window.addEventListener("touchmove", onTouch, { passive: true });
      window.addEventListener("touchend", onLeave, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      const readPointer = () => {
        if (!client.on) return null;
        const r = box.getBoundingClientRect();
        const below = footer ? footer.getBoundingClientRect().top : Infinity;
        pointer.on = client.y >= r.top && client.y <= r.bottom && client.y < below;
        pointer.x = ((client.x - r.left) / r.width) * 2 - 1;
        pointer.y = 1 - ((client.y - r.top) / r.height) * 2;
        return pointer.on ? pointer : null;
      };
      /** The cursor for the headlines: a mouse or pen over the scene (not over the footer). */
      const cursor = { x: 0, y: 0 };
      const readCursor = () => {
        if (!client.on || !client.fine) return null;
        const r = box.getBoundingClientRect();
        const below = footer ? footer.getBoundingClientRect().top : Infinity;
        if (client.y < r.top || client.y > r.bottom || client.y >= below) return null;
        cursor.x = client.x;
        cursor.y = client.y;
        return cursor;
      };
      const decide = (instant: boolean) => {
        const next = released ? raw >= releaseAt - RETURN_BELOW : raw >= releaseAt;
        if (next === released) return;
        released = next;
        if (instant) dropTween.progress(next ? 1 : 0).pause();
        else if (next) dropTween.timeScale(1).play();
        else dropTween.timeScale(RETURN_SPEED).reverse();
      };
      // The heading lines this screen shows (two, or three on a phone), and the scene's layout:
      // read on resize, not per frame. The type is set between the heading's own margins, and
      // each description is placed from its benefit's measured type: just below it, its right
      // edge on the type's right edge (on a phone, on the type's left edge, where it reads best).
      let shownLines: HTMLElement[] = [];
      let frame: BenefitsLayout = { tall: false, frames: [], drop: { seconds: 1.8, join: 0.1, impact: 0.34, land: 0.67, side: 1 } };
      // The button the mark strikes, where it stands in the final frame, in the canvas's pixels: from
      // layout (offsets), so neither its entrance nor its give moves the target.
      const ctaBox = (): Target | null => {
        const parent = cta?.offsetParent;
        if (!cta || !(parent instanceof HTMLElement)) return null;
        const from = parent.getBoundingClientRect();
        const to = canvas.getBoundingClientRect();
        return { left: from.left - to.left + cta.offsetLeft, top: from.top - to.top + cta.offsetTop, width: cta.offsetWidth, height: cta.offsetHeight };
      };
      // The tallest of the three descriptions (they share one place and measure, but not one length).
      const descHeight = () => Math.max(0, ...chapters.map((c) => c.querySelector("p")?.offsetHeight ?? 0)) || 120;
      let usedDescHeight = -1;
      const size = () => {
        usedDescHeight = descHeight();
        frame = scene.resize(box.clientWidth, box.clientHeight, heading.offsetLeft, ctaBox(), usedDescHeight);
        dropTween.duration(frame.drop.seconds);
        if (cta) setVar(cta, "--side", String(frame.drop.side));
        shownLines = lines.filter((line) => line.offsetParent !== null);
        const gap = Math.min(48, Math.max(28, box.clientHeight * 0.045));
        chapters.forEach((chapter, c) => {
          const f = frame.frames[c];
          if (!f) return;
          setData(chapter, "layout", frame.tall ? "stack" : "aside");
          setVar(chapter, "--type-left", `${Math.round(f.left)}px`);
          setVar(chapter, "--type-right", `${Math.round(f.right)}px`);
          setVar(chapter, "--type-top", `${Math.round(f.top)}px`);
          setVar(chapter, "--desc-top", `${Math.round(f.bottom + gap)}px`);
        });
        // The mark's course passes beside the descriptions: with them now set, lay out once more if their height differs.
        if (Math.abs(descHeight() - usedDescHeight) > 4) {
          usedDescHeight = descHeight();
          frame = scene.resize(box.clientWidth, box.clientHeight, heading.offsetLeft, ctaBox(), usedDescHeight);
        }
      };
      size();

      const state = { p: 0 };
      let lastTone = "";
      let lastHover = "";
      let lastCount = "";
      const indices = chapters.map((_, i) => i);
      const firstWeave = phases.find((ph) => ph.kind === "weave");
      const journeyFrom = firstWeave ? firstWeave.from : 0;
      const journeyTo = finalPhase ? finalPhase.from : screens;

      const render = () => {
        const u = state.p * screens;
        const now = performance.now() / 1000;
        const d = drop.d;
        if (d < frame.drop.land) landedAt = -1;
        else if (landedAt < 0) landedAt = now;

        // The heading: line after line, each from left to right. As the camera tracks on, it
        // leaves to the left with the world it stands in.
        const reveal = Math.max(readApproach() * 0.92, progressOf(u, "reveal"));
        setVar(root, "--approach", readApproach().toFixed(4));
        const n = shownLines.length;
        shownLines.forEach((line, k) => {
          const start = n > 1 ? (k * 0.4) / (n - 1) : 0;
          line.style.setProperty("--reveal", smooth(clamp(0, 1, (reveal - start) / 0.6)).toFixed(4));
        });
        // Then it leaves first: a short move to the left as it fades, before the camera tracks on.
        const enter = progressOf(u, "enter");
        const out = entering(enter, ENTERING.heading);
        heading.style.setProperty("--shift", (out * Math.min(140, box.clientWidth * 0.08)).toFixed(1));
        heading.style.setProperty("--out", out.toFixed(4));
        heading.style.visibility = out >= 1 ? "hidden" : "";
        const track = entering(enter, ENTERING.camera);

        // The 3D scene: the type, the flow, the mark, the drop and the collection.
        const shown = scene.render({
          intro: progressOf(u, "intro"),
          enter,
          weave: indices.map((i) => progressOf(u, "weave", i)),
          journey: clamp(0, 1, (u - journeyFrom) / (journeyTo - journeyFrom)),
          travel: indices.map((i) => progressOf(u, "travel", i)),
          drop: d,
          ambient: now,
          since: landedAt < 0 ? -1 : now - landedAt,
          pointer: d > 0.05 ? readPointer() : null,
          cursor: readCursor(),
        });
        const release = smooth(clamp(0, 1, (d * frame.drop.seconds) / 0.22));

        // The descriptions: each comes in once, a beat after its headline's letters begin, and then
        // stays, travelling with its composition as the camera moves on (it is not faded out; only
        // the last one goes, with the drop).
        revealing = shown.revealing;
        chapters.forEach((chapter, c) => {
          const at = shown.revealedAt[c];
          const arrive = at < 0 ? 0 : smooth(clamp(0, 1, (now - at - DESCRIPTION.delay) / DESCRIPTION.fade));
          const leave = c === count - 1 ? release : 0;
          const offset = shown.offsets[c];
          setVar(chapter, "--in", arrive.toFixed(4));
          setVar(chapter, "--out", leave.toFixed(4));
          setVar(chapter, "--slide", offset.toFixed(1));
          chapter.style.visibility = arrive <= 0 || leave >= 1 || Math.abs(offset) > box.clientWidth * 1.1 ? "hidden" : "";
        });

        // "JOIN OUR TEAM." as the camera dives (its words rise from their masks, then the button),
        // so the button stands ready before the mark reaches it.
        setData(box, "join", String(d >= frame.drop.join));
        // The strike, in seconds since contact (from the drop's own progress, so it runs back exactly):
        // the button gives under the mark, one damped spring (down, pressed shorter and a little wider,
        // tipped a touch toward the struck side) and settles; it flashes Infinity Yellow at the very
        // moment of contact, holds it briefly, and returns to white. Real hover still answers.
        if (cta) {
          const since = (d - frame.drop.impact) * frame.drop.seconds;
          const give = since > 0 && since < 1.2 ? Math.exp(-since / 0.11) * Math.sin((2 * Math.PI * since) / 0.24) : 0;
          const lit = since <= 0 ? 0 : since < STRIKE.rise ? smooth(since / STRIKE.rise) : 1 - smooth(clamp(0, 1, (since - STRIKE.rise - STRIKE.hold) / STRIKE.fade));
          setVar(cta, "--give", give.toFixed(4));
          setVar(cta, "--lit", lit.toFixed(4));
        }

        // The world: the whole frame turns from warm white to deep petrol at once, the dots fading
        // with it, as the heading leaves and before the first benefit arrives; it stays petrol to the end.
        const blend = entering(enter, ENTERING.world);
        const mix = (x: string, y: string, t: number) => (t <= 0 ? x : t >= 1 ? y : `color-mix(in oklab, ${y} ${(t * 100).toFixed(1)}%, ${x})`);
        setVar(root, "--adv-bg", mix(LIGHT.bg, PETROL.bg, blend));
        setVar(root, "--adv-text", mix(LIGHT.text, PETROL.text, blend));

        // Above the type: the section's name and where the visitor is among the three.
        const shownBar = smooth(clamp(0, 1, (track - 0.6) / 0.4)) * (1 - release);
        setVar(bar, "--bar", shownBar.toFixed(3));
        bar.style.visibility = shownBar > 0 ? "visible" : "hidden";
        let current = 0;
        for (let i = 1; i < count; i++) if (progressOf(u, "travel", i) >= 0.5) current = i;
        const label = String(current + 1).padStart(2, "0");
        if (label !== lastCount) counter.textContent = lastCount = label;
        setVar(bar, "--progress", clamp(0, 1, (u - journeyFrom) / (journeyTo - journeyFrom)).toFixed(4));
        setVar(root, "--adv-dots", (1 - blend).toFixed(3));
        setVar(root, "--adv-depth", smooth(clamp(0, 1, (enter - 0.85) / 0.15)).toFixed(3));
        const near = blend < 0.5 ? LIGHT : PETROL;
        if (near.hover !== lastHover) setVar(root, "--adv-hover", (lastHover = near.hover));
        const tone = near.dark ? "dark" : "light";
        if (tone !== lastTone) {
          root.dataset.tone = lastTone = tone;
          window.dispatchEvent(new Event("header:tone"));
        }
      };

      // One frame, drawn after GSAP has moved everything for it: when something changed, and
      // continuously while the field of marks is in sight (it is alive); not once the section has gone.
      const frameTick = () => {
        if (dirty || revealing || (drop.d > 0.05 && raw < screens)) {
          dirty = false;
          render();
        }
      };
      gsap.ticker.add(frameTick);

      // The heading writes itself as the section rises into view, so it is alive before it pins.
      const approach = { p: 0 };
      const approachTween = gsap.to(approach, {
        p: 1,
        ease: "none",
        onUpdate: () => void (dirty = true),
        scrollTrigger: { trigger: box, start: APPROACH.start, end: APPROACH.end, scrub: 0.5, invalidateOnRefresh: true },
      });
      readApproach = () => approach.p;

      const tween = gsap.to(state, {
        p: 1,
        ease: "none",
        onUpdate: () => void (dirty = true),
        scrollTrigger: {
          trigger: box,
          start: "top top",
          end: () => `+=${screens * window.innerHeight}`,
          pin: true,
          // Half a second of smoothing: fluid, without the mark trailing the scroll.
          scrub: 0.5,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            raw = self.progress * screens;
            decide(false);
          },
          onRefresh: (self) => {
            size();
            raw = self.progress * screens;
            // Arriving straight into the ending (a reload, a link): it is simply there.
            decide(!settled);
            settled = true;
            render();
          },
        },
      });
      const resize = new ResizeObserver(() => {
        size();
        render();
      });
      resize.observe(box);
      render();

      return () => {
        resize.disconnect();
        gsap.ticker.remove(frameTick);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("touchstart", onTouch);
        window.removeEventListener("touchmove", onTouch);
        window.removeEventListener("touchend", onLeave);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        dropTween.kill();
        approachTween.scrollTrigger?.kill();
        approachTween.kill();
        root.style.removeProperty("--approach");
        tween.scrollTrigger?.kill();
        tween.kill();
        scene.dispose();
        delete root.dataset.journey;
        delete box.dataset.join;
        root.dataset.tone = "light";
        ["--adv-bg", "--adv-text", "--adv-dots", "--adv-depth", "--adv-hover"].forEach((name) => root.style.removeProperty(name));
        lines.forEach((line) => line.style.removeProperty("--reveal"));
        ["--out", "--shift", "visibility"].forEach((name) => heading.style.removeProperty(name));
        ["--bar", "--progress", "visibility"].forEach((name) => bar.style.removeProperty(name));
        ["--give", "--lit", "--side"].forEach((name) => cta?.style.removeProperty(name));
        counter.textContent = "01";
        chapters.forEach((chapter) => {
          ["--in", "--out", "--slide", "--type-left", "--type-right", "--type-top", "--desc-top"].forEach((name) => chapter.style.removeProperty(name));
          delete chapter.dataset.layout;
          chapter.style.removeProperty("visibility");
        });
        window.dispatchEvent(new Event("header:tone"));
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={section}
      id="why-infinity"
      aria-labelledby="advantage-title"
      data-header-surface
      data-tone="light"
      className="relative z-20 bg-(--adv-bg) text-(--adv-text) shadow-[0_-24px_60px_-28px_rgb(16_47_50/0.35)] [--adv-bg:var(--brand-neutral)] [--adv-dots:1] [--adv-hover:#102f32] [--adv-text:var(--infinity-petrol)]"
    >
      {/* Pinned, it scrolls only up and down: a sideways drag over the field moves the marks, never the browser's history. */}
      <div ref={stage} className="relative overflow-hidden px-(--gutter) pb-24 pt-28 in-data-[journey=on]:h-screen in-data-[journey=on]:touch-pan-y in-data-[journey=on]:p-0">
        {/* The orbit section's own dots, aligned with them; the warm white heading and ending keep them. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,var(--dot)_1.2px,transparent_1.2px)] bg-size-[28px_28px] bg-fixed opacity-(--adv-dots)"
        />
        {/* The brand's mark, large and barely there, filling the warm white's right side while the
            heading is read (as the hero's watermark, in the dark teal on the light); it comes up a
            little as the section rises, and goes with the warm white. */}
        <InfinityMark
          aria-hidden="true"
          fill="#102f32"
          className="pointer-events-none absolute right-(--gutter) top-1/2 h-auto w-[min(36vw,74vh)] -translate-y-[52%] opacity-[calc(0.065*var(--adv-dots,1))] [scale:calc(0.96+0.04*var(--approach,1))] max-md:-right-[22vw] max-md:w-[86vw]"
        />
        {/* The petrol world's restrained depth: a soft falloff toward the edges. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(130%_95%_at_50%_42%,transparent_38%,rgb(5_22_28/0.6))] opacity-(--adv-depth,0) in-data-[journey=on]:block"
        />
        {/* The benefits in dimensional type, the golden flow, the Infinity mark and the collection it falls into. */}
        <canvas data-adv-canvas aria-hidden="true" className="pointer-events-none absolute inset-0 hidden size-full in-data-[journey=on]:block" />

        {/* The heading, written from left to right as the page scrolls, in the middle of its screen on
            the page's grid; it leaves to the left with the world as the camera tracks on. */}
        <div
          data-adv-heading
          className="relative text-(--infinity-petrol) in-data-[journey=on]:absolute in-data-[journey=on]:inset-y-0 in-data-[journey=on]:left-[max(var(--gutter),8vw)] in-data-[journey=on]:right-(--gutter) in-data-[journey=on]:flex in-data-[journey=on]:flex-col in-data-[journey=on]:justify-center in-data-[journey=on]:pb-[8vh] in-data-[journey=on]:pt-20 in-data-[journey=on]:translate-x-[calc(var(--shift,0)*-1px)] in-data-[journey=on]:opacity-[calc(1-var(--out,0))]"
        >
          <h2 id="advantage-title" aria-label="The benefits of being part of Infinity" className="text-[clamp(2.5rem,1rem+5vw,6.25rem)]/[0.95] font-extrabold tracking-[-0.03em]">
            {/* Two lines from tablet up, three on a phone: each written in its turn (the h2's label reads it once). */}
            {[
              ["hidden md:block", ["THE", "BENEFITS", "OF", "BEING"]],
              ["hidden md:block", ["PART", "OF", "*INFINITY"]],
              ["block md:hidden", ["THE", "BENEFITS"]],
              ["block md:hidden", ["OF", "BEING", "PART"]],
              ["block md:hidden", ["OF", "*INFINITY"]],
            ].map(([shown, words], i) => (
              <span key={i} data-adv-line className={`${shown as string} [clip-path:inset(-25%_calc((1-var(--reveal,1))*110%-10%)_-25%_-10%)]`}>
                {(words as string[]).map((word, w) => (
                  <span key={w}>
                    {w > 0 && " "}
                    {word.startsWith("*") ? (
                      <span className="text-accent">
                        <Letters text={word.slice(1)} />
                      </span>
                    ) : (
                      <Letters text={word} />
                    )}
                  </span>
                ))}
              </span>
            ))}
          </h2>
        </div>

        {/* Above the type: the section's name and the visitor's place among the three (decorative: the list below says it). */}
        <div
          data-adv-bar
          aria-hidden="true"
          className="pointer-events-none invisible absolute inset-x-[max(var(--gutter),8vw)] top-[max(6.5rem,13vh)] hidden items-center gap-5 text-[0.75rem] font-medium tracking-[0.16em] text-[#f7f7f2] opacity-(--bar,0) in-data-[journey=on]:flex"
        >
          <span>THE INFINITY ADVANTAGE</span>
          <span className="relative h-px flex-1 bg-[#f7f7f2]/20">
            <span className="absolute inset-y-0 left-0 w-full origin-left scale-x-(--progress,0) bg-[#e9ae00]" />
          </span>
          <span className="tabular-nums">
            <span data-adv-count>01</span>
            <span className="text-[#f7f7f2]/55"> / 03</span>
          </span>
        </div>

        <BenefitOverlay />
        <FinalCall />
      </div>
    </section>
  );
}
