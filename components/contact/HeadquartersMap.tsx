"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { HEADQUARTERS_CONTACT } from "@/lib/site/contact";

/** OpenFreeMap's light vector style: free, no key, the same provider as the properties map. */
const STYLE = "https://tiles.openfreemap.org/styles/positron";
const ZOOM = 15.4;

type Status = "idle" | "loading" | "ready" | "failed";

/**
 * The headquarters on a real map: the Air Albania Stadium building on Rruga Dervish Hima, which
 * houses Arena Center (the point and its source are in lib/site/contact.ts). It loads as it nears
 * the screen. A page scroll, or one finger on a phone, scrolls the page: the map takes Ctrl/⌘ +
 * scroll and two fingers (cooperative gestures), so it never traps the visitor. If WebGL or the
 * map's tiles are unavailable, it says so, and the address and the maps link beside it remain.
 */
export function HeadquartersMap() {
  const frame = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [pin, setPin] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let map: MapLibreMap | null = null;
    let cancelled = false;

    const start = async () => {
      setStatus("loading");
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled) return;
        // MapLibre 6 looks for its worker next to its own module, which bundling moves: as on the properties map.
        maplibre.setWorkerUrl(new URL("../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
        const { lat, lng } = HEADQUARTERS_CONTACT.position;
        map = new maplibre.Map({
          container: el,
          style: STYLE,
          center: [lng, lat],
          zoom: ZOOM,
          minZoom: 11,
          maxZoom: 18,
          // Explorable, never in the way of the page; it does not tilt or turn.
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: { compact: true },
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");
        const marker = document.createElement("div");
        new maplibre.Marker({ element: marker, anchor: "bottom" }).setLngLat([lng, lat]).addTo(map);
        setPin(marker);
        map.once("load", () => !cancelled && setStatus("ready"));
        map.on("error", (event) => {
          // A missing tile is not a failure of the map; a style that cannot load is.
          if (!map?.isStyleLoaded() && !cancelled && /style/i.test(String(event.error?.message ?? ""))) setStatus("failed");
        });
      } catch {
        if (!cancelled) setStatus("failed");
      }
    };

    const watcher = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        watcher.disconnect();
        void start();
      },
      { rootMargin: "400px 0px" },
    );
    watcher.observe(el);
    return () => {
      cancelled = true;
      watcher.disconnect();
      map?.remove();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[10px] bg-[#e9ebe4] ring-1 ring-primary/15">
      {/* Sized by height and width, not `absolute inset-0`: MapLibre makes its container `position: relative`. */}
      <div ref={frame} role="region" aria-label={`Map: ${HEADQUARTERS_CONTACT.organization}, ${HEADQUARTERS_CONTACT.street}, ${HEADQUARTERS_CONTACT.city}`} className="h-full w-full" />
      {status === "failed" && (
        <p role="status" className="absolute inset-0 flex items-center justify-center p-6 text-center text-small text-muted">
          The map could not be loaded here. The address and the link to open it in your maps app are beside it.
        </p>
      )}
      {status !== "ready" && status !== "failed" && <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-primary/[0.04]" />}
      {pin &&
        createPortal(
          <span className="relative flex flex-col items-center" aria-hidden="true">
            <span className="mb-1.5 whitespace-nowrap rounded-full bg-petrol px-3 py-1 text-label font-semibold tracking-[0.12em] text-neutral shadow-[0_10px_22px_-10px_rgb(16_47_50/0.7)]">INFINITY HEADQUARTERS</span>
            <span className="flex size-11 items-center justify-center rounded-full bg-petrol shadow-[0_10px_22px_-8px_rgb(16_47_50/0.75)] ring-2 ring-accent">
              <InfinityMark className="size-5" />
            </span>
            <span className="-mt-1 size-2.5 rotate-45 bg-petrol" />
          </span>,
          pin,
        )}
    </div>
  );
}
