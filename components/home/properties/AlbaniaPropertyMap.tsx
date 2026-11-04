"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import {
  ALBANIA_BOUNDARY_URL,
  applyInfinityStyle,
  boundaryBounds,
  OPENFREEMAP_STYLE,
  outlinePath,
  type Boundary,
} from "@/lib/maps/infinity-map-style";
import type { Property } from "@/lib/properties/properties";
import { ClusterMarker, PropertyMarker } from "./PropertyMarker";

/** Markers whose centres are closer than this (px) share one cluster coin. */
const CLUSTER_DISTANCE = 34;

type Failure = "webgl" | "network";
type Status = "idle" | "loading" | "ready" | Failure;
type LatLng = { lat: number; lng: number };
type Group = { ids: string[]; position: LatLng };
/** A MapLibre marker whose element hosts one React-rendered marker. */
type Pin = { key: string; element: HTMLDivElement; marker: MapLibreMarker; group: Group };

type MapProps = {
  properties: Property[];
  selectedId: string;
  onSelect: (id: string) => void;
};

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Room around the silhouette, scaled to the space it has, with a band kept
 * clear at the bottom for the attribution (which must stay visible).
 */
function framing(el: HTMLElement) {
  const { width, height } = el.getBoundingClientRect();
  const edge = Math.round(Math.min(width, height) * 0.06);
  const attribution = width < 520 ? 52 : 34;
  return { top: edge + 8, bottom: edge + attribution, left: edge, right: edge };
}

/**
 * Albania alone: OpenFreeMap (MapLibre GL) cut to the country's real
 * geoBoundaries outline, standing on the page with a gold rim and a soft
 * shadow. The camera stays on the whole country; markers sit on verified
 * coordinates, and Tirana's close neighbours share a coin that opens a menu.
 */
export function AlbaniaPropertyMap({ properties, selectedId, onSelect }: MapProps) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  /** The live markers, by group key (rendered into via portals). */
  const registry = useRef(new Map<string, Pin>());
  const [status, setStatus] = useState<Status>("idle");
  const [pins, setPins] = useState<Pin[]>([]);
  /** Albania's outline in the map's pixels (SVG path), for the rim and shadow. */
  const [outline, setOutline] = useState("");

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let cancelled = false;
    const markers = registry.current;
    const located = properties.filter((property) => property.position);

    const start = async () => {
      setStatus("loading");
      if (!webglAvailable()) {
        setStatus("webgl");
        return;
      }
      let boundary: Boundary;
      const [maplibre, response] = await Promise.all([import("maplibre-gl"), fetch(ALBANIA_BOUNDARY_URL).catch(() => null)]);
      if (!response?.ok) {
        if (!cancelled) setStatus("network");
        return;
      }
      try {
        boundary = (await response.json()) as Boundary;
      } catch {
        if (!cancelled) setStatus("network");
        return;
      }
      if (cancelled || !canvas.current) return;
      // MapLibre 6 looks for its worker next to its own module, which bundling
      // moves; point it at the worker file, emitted by the bundler as an asset.
      maplibre.setWorkerUrl(new URL("../../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

      const bounds = boundaryBounds(boundary);
      const instance = new maplibre.Map({
        container: canvas.current,
        style: OPENFREEMAP_STYLE,
        bounds,
        fitBoundsOptions: { padding: framing(canvas.current) },
        // A composed view of the whole country, not a map to wander.
        interactive: false,
        renderWorldCopies: false,
        attributionControl: {
          compact: true,
          customAttribution: '<a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries</a>',
        },
      });
      // The dark style names a few icons its sprite doesn't include.
      instance.setMissingStyleImageResolver((name) => {
        if (!instance.hasImage(name)) instance.addImage(name, { width: 1, height: 1, data: new Uint8Array(4) });
      });
      map.current = instance;

      // Group markers that would overlap at this scale; one MapLibre marker
      // per group, created and removed as groups change.
      const regroup = () => {
        const points = located.flatMap((property) =>
          property.position ? [{ id: property.id, position: property.position, pixel: instance.project(property.position) }] : [],
        );
        const next = new Map<string, Pin>();
        const taken = new Set<string>();
        for (const point of points) {
          if (taken.has(point.id)) continue;
          const members = points.filter(
            (other) => !taken.has(other.id) && Math.hypot(other.pixel.x - point.pixel.x, other.pixel.y - point.pixel.y) < CLUSTER_DISTANCE,
          );
          members.forEach((member) => taken.add(member.id));
          const group: Group = {
            ids: members.map((member) => member.id),
            position: {
              lat: members.reduce((sum, member) => sum + member.position.lat, 0) / members.length,
              lng: members.reduce((sum, member) => sum + member.position.lng, 0) / members.length,
            },
          };
          const key = group.ids.join("+");
          let pin = markers.get(key);
          if (!pin) {
            // A zero-size anchor exactly on the coordinate; the coin centres on it.
            const element = document.createElement("div");
            element.style.width = "0";
            element.style.height = "0";
            const marker = new maplibre.Marker({ element, anchor: "center" }).setLngLat(group.position).addTo(instance);
            pin = { key, element, marker, group };
          }
          pin.marker.setLngLat(group.position);
          pin.group = group;
          next.set(key, pin);
        }
        for (const [key, pin] of markers) {
          if (next.has(key)) continue;
          pin.marker.remove();
          markers.delete(key);
        }
        for (const [key, pin] of next) markers.set(key, pin);
        setPins([...next.values()]);
      };

      // Cut the rendered map to the country: the canvas is clipped to the
      // projected outline, so the section's dotted background shows all
      // around it, right up to the border.
      const trace = () => {
        const path = outlinePath(instance, boundary);
        instance.getCanvas().style.clipPath = `path("${path}")`;
        setOutline(path);
      };

      let loaded = false;
      instance.on("load", () => {
        loaded = true;
        applyInfinityStyle(instance, boundary);
        trace();
        regroup();
        setStatus("ready");
      });
      // Keep the whole country framed as the column resizes.
      instance.on("resize", () => {
        instance.fitBounds(bounds, { padding: framing(instance.getContainer()), duration: 0 });
        trace();
        regroup();
      });
      instance.on("error", () => {
        if (!loaded) setStatus("network");
      });
    };

    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        watcher.disconnect();
        void start();
      },
      { rootMargin: "800px 0px" },
    );
    watcher.observe(el);

    return () => {
      cancelled = true;
      watcher.disconnect();
      markers.clear();
      map.current?.remove();
      map.current = null;
    };
  }, [properties]);

  // The selected marker sits above its neighbours.
  useLayoutEffect(() => {
    for (const pin of registry.current.values()) pin.element.style.zIndex = pin.group.ids.includes(selectedId) ? "3" : "1";
  }, [pins, selectedId]);

  const byId = new Map(properties.map((property) => [property.id, property]));
  const failed = status === "webgl" || status === "network";

  return (
    <div ref={frame} data-map className="relative h-full w-full">
      {/* The silhouette rises into view once the map is ready. */}
      <div
        className={`relative h-full w-full transition-[opacity,clip-path,translate] duration-1000 ease-premium ${
          status === "ready" ? "translate-y-0 opacity-100 [clip-path:inset(0%_0%_0%_0%)]" : "translate-y-3 opacity-0 [clip-path:inset(100%_0%_0%_0%)]"
        }`}
      >
        {/*
          Behind the clipped map: a soft shadow, and the gold rim, whose inner
          half the map covers, leaving a fine line exactly on the border.
        */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <path d={outline} className="translate-y-[8px] fill-black/[0.14] blur-[9px]" />
          <path d={outline} fill="none" strokeLinejoin="round" className="stroke-signature [stroke-width:2.4]" />
        </svg>
        {/* Sized by h-full, not insets: MapLibre makes its container position: relative. */}
        <div ref={canvas} role="region" aria-label="Map of Albania showing Infinity properties" className="h-full w-full" />
      </div>

      {(status === "idle" || status === "loading") && (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/45">
          <span className="mr-3 size-1.5 rounded-full bg-signature motion-safe:animate-pulse" />
          Loading map
        </div>
      )}

      {failed && <MapUnavailable reason={status} properties={properties} selectedId={selectedId} onSelect={onSelect} />}

      {pins.map((pin, i) => {
        const delay = 450 + i * 110;
        if (pin.group.ids.length === 1) {
          const property = byId.get(pin.group.ids[0]);
          if (!property) return null;
          return createPortal(
            <PropertyMarker
              name={property.name}
              city={property.city}
              category={property.category}
              selected={property.id === selectedId}
              onSelect={() => onSelect(property.id)}
              delay={delay}
            />,
            pin.element,
            pin.key,
          );
        }
        const members = pin.group.ids.flatMap((id) => byId.get(id) ?? []);
        return createPortal(
          <ClusterMarker
            members={members.map(({ id, name }) => ({ id, name }))}
            city={members[0]?.city ?? ""}
            selectedId={selectedId}
            onSelect={onSelect}
            delay={delay}
          />,
          pin.element,
          pin.key,
        );
      })}
    </div>
  );
}

const FAILURE_COPY: Record<Failure, string> = {
  webgl: "This browser can't display the interactive map (WebGL is unavailable). You can still explore each destination.",
  network: "The map couldn't load. You can still explore each destination.",
};

/** In place of the map when it cannot run: says why, and keeps every destination selectable. */
function MapUnavailable({
  reason,
  properties,
  selectedId,
  onSelect,
}: {
  reason: Failure;
  properties: Property[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div role="status" className="absolute inset-0 flex flex-col justify-center gap-6 p-[clamp(1.25rem,3vw,2.25rem)]">
      <div className="max-w-md">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
          <span className="size-1.5 rounded-full bg-signature" />
          Map unavailable
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-foreground/70">{FAILURE_COPY[reason]}</p>
      </div>
      {/* On phones the index under the panel already lists every destination. */}
      <ul className="hidden flex-wrap gap-2 sm:flex">
        {properties.map((property) => (
          <li key={property.id}>
            <button
              type="button"
              aria-pressed={property.id === selectedId}
              onClick={() => onSelect(property.id)}
              className="cursor-pointer rounded-full px-3.5 py-2 text-[13px] text-foreground/70 ring-1 ring-ink/15 transition-colors hover:text-foreground aria-pressed:bg-signature aria-pressed:text-ink aria-pressed:ring-signature"
            >
              {property.city} · {property.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
