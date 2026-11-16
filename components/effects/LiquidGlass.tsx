"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { LiquidGlass as Engine } from "@/lib/liquid-glass/engine";

const ACTIVE = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/**
 * The liquid that follows the mouse. Two fixed layers that never take a click:
 * one behind the page's content, one in front of it (over the header, under
 * the intro). Three.js only loads on the first mouse movement, and touch
 * devices and reduced motion never reach it.
 */
export function LiquidGlass() {
  const behind = useRef<HTMLCanvasElement>(null);
  const inFront = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const back = behind.current;
    const front = inFront.current;
    if (!back || !front) return;
    const media = gsap.matchMedia();

    media.add(ACTIVE, () => {
      // Empty until the first movement. In place from the start, because a layer
      // appearing later would change how the browser smooths the text beneath it.
      back.hidden = false;
      front.hidden = false;
      let engine: Engine | null = null;
      let loading = false;
      let alive = true;
      let latest: { x: number; y: number } | null = null;

      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        latest = { x: event.clientX, y: event.clientY };
        if (engine) {
          engine.moveTo(latest.x, latest.y);
          return;
        }
        if (loading) return;
        loading = true;
        void import("@/lib/liquid-glass/engine").then(({ createLiquidGlass }) => {
          if (!alive) return;
          engine = createLiquidGlass(back, front);
          if (!engine) {
            back.hidden = true;
            front.hidden = true;
            window.removeEventListener("pointermove", onMove);
            return;
          }
          if (latest) engine.moveTo(latest.x, latest.y);
        });
      };
      const onLeave = () => engine?.release();

      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);

      return () => {
        alive = false;
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        engine?.destroy();
        back.hidden = true;
        front.hidden = true;
      };
    });

    return () => media.revert();
  }, []);

  return (
    <>
      <canvas ref={behind} hidden aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
      <canvas ref={inFront} hidden aria-hidden="true" className="pointer-events-none fixed inset-0 z-45 h-full w-full" />
    </>
  );
}
