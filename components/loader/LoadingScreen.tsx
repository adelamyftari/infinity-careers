"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { signalIntroReveal } from "@/lib/intro/reveal-signal";
import { useIsHydrating } from "@/lib/hooks/use-is-hydrating";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { IntroTargets } from "./InfinityLogoScene";

// WebGL exists only in the browser: the scene is never server-rendered.
const InfinityLogoScene = dynamic(
  () => import("./InfinityLogoScene").then((module) => module.InfinityLogoScene),
  { ssr: false },
);

/** If WebGL never comes up, the page still opens. */
const SCENE_TIMEOUT = 1200;

/**
 * The intro wrapped around a page. The page marks what the intro hands over
 * to: `data-intro="logo"` on its header logo (where the 3D logo lands and
 * which it becomes) and `data-intro="reveal"` on the header content that
 * fades in as it travels. The page is server-rendered underneath from the
 * start, so swapping in the real homepage needs no change here. Plays once,
 * on the first document load only.
 */
export function LoadingScreen({ children }: { children: ReactNode }) {
  const hydrating = useIsHydrating();
  const [done, setDone] = useState(() => !hydrating);
  const reducedMotion = usePrefersReducedMotion();
  const sceneReady = useRef(false);
  const finished = useRef(false);

  const page = useRef<HTMLDivElement>(null);
  const logo = useRef<Element | null>(null);
  const reveal = useRef<Element[]>([]);
  const backdrop = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const targets = useMemo<IntroTargets>(() => ({ logo, reveal, backdrop, canvas }), []);

  // Under the backdrop, before anything is visible: the header waits for the logo.
  useLayoutEffect(() => {
    if (done || !page.current) return;
    logo.current = page.current.querySelector('[data-intro="logo"]');
    reveal.current = Array.from(page.current.querySelectorAll('[data-intro="reveal"]'));
    gsap.set(logo.current, { autoAlpha: 0 });
    gsap.set(reveal.current, { autoAlpha: 0, y: -8 });
    // Only on mount: the header is handed back once, at the end.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable callbacks: the scene builds its timeline once from these.
  const onReady = useCallback(() => {
    sceneReady.current = true;
  }, []);
  const onFinish = useCallback(() => {
    finished.current = true;
    setDone(true);
  }, []);
  // Without the 3D logo (reduced motion, or no WebGL): a short, simple reveal.
  const revealPage = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    signalIntroReveal();
    gsap
      .timeline({ onComplete: () => setDone(true) })
      .to([logo.current, ...reveal.current], { autoAlpha: 1, y: 0, duration: 0.3, ease: "power1.out" }, 0)
      .to(backdrop.current, { autoAlpha: 0, duration: 0.3, ease: "power1.out" }, 0);
  }, []);

  useEffect(() => {
    // No intro (e.g. arriving by client-side navigation): reveal at once.
    if (done) {
      signalIntroReveal();
      return;
    }
    if (reducedMotion) {
      revealPage();
      return;
    }
    const timer = window.setTimeout(() => {
      if (!sceneReady.current) revealPage();
    }, SCENE_TIMEOUT);
    return () => window.clearTimeout(timer);
  }, [done, reducedMotion, revealPage]);

  return (
    <>
      <div ref={page} className="flex flex-1 flex-col">
        {children}
      </div>

      {!done && (
        <div className="fixed inset-0 z-50">
          {/* Charcoal with soft atmospheric light; clears as the logo travels. */}
          <div
            ref={backdrop}
            className="absolute inset-0 bg-ink"
            style={{ backgroundImage: "radial-gradient(70% 60% at 40% 45%, rgb(255 255 255 / 0.035), transparent 70%)" }}
          />
          {!reducedMotion && (
            <div ref={canvas} className="absolute inset-0">
              <InfinityLogoScene targets={targets} onReady={onReady} onReveal={signalIntroReveal} onFinish={onFinish} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
