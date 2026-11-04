"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type DropdownProps = {
  id: string;
  label: string;
  /** Shown, and offered first, for "no selection". */
  anyLabel: string;
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
  icon?: ReactNode;
  className?: string;
};

/**
 * A select-only combobox (WAI-ARIA listbox pattern): arrow keys, Home/End,
 * Enter/Space to choose, Escape to close. The menu unfolds with a short
 * staggered reveal.
 */
export function Dropdown({ id, label, anyLabel, options, value, onChange, icon, className = "" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const items: (string | null)[] = [null, ...options];
  const selected = value === null ? 0 : options.indexOf(value) + 1;

  function show() {
    setActive(Math.max(0, selected));
    setOpen(true);
  }

  function close(refocus: boolean) {
    setOpen(false);
    if (refocus) button.current?.focus();
  }

  function choose(index: number) {
    onChange(items[index]);
    close(true);
  }

  useEffect(() => {
    if (!open) return;
    list.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function onButtonKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show();
    }
  }

  function onListKeyDown(event: KeyboardEvent) {
    const last = items.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close(false);
    }
  }

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={button}
        type="button"
        id={`${id}-button`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={onButtonKeyDown}
        className="group flex w-full items-center gap-4 rounded-[20px] px-5 py-4 text-left lg:max-2xl:gap-3 lg:max-2xl:px-4 outline-none transition-colors duration-300 hover:bg-black/[0.03] focus-visible:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-gold/70 aria-expanded:bg-black/[0.03]"
      >
        {/* Icons step aside on mid-size desktops, where the values need the room. */}
        {icon && <span className="shrink-0 text-foreground/45 lg:max-2xl:hidden transition-colors duration-300 group-hover:text-foreground">{icon}</span>}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            {label}
            {value !== null && <span aria-hidden="true" className="size-1 rounded-full bg-gold" />}
          </span>
          <span className="mt-1 block truncate text-[15px] font-medium tracking-[-0.01em] text-foreground">{value ?? anyLabel}</span>
        </span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="size-3 shrink-0 text-foreground/45 transition-transform duration-500 ease-premium group-aria-expanded:rotate-180"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ul
        ref={list}
        id={`${id}-list`}
        role="listbox"
        tabIndex={-1}
        aria-labelledby={`${id}-button`}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onKeyDown={onListKeyDown}
        className={`absolute left-0 top-[calc(100%+0.625rem)] z-30 w-max min-w-full max-w-[20rem] origin-top rounded-[22px] bg-white p-1.5 shadow-[0_0_0_1px_var(--line),0_30px_60px_-24px_rgb(20_21_24/0.35)] outline-none transition-[opacity,transform,visibility] duration-500 ease-premium ${
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-[0.98] opacity-0"
        }`}
      >
        {items.map((item, index) => {
          const isSelected = index === selected;
          return (
            <li
              key={item ?? "any"}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={isSelected}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
              style={{ transitionDelay: open ? `${index * 28}ms` : "0ms" }}
              className={`flex cursor-pointer items-center justify-between gap-8 rounded-2xl px-4 py-2.5 text-[15px] transition-[opacity,transform,background-color] duration-500 ease-premium ${
                open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
              } ${index === active ? "bg-black/[0.045]" : ""} ${isSelected ? "font-medium text-foreground" : "text-foreground/70"}`}
            >
              {item ?? anyLabel}
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full bg-gold transition-transform duration-300 ${isSelected ? "scale-100" : "scale-0"}`}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
