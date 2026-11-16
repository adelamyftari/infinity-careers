"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { PROPERTY_CATEGORY_LABEL, type PropertyCategory } from "@/lib/properties/properties";

/** A spring-like ease for the markers' own movement (a touch of overshoot, then settled). */
const SPRING = "ease-[cubic-bezier(0.34,1.56,0.64,1)]";

/**
 * The marker: the official Infinity symbol, in its yellow, on a small dark teal glass disc
 * with a fine rim and a soft shadow. The headquarters stands on a rounded square (an
 * administrative location, not a property); a location placed at city level has a dashed
 * rim, so it never reads as an exact address.
 */
function Disc({ category, approximate, active }: { category: PropertyCategory; approximate: boolean; active: boolean }) {
  const shape = category === "administration" ? "rounded-[10px]" : "rounded-full";
  return (
    <span
      className={`relative flex size-[34px] items-center justify-center ${shape} bg-petrol/85 shadow-[inset_0_1px_0_rgb(247_247_242/0.18),0_8px_18px_-6px_rgb(0_0_0/0.7)] backdrop-blur-sm transition-[box-shadow] duration-300 ${
        active ? "ring-2 ring-accent" : approximate ? "outline-1 outline-dashed outline-accent/70 -outline-offset-1" : "ring-1 ring-accent/55"
      }`}
    >
      <InfinityMark className="size-[16px]" />
    </span>
  );
}

/** The selected marker's circle: drawn in once, then still (no constant pulsing). */
function Highlight({ on, square }: { on: boolean; square: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 top-1/2 size-[58px] -translate-x-1/2 -translate-y-1/2 ${square ? "rounded-[16px]" : "rounded-full"} bg-accent/[0.14] ring-1 ring-accent/45 transition-[opacity,scale] duration-500 ${SPRING} ${
        on ? "scale-100 opacity-100" : "scale-50 opacity-0"
      }`}
    />
  );
}

/** The hover ring: a fine outer ring, only while the pointer or focus is on the marker. */
const hoverRing =
  "pointer-events-none absolute left-1/2 top-1/2 size-[46px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 ring-1 ring-neutral/70 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100";

/** The floating name: on hover and focus, and kept on the selected marker. */
function Label({ text, shown, note }: { text: string; shown: boolean; note?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-[30px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-petrol/90 px-3.5 py-1.5 text-label font-medium text-neutral shadow-[0_0_0_1px_rgb(233_174_0/0.35),0_12px_24px_-10px_rgb(0_0_0/0.8)] backdrop-blur-md transition-[opacity,translate] duration-300 ease-premium ${
        shown
          ? "translate-y-0 opacity-100"
          : "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
      }`}
    >
      {text}
      {note && <span className="ml-1.5 text-neutral/55">{note}</span>}
    </span>
  );
}

const buttonClass = "group absolute left-0 top-0 cursor-pointer outline-none";
/**
 * The tap target: 44 × 44, centred on the coordinate like the disc, invisible. The disc itself is
 * 34–38px; this gives a finger the comfortable minimum without changing what the map shows.
 */
const hitArea = <span aria-hidden="true" className="absolute -left-[22px] -top-[22px] size-11 rounded-full" />;
/** Centred on the coordinate: the map layer places the origin exactly on it. */
const bodyClass = `relative -ml-[17px] -mt-[17px] flex transition-transform duration-500 ${SPRING} group-hover:scale-[1.12] group-focus-visible:scale-[1.12]`;

export function PropertyMarker({
  name,
  city,
  category,
  approximate,
  selected,
  previewed = false,
  onSelect,
  delay,
}: {
  name: string;
  city: string;
  category: PropertyCategory;
  /** Placed at its city's point, not an exact address. */
  approximate: boolean;
  selected: boolean;
  /** Its card is under the pointer: the marker lifts and names itself. */
  previewed?: boolean;
  onSelect: () => void;
  delay: number;
}) {
  return (
    <button
      type="button"
      data-marker
      aria-label={`${name}, ${city}${approximate ? " (city location)" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
      className={buttonClass}
    >
      {hitArea}
      <span className="block motion-safe:animate-[marker-in_0.7s_var(--ease-premium)_var(--delay)_both]">
        <span className={`${bodyClass} ${selected ? "scale-[1.18]" : previewed ? "scale-[1.12]" : ""}`}>
          <Highlight on={selected} square={category === "administration"} />
          <span aria-hidden="true" className={hoverRing} />
          <Disc category={category} approximate={approximate} active={selected} />
        </span>
      </span>
      <Label text={name} shown={selected || previewed} note={approximate ? `· ${city}` : undefined} />
    </button>
  );
}

export type ClusterMember = { id: string; name: string; category: PropertyCategory; approximate: boolean };

/** The fan: each member's place around the cluster, on an arc to one side, far enough apart that names never meet. */
function fanPositions(count: number, side: "left" | "right") {
  const radius = 64 + Math.max(0, count - 3) * 8;
  const spread = Math.min(150, 34 * (count - 1)); // degrees, top to bottom
  return Array.from({ length: count }, (_, i) => {
    const angle = ((-spread / 2 + (count === 1 ? 0 : (spread / (count - 1)) * i)) * Math.PI) / 180;
    const x = Math.cos(angle) * radius * (side === "right" ? 1 : -1);
    return { x, y: Math.sin(angle) * radius };
  });
}

/**
 * Locations too close to tell apart at this scale (Tirana's five) share one disc with
 * their count. Choosing it fans them out on an arc, each its own Infinity marker with its
 * name, on fine leader lines back to the cluster, so every one is one tap away. The fan
 * positions are for choosing, not addresses: each marker keeps its true place on the map.
 */
export function ClusterMarker({
  members,
  city,
  selectedId,
  previewId = null,
  onSelect,
  delay,
  side,
}: {
  members: ClusterMember[];
  city: string;
  selectedId: string;
  previewId?: string | null;
  onSelect: (id: string) => void;
  delay: number;
  /** Which way the fan opens: away from the frame's nearer edge. */
  side: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = members.find((member) => member.id === selectedId);
  const previewed = members.find((member) => member.id === previewId);
  const positions = fanPositions(members.length, side);
  const listId = `cluster-${city.replace(/\W+/g, "-").toLowerCase()}`;

  // Open, the fan sits above every other pin (on a small map it can reach a neighbour, such as
  // Korçë's): its marker is raised over the map's own order (3 for the selected, 1 for the rest).
  useEffect(() => {
    const marker = root.current?.closest<HTMLElement>(".maplibregl-marker");
    if (!marker) return;
    marker.style.zIndex = open ? "4" : selected ? "3" : "1";
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={root} className="absolute left-0 top-0">
      {/* The leader lines, from the cluster to each fanned marker. */}
      <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 overflow-visible">
        {positions.map((p, i) => (
          <line
            key={members[i].id}
            x1={0}
            y1={0}
            x2={open ? p.x : 0}
            y2={open ? p.y : 0}
            className={`stroke-accent/60 [stroke-width:1] transition-all duration-500 ${SPRING} ${open ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </svg>

      <button
        ref={trigger}
        type="button"
        data-marker
        aria-label={`${members.length} locations in ${city}: ${members.map((member) => member.name).join(", ")}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        style={{ "--delay": `${delay}ms` } as CSSProperties}
        className={buttonClass}
      >
        {hitArea}
        <span className="block motion-safe:animate-[marker-in_0.7s_var(--ease-premium)_var(--delay)_both]">
          <span className={`${bodyClass} ${selected && !open ? "scale-[1.12]" : ""}`}>
            <Highlight on={Boolean(selected) && !open} square={false} />
            <span aria-hidden="true" className={hoverRing} />
            <span className="relative flex size-[38px] items-center justify-center rounded-full bg-petrol/85 shadow-[inset_0_1px_0_rgb(247_247_242/0.18),0_8px_18px_-6px_rgb(0_0_0/0.7)] ring-1 ring-accent/70 backdrop-blur-sm">
              <InfinityMark className="absolute size-[15px] -translate-y-[5px] opacity-90" />
              <span className="absolute bottom-[5px] text-[0.625rem] font-semibold leading-none tabular-nums text-accent">{members.length}</span>
            </span>
          </span>
        </span>
        {!open && (
          <Label text={(previewed ?? selected)?.name ?? `${city} · ${members.length} locations`} shown={Boolean(selected || previewed)} />
        )}
      </button>

      {/* The fan: each location its own marker, named. */}
      <ul id={listId} aria-label={`Infinity locations in ${city}`} className={open ? "" : "pointer-events-none"}>
        {members.map((member, i) => {
          const p = positions[i];
          const active = member.id === selectedId;
          return (
            <li key={member.id}>
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                aria-hidden={!open}
                aria-pressed={active}
                aria-label={`${member.name}, ${PROPERTY_CATEGORY_LABEL[member.category]}${member.approximate ? " (city location)" : ""}`}
                onClick={() => onSelect(member.id)}
                style={{ transform: open ? `translate(${p.x}px, ${p.y}px)` : "translate(0, 0)", transitionDelay: open ? `${i * 35}ms` : "0ms" }}
                className={`group absolute left-0 top-0 cursor-pointer outline-none transition-[transform,opacity] duration-500 ${SPRING} ${open ? "opacity-100" : "opacity-0"}`}
              >
                {/* The fan keeps neighbours about 47px apart, so these never overlap. */}
                {hitArea}
                <span className="relative -ml-[17px] -mt-[17px] flex transition-transform duration-500 group-hover:scale-[1.12] group-focus-visible:scale-[1.12]">
                  <span aria-hidden="true" className={hoverRing} />
                  <Disc category={member.category} approximate={member.approximate} active={active} />
                </span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-0 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1 text-label font-medium shadow-[0_10px_20px_-10px_rgb(0_0_0/0.8)] backdrop-blur-md transition-colors duration-300 ${
                    side === "right" ? "left-[24px]" : "right-[24px]"
                  } ${active ? "bg-accent text-petrol" : "bg-petrol/90 text-neutral ring-1 ring-neutral/15 group-hover:ring-accent/60"}`}
                >
                  {member.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
