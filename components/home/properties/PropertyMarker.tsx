"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { InfinityMark } from "@/components/brand/InfinityMark";
import type { PropertyCategory } from "@/lib/properties/properties";

/** A fine outer ring sets hotels and restaurants apart from casinos. */
const RING: Record<PropertyCategory, string> = {
  casino: "",
  hotel: "outline outline-1 outline-offset-[3px] outline-signature/60",
  restaurant: "outline outline-1 outline-dashed outline-offset-[3px] outline-signature/60",
};

/** A small gold coin, lit from above, casting a soft shadow. */
function Coin({ ring = "", children }: { ring?: string; children: ReactNode }) {
  return (
    <span
      className={`relative flex size-[30px] items-center justify-center rounded-full bg-signature shadow-[inset_0_1px_0_rgb(255_255_255/0.55),inset_0_-3px_6px_rgb(120_70_0/0.45),0_8px_16px_-4px_rgb(0_0_0/0.75)] ${ring}`}
    >
      {children}
    </span>
  );
}

/** The selected marker's soft halo: breathing gently, or steady with reduced motion. */
function Halo({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 top-1/2 size-[54px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signature/15 ring-1 ring-signature/35 transition-[opacity,scale] duration-500 ease-premium motion-safe:animate-[halo_2.4s_ease-in-out_infinite] ${
        on ? "scale-100 opacity-100" : "scale-50 opacity-0"
      }`}
    />
  );
}

/** The floating name: on hover and focus, and kept on the selected marker. */
function Label({ text, shown }: { text: string; shown: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-[26px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/85 px-3.5 py-1.5 text-[12.5px] font-medium tracking-[-0.01em] text-warm shadow-[0_0_0_1px_rgb(233_163_0/0.35),0_12px_24px_-10px_rgb(0_0_0/0.8)] backdrop-blur-md transition-[opacity,translate] duration-300 ease-premium ${
        shown
          ? "translate-y-0 opacity-100"
          : "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
      }`}
    >
      {text}
    </span>
  );
}

const buttonClass = "group absolute left-0 top-0 cursor-pointer outline-none";
/** Centred on the coordinate: the map layer places the origin exactly on it. */
const bodyClass = "relative -ml-[15px] -mt-[15px] flex transition-transform duration-500 ease-premium group-hover:scale-[1.15] group-focus-visible:scale-[1.15]";
const focusRing =
  "pointer-events-none absolute left-1/2 top-1/2 size-[42px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 ring-2 ring-warm transition-opacity group-focus-visible:opacity-100";

export function PropertyMarker({
  name,
  city,
  category,
  selected,
  onSelect,
  delay,
}: {
  name: string;
  city: string;
  category: PropertyCategory;
  selected: boolean;
  onSelect: () => void;
  delay: number;
}) {
  return (
    <button
      type="button"
      data-marker
      aria-label={`${name}, ${city}`}
      aria-pressed={selected}
      onClick={onSelect}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
      className={buttonClass}
    >
      <span className="block motion-safe:animate-[marker-in_0.7s_var(--ease-premium)_var(--delay)_both]">
        <span className={`${bodyClass} ${selected ? "scale-[1.15]" : ""}`}>
          <Halo on={selected} />
          <span aria-hidden="true" className={focusRing} />
          <Coin ring={RING[category]}>
            <InfinityMark fill="#141518" className="size-[14px]" />
          </Coin>
        </span>
      </span>
      <Label text={name} shown={selected} />
    </button>
  );
}

type Member = { id: string; name: string };

/**
 * Properties too close to tell apart at country scale share one coin with a
 * count. Choosing it opens a small menu of them, so each stays one tap away
 * and every marker keeps its true coordinate.
 */
export function ClusterMarker({
  members,
  city,
  selectedId,
  onSelect,
  delay,
}: {
  members: Member[];
  city: string;
  selectedId: string;
  onSelect: (id: string) => void;
  delay: number;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = members.find((member) => member.id === selectedId);

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
      <button
        ref={trigger}
        type="button"
        data-marker
        aria-label={`${members.length} properties in ${city}: ${members.map((member) => member.name).join(", ")}`}
        aria-expanded={open}
        aria-controls={`cluster-${city}`}
        onClick={() => setOpen((value) => !value)}
        style={{ "--delay": `${delay}ms` } as CSSProperties}
        className={buttonClass}
      >
        <span className="block motion-safe:animate-[marker-in_0.7s_var(--ease-premium)_var(--delay)_both]">
          <span className={`${bodyClass} ${selected ? "scale-[1.15]" : ""}`}>
            <Halo on={Boolean(selected)} />
            <span aria-hidden="true" className={focusRing} />
            <Coin>
              <span className="font-mono text-[12px] font-semibold text-ink">{members.length}</span>
            </Coin>
          </span>
        </span>
        {!open && <Label text={selected ? selected.name : `${city} · ${members.length} properties`} shown={Boolean(selected)} />}
      </button>

      {open && (
        <ul
          id={`cluster-${city}`}
          aria-label={`Properties in ${city}`}
          className="absolute bottom-[28px] left-1/2 z-10 w-max min-w-[13rem] -translate-x-1/2 rounded-[20px] bg-ink/90 p-1.5 shadow-[0_0_0_1px_rgb(233_163_0/0.3),0_24px_48px_-16px_rgb(0_0_0/0.9)] backdrop-blur-md motion-safe:animate-[marker-in_0.35s_var(--ease-premium)_both]"
        >
          <li className="px-3 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-warm/45">{city}</li>
          {members.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                aria-pressed={member.id === selectedId}
                onClick={() => {
                  onSelect(member.id);
                  setOpen(false);
                  trigger.current?.focus();
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left text-[13.5px] text-warm/75 outline-none transition-colors hover:bg-white/[0.06] hover:text-warm focus-visible:bg-white/[0.08] focus-visible:text-warm aria-pressed:text-warm"
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${member.id === selectedId ? "bg-signature" : "bg-warm/25"}`}
                />
                {member.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
