"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import {
  ALBANIA_BOUNDARY_URL,
  applyInfinityStyle,
  boundaryBounds,
  fitCityLabels,
  OPENFREEMAP_STYLE,
  outlinePath,
  type Boundary,
} from "@/lib/maps/infinity-map-style";
import { CITY_POINTS, type Property } from "@/lib/properties/properties";
import { ClusterMarker, PropertyMarker, type ClusterMember } from "./PropertyMarker";

/** Markers of one city whose centres are closer than this (px) share one cluster. */
const CLUSTER_DISTANCE = 36;
/** How far in the map may go (zoom), and how much room around the whole-country view it may pan (share of it). */
const MAX_ZOOM = 13;
const PAN_ROOM = 0.12;

type Failure = "webgl" | "network";
type Status = "idle" | "loading" | "ready" | Failure;
type LatLng = { lat: number; lng: number };
/** Where a location is drawn: its verified coordinates, or its city's point (city-level). */
type Placed = { id: string; position: LatLng; exact: boolean };
/** Locations drawn as one marker, and whether each stands on verified coordinates. */
type Group = { ids: string[]; exact: Record<string, boolean>; position: LatLng };
/** A MapLibre marker whose element hosts one React-rendered marker. */
type Pin = { key: string; element: HTMLDivElement; marker: MapLibreMarker; group: Group; x: number };

type MapProps = {
  locations: Property[];
  selectedId: string;
  /** A location shown without being chosen (its card is under the pointer), or null. */
  previewId?: string | null;
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
  const edge = Math.round(Math.min(width, height) * 0.05);
  const attribution = width < 520 ? 52 : 34;
  return { top: edge + 8, bottom: edge + attribution, left: edge, right: edge };
}

/**
 * Albania as a real map: OpenFreeMap (MapLibre GL) in a natural, slightly
 * desaturated palette, cut to the country's real geoBoundaries outline with a
 * fine gold rim. It can be zoomed (Ctrl + scroll, pinch or the buttons) and
 * panned around the country. The eight Infinity locations sit on verified
 * coordinates where they exist, otherwise on their city's own point from the
 * map data (marked as city-level); those close together share a cluster that
 * fans out into each one.
 */
export function AlbaniaPropertyMap({ locations, selectedId, previewId = null, onSelect }: MapProps) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const rim = useRef<SVGPathElement>(null);
  const shadow = useRef<SVGPathElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  /** The live markers, by group key (rendered into via portals). */
  const registry = useRef(new Map<string, Pin>());
  /** Where each location is drawn, once the map's data has placed the city-level ones. */
  const placedRef = useRef(new Map<string, Placed>());
  const [status, setStatus] = useState<Status>("idle");
  const [pins, setPins] = useState<Pin[]>([]);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let cancelled = false;
    const markers = registry.current;
    const placed = placedRef.current;

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
        maxZoom: MAX_ZOOM,
        // Explorable, but never in the way of the page: scrolling over it scrolls the page
        // (Ctrl + scroll, or two fingers, zooms), and it never tilts or turns.
        cooperativeGestures: true,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        boxZoom: false,
        renderWorldCopies: false,
        attributionControl: {
          compact: true,
          customAttribution: '<a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries</a>',
        },
      });
      instance.touchZoomRotate.disableRotation();
      instance.addControl(new maplibre.NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");
      // The dark style names a few icons its sprite doesn't include.
      instance.setMissingStyleImageResolver((name) => {
        if (!instance.hasImage(name)) instance.addImage(name, { width: 1, height: 1, data: new Uint8Array(4) });
      });
      map.current = instance;

      // Verified coordinates where they exist; otherwise the city's own point, at city level.
      for (const location of locations) {
        const city = CITY_POINTS[location.city];
        if (location.position) placed.set(location.id, { id: location.id, position: location.position, exact: true });
        else if (city) placed.set(location.id, { id: location.id, position: city, exact: false });
      }

      // The whole country framed, then panning kept to a little around that view (never so tight
      // that the map would have to zoom in to stay inside it).
      const frameCountry = () => {
        instance.setMaxBounds(null);
        instance.fitBounds(bounds, { padding: framing(instance.getContainer()), duration: 0 });
        const view = instance.getBounds();
        const dx = (view.getEast() - view.getWest()) * PAN_ROOM;
        const dy = (view.getNorth() - view.getSouth()) * PAN_ROOM;
        instance.setMinZoom(instance.getZoom() - 0.05);
        instance.setMaxBounds([
          [view.getWest() - dx, view.getSouth() - dy],
          [view.getEast() + dx, view.getNorth() + dy],
        ]);
      };

      // Group markers that would overlap at this scale; one MapLibre marker
      // per group, created and removed as groups change.
      const regroup = () => {
        const cityOf = new Map(locations.map((location) => [location.id, location.city]));
        const points = [...placed.values()].map((point) => ({ ...point, city: cityOf.get(point.id), pixel: instance.project(point.position) }));
        const next = new Map<string, Pin>();
        const taken = new Set<string>();
        for (const point of points) {
          if (taken.has(point.id)) continue;
          const members = points.filter(
            // Only within one city: a cluster is a city's locations, never two cities run together.
            (other) => !taken.has(other.id) && other.city === point.city && Math.hypot(other.pixel.x - point.pixel.x, other.pixel.y - point.pixel.y) < CLUSTER_DISTANCE,
          );
          members.forEach((member) => taken.add(member.id));
          // In the order of the locations list, so a cluster's members keep the page's order.
          const ids = locations.map((location) => location.id).filter((id) => members.some((member) => member.id === id));
          const group: Group = {
            ids,
            exact: Object.fromEntries(members.map((member) => [member.id, member.exact])),
            position: {
              lat: members.reduce((sum, member) => sum + member.position.lat, 0) / members.length,
              lng: members.reduce((sum, member) => sum + member.position.lng, 0) / members.length,
            },
          };
          const key = ids.join("+");
          let pin = markers.get(key);
          if (!pin) {
            // A zero-size anchor exactly on the coordinate; the marker centres on it.
            const element = document.createElement("div");
            element.style.width = "0";
            element.style.height = "0";
            const marker = new maplibre.Marker({ element, anchor: "center" }).setLngLat(group.position).addTo(instance);
            pin = { key, element, marker, group, x: 0 };
          }
          pin.marker.setLngLat(group.position);
          pin.group = group;
          pin.x = instance.project(group.position).x;
          next.set(key, pin);
        }
        for (const [key, pin] of markers) {
          if (next.has(key)) continue;
          pin.marker.remove();
          markers.delete(key);
        }
        for (const [key, pin] of next) markers.set(key, pin);
        setPins([...next.values()]);
        setWidth(instance.getContainer().clientWidth);
      };

      // Cut the rendered map to the country, and lay the rim and shadow along the same outline;
      // redrawn as the map moves, straight onto the elements (no re-render per frame).
      const trace = () => {
        const path = outlinePath(instance, boundary);
        instance.getCanvas().style.clipPath = `path("${path}")`;
        rim.current?.setAttribute("d", path);
        shadow.current?.setAttribute("d", path);
      };

      let loaded = false;
      instance.on("load", () => {
        loaded = true;
        applyInfinityStyle(instance, boundary);
        // Never further out than the whole country.
        frameCountry();
        trace();
        regroup();
        setStatus("ready");
      });
      instance.on("move", trace);
      instance.on("zoomend", regroup);
      instance.on("moveend", () => {
        for (const pin of markers.values()) pin.x = instance.project(pin.group.position).x;
      });
      // Keep the whole country framed as the column resizes.
      instance.on("resize", () => {
        frameCountry();
        fitCityLabels(instance);
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
      placed.clear();
      map.current?.remove();
      map.current = null;
    };
  }, [locations]);

  // The selected marker sits above its neighbours; if it is out of view (after a zoom), the
  // map glides to it, gently, without changing the zoom.
  useLayoutEffect(() => {
    for (const pin of registry.current.values()) pin.element.style.zIndex = pin.group.ids.includes(selectedId) ? "3" : "1";
    const instance = map.current;
    const point = placedRef.current.get(selectedId);
    if (!instance || !point || status !== "ready") return;
    if (!instance.getBounds().contains(point.position)) {
      instance.easeTo({ center: point.position, duration: 900, essential: false });
    }
  }, [pins, selectedId, status]);

  const byId = new Map(locations.map((location) => [location.id, location]));
  const failed = status === "webgl" || status === "network";

  return (
    <div ref={frame} data-map className="relative h-full w-full">
      {/* The silhouette rises into view once the map is ready. */}
      <div
        className={`relative h-full w-full transition-[opacity,clip-path,translate] duration-1000 ease-premium ${
          status === "ready" ? "translate-y-0 opacity-100 [clip-path:inset(0%_0%_0%_0%)]" : "translate-y-3 opacity-0 [clip-path:inset(100%_0%_0%_0%)]"
        }`}
      >
        {/* Behind the clipped map: a soft shadow, and a fine gold rim exactly on the border. */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <path ref={shadow} className="translate-y-[8px] fill-black/[0.28] blur-[10px]" />
          <path ref={rim} fill="none" strokeLinejoin="round" className="stroke-accent [stroke-width:1.6]" />
        </svg>
        {/* Sized by h-full, not insets: MapLibre makes its container position: relative. */}
        <div ref={canvas} role="region" aria-label="Map of Albania showing Infinity's locations" className="h-full w-full" />
      </div>

      {(status === "idle" || status === "loading") && (
        <div className="absolute inset-0 flex items-center justify-center text-small text-neutral/60">
          <span className="mr-3 size-1.5 rounded-full bg-accent motion-safe:animate-pulse" />
          Loading map
        </div>
      )}

      {failed && <MapUnavailable reason={status} locations={locations} selectedId={selectedId} onSelect={onSelect} />}

      {pins.map((pin, i) => {
        const delay = 450 + i * 110;
        if (pin.group.ids.length === 1) {
          const location = byId.get(pin.group.ids[0]);
          if (!location) return null;
          return createPortal(
            <PropertyMarker
              name={location.name}
              city={location.city}
              category={location.category}
              approximate={!pin.group.exact[location.id]}
              selected={location.id === selectedId}
              previewed={location.id === previewId}
              onSelect={() => onSelect(location.id)}
              delay={delay}
            />,
            pin.element,
            pin.key,
          );
        }
        const members: ClusterMember[] = pin.group.ids.flatMap((id) => {
          const location = byId.get(id);
          return location ? [{ id, name: location.name, category: location.category, approximate: !pin.group.exact[id] }] : [];
        });
        return createPortal(
          <ClusterMarker
            members={members}
            city={byId.get(pin.group.ids[0])?.city ?? ""}
            selectedId={selectedId}
            previewId={previewId}
            onSelect={onSelect}
            delay={delay}
            side={width && pin.x > width * 0.62 ? "left" : "right"}
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

/** In place of the map when it cannot run: says why, and keeps every location selectable. */
function MapUnavailable({
  reason,
  locations,
  selectedId,
  onSelect,
}: {
  reason: Failure;
  locations: Property[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div role="status" className="absolute inset-0 flex flex-col justify-center gap-6 p-[clamp(1.25rem,3vw,2.25rem)]">
      <div className="max-w-md">
        <p className="flex items-center gap-2 text-small font-medium text-neutral">
          <span className="size-1.5 rounded-full bg-accent" />
          Map unavailable
        </p>
        <p className="mt-3 text-body text-neutral/70">{FAILURE_COPY[reason]}</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {locations.map((location) => (
          <li key={location.id}>
            <button
              type="button"
              aria-pressed={location.id === selectedId}
              onClick={() => onSelect(location.id)}
              className="cursor-pointer rounded-full px-3.5 py-2 text-small text-neutral/70 ring-1 ring-neutral/20 transition-colors hover:text-neutral aria-pressed:bg-accent aria-pressed:text-primary aria-pressed:ring-accent"
            >
              {location.city} · {location.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
