"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { markIntroSeen } from "@/lib/intro/config";
import { signalIntroReveal } from "@/lib/intro/reveal-signal";
import { useIsHydrating } from "@/lib/hooks/use-is-hydrating";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { IntroTargets } from "./InfinityLogoScene";
import { addKineticType, fitType, KineticType, PETROL, LOGO_AT, LOGO_GATE_AT, SCENE_AT, SCENE_COLOR } from "./KineticType";

// WebGL exists only in the browser: the scene is never server-rendered.
const InfinityLogoScene = dynamic(
  () => import("./InfinityLogoScene").then((module) => module.InfinityLogoScene),
  { ssr: false },
);

/** How long the first scene waits for the logo to warm up behind it. */
const START_WAIT = 1000;
/** If the logo still isn't there when the type needs it, the page opens without it. */
const LOGO_WAIT = 500;
/** Whatever goes wrong, the page is never held longer than this. */
const SAFETY_LIMIT = 9000;

const SCROLL_KEYS = new Set([" ", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);

const subscribeNever = () => () => {};
/** Set before the first paint by the script in the root layout (lib/intro/config). */
const readIntroSeen = () => document.documentElement.dataset.introSeen !== undefined;

/** Holds the page at the top without changing its width, so nothing shifts when it is released. */
function holdScroll() {
  const stop = (event: Event) => event.preventDefault();
  const stopKey = (event: KeyboardEvent) => {
    if (SCROLL_KEYS.has(event.key)) event.preventDefault();
  };
  const toTop = () => window.scrollTo(0, 0);
  const restoration = history.scrollRestoration;
  history.scrollRestoration = "manual";
  toTop();
  window.addEventListener("wheel", stop, { passive: false });
  window.addEventListener("touchmove", stop, { passive: false });
  window.addEventListener("keydown", stopKey);
  window.addEventListener("scroll", toTop);
  return () => {
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchmove", stop);
    window.removeEventListener("keydown", stopKey);
    window.removeEventListener("scroll", toTop);
    history.scrollRestoration = restoration;
  };
}

/**
 * The intro wrapped around a page, on one master timeline: five kinetic type
 * scenes, then the 3D logo assembling, then its flight into the header as the
 * petrol field wipes away to reveal the hero. The page marks what the intro
 * hands over to: `data-intro="logo"` on its header logo and `data-intro="reveal"`
 * on the header content. It is server-rendered underneath from the start, so
 * it is ready before the overlay leaves. Plays once per session (lib/intro/config).
 */
export function LoadingScreen({ children }: { children: ReactNode }) {
  const hydrating = useIsHydrating();
  const [finishedPlaying, setDone] = useState(() => !hydrating);
  const seen = useSyncExternalStore(subscribeNever, readIntroSeen, () => false);
  const done = finishedPlaying || seen;
  const reducedMotion = usePrefersReducedMotion();
  const finished = useRef(false);

  const page = useRef<HTMLDivElement>(null);
  const logo = useRef<Element | null>(null);
  const reveal = useRef<Element[]>([]);
  const backdrop = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const type = useRef<HTMLDivElement>(null);
  const targets = useMemo<IntroTargets>(() => ({ logo, reveal, backdrop, canvas }), []);

  const master = useRef<gsap.core.Timeline | null>(null);
  const logoTimeline = useRef<gsap.core.Timeline | null>(null);
  const logoAttached = useRef(false);
  const onLogoAvailable = useRef<(() => void) | null>(null);

  const finish = useCallback(() => {
    finished.current = true;
    // Hand the header back exactly as it was: GSAP's y:0 leaves `transform: translate(0px, 0px)`,
    // and any transform makes an element the containing block of its fixed descendants (the
    // full-screen menu would open inside the 44px button wrapper, invisible).
    gsap.set([logo.current, ...reveal.current].filter(Boolean), { clearProps: "transform,translate,rotate,scale" });
    markIntroSeen();
    document.documentElement.style.removeProperty("scrollbar-color");
    setDone(true);
  }, []);

  // Without the 3D logo (reduced motion, no WebGL, or a failure): a short, simple reveal.
  const revealPage = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    master.current?.kill();
    signalIntroReveal();
    gsap
      .timeline({
        onComplete: () => {
          finished.current = false;
          finish();
        },
      })
      .to([logo.current, ...reveal.current], { autoAlpha: 1, y: 0, duration: 0.3, ease: "power1.out" }, 0)
      .to([backdrop.current, type.current, canvas.current], { autoAlpha: 0, duration: 0.3, ease: "power1.out" }, 0);
  }, [finish]);

  // The scene hands over its timeline when it is ready; a strict-mode remount hands over a new one.
  const onSceneTimeline = useCallback((timeline: gsap.core.Timeline) => {
    logoTimeline.current = timeline;
    if (logoAttached.current && master.current) master.current.add(timeline.paused(false), LOGO_AT);
    onLogoAvailable.current?.();
  }, []);

  // Before anything is visible: the header waits for the logo; a visitor who has seen the intro goes straight in.
  useLayoutEffect(() => {
    if (done || !page.current || readIntroSeen()) return;
    logo.current = page.current.querySelector('[data-intro="logo"]');
    reveal.current = Array.from(page.current.querySelectorAll('[data-intro="reveal"]'));
    gsap.set(logo.current, { autoAlpha: 0 });
    gsap.set(reveal.current, { autoAlpha: 0, y: -8 });
    // Only on mount: the header is handed back once, at the end.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // No intro (e.g. arriving by client-side navigation): reveal at once.
    if (done) {
      signalIntroReveal();
      return;
    }
    if (readIntroSeen()) return;
    if (reducedMotion) {
      revealPage();
      return;
    }
    const root = type.current;
    if (!root) return;

    const releaseScroll = holdScroll();
    const html = document.documentElement;
    const safety = window.setTimeout(revealPage, SAFETY_LIMIT);
    let logoWait = 0;

    const timeline = gsap.timeline({ paused: true });
    master.current = timeline;
    addKineticType(timeline, root);
    SCENE_AT.forEach((at, i) => {
      timeline.call(() => html.style.setProperty("scrollbar-color", `${SCENE_COLOR[i]} ${SCENE_COLOR[i]}`), [], at);
    });

    const attachLogo = () => {
      if (logoAttached.current || !logoTimeline.current) return false;
      logoAttached.current = true;
      timeline.add(logoTimeline.current.paused(false), LOGO_AT);
      return true;
    };
    // The Dark Petrol Green field under the logo.
    timeline.call(() => html.style.setProperty("scrollbar-color", `${PETROL} ${PETROL}`), [], LOGO_AT);
    timeline.addPause(LOGO_GATE_AT, () => {
      if (logoAttached.current || attachLogo()) {
        timeline.play();
        return;
      }
      onLogoAvailable.current = () => {
        window.clearTimeout(logoWait);
        attachLogo();
        timeline.play();
      };
      logoWait = window.setTimeout(revealPage, LOGO_WAIT);
    });

    // Starts once the type's font and the logo are ready, so neither can stutter the opening.
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      // The face is in (or its wait is over): no line may run past the screen.
      fitType(root);
      attachLogo();
      timeline.play();
    };
    const startWait = window.setTimeout(start, START_WAIT);
    const fonts = document.fonts.load("900 1em Inter Tight").catch(() => undefined);
    onLogoAvailable.current = () => {
      void fonts.then(() => requestAnimationFrame(() => requestAnimationFrame(start)));
    };
    if (logoTimeline.current) onLogoAvailable.current();

    return () => {
      window.clearTimeout(safety);
      window.clearTimeout(startWait);
      window.clearTimeout(logoWait);
      onLogoAvailable.current = null;
      logoAttached.current = false;
      started = true;
      timeline.kill();
      master.current = null;
      releaseScroll();
    };
  }, [done, reducedMotion, revealPage]);

  return (
    <>
      <div ref={page} inert={!done} className="flex flex-1 flex-col">
        {children}
      </div>

      {!done && (
        // Isolated above the page, full height in every mobile toolbar state. Its solid field is the
        // backdrop below, there from the first frame; the overlay itself paints nothing, so that
        // the backdrop's final wipe uncovers the hero.
        <div data-intro-overlay aria-hidden="true" className="fixed inset-0 isolate z-50 h-screen h-dvh w-full overflow-hidden">
          {/* Without JavaScript nothing could clear the overlay, so it never shows. */}
          <noscript>
            <style>{"[data-intro-overlay]{display:none}"}</style>
          </noscript>
          {/* The solid Dark Forest Teal field: under every scene, then the logo's. It wipes upward at the end, onto the hero. */}
          <div ref={backdrop} className="absolute inset-0" style={{ backgroundColor: PETROL }} />
          {!reducedMotion && (
            <div ref={canvas} className="absolute inset-0">
              <InfinityLogoScene targets={targets} onTimeline={onSceneTimeline} onReveal={signalIntroReveal} onFinish={finish} />
            </div>
          )}
          {!reducedMotion && <KineticType root={type} />}
        </div>
      )}
    </>
  );
}
