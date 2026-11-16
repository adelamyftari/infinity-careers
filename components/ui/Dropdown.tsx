"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";

/** The panel at its tallest (22rem): a long list scrolls inside it. */
const PANEL_MAX = 352;

/** One choice: its value, what it reads as, and optionally the heading it is listed under. */
export type DropdownOption = { value: string; label: string; group?: string };

type CommonProps = {
  id: string;
  label: string;
  /** Shown, and offered first, for "no selection". */
  anyLabel: string;
  /** Options sharing a `group` should be adjacent; each group gets a heading. */
  options: DropdownOption[];
  className?: string;
};

/** One value, or (`multiple`) any number of them: the "All" option then clears the choice. */
type DropdownProps = CommonProps &
  (
    | { multiple?: false; value: string | null; onChange: (value: string | null) => void }
    | { multiple: true; value: readonly string[]; onChange: (value: string[]) => void }
  );

/**
 * A select-only combobox (WAI-ARIA listbox pattern): arrow keys, Home/End,
 * Enter/Space to choose, Escape to close. Grouped options are listed under
 * headings (role="group"); the keys move over the options alone. With
 * `multiple`, choosing toggles an option and the list stays open
 * (aria-multiselectable).
 */
export function Dropdown(props: DropdownProps) {
  const { id, label, anyLabel, options, className = "" } = props;
  const multiple = props.multiple === true;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState({ up: false, maxHeight: PANEL_MAX });
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const items: (DropdownOption | null)[] = [null, ...options];
  const chosen: readonly string[] = props.multiple ? props.value : props.value === null ? [] : [props.value];
  const chosenLabels = options.filter((option) => chosen.includes(option.value)).map((option) => option.label);
  const selected = chosen.length === 0 ? 0 : options.findIndex((option) => option.value === chosen[0]) + 1;
  const current = chosenLabels.length === 0 ? anyLabel : chosenLabels.length === 1 ? chosenLabels[0] : `${chosenLabels[0]} +${chosenLabels.length - 1}`;
  const isChosen = (index: number) => (index === 0 ? chosen.length === 0 : chosen.includes(options[index - 1].value));

  function show() {
    // Where the panel fits: below the control, no taller than the room left on screen; above it
    // when there is little room below and more above (a phone on its side, a control low down).
    const box = button.current?.getBoundingClientRect();
    if (box) {
      const gap = 10 + 12;
      const below = window.innerHeight - box.bottom - gap;
      const above = box.top - gap;
      const up = below < 200 && above > below;
      setPlace({ up, maxHeight: Math.round(Math.max(120, Math.min(PANEL_MAX, up ? above : below))) });
    }
    setActive(Math.max(0, selected));
    setOpen(true);
  }

  function close(refocus: boolean) {
    setOpen(false);
    if (refocus) button.current?.focus();
  }

  function choose(index: number) {
    const value = items[index]?.value ?? null;
    if (props.multiple) {
      props.onChange(value === null ? [] : chosen.includes(value) ? chosen.filter((v) => v !== value) : [...chosen, value]);
      return;
    }
    props.onChange(value);
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

  // A long list scrolls: keep the option the keys are on in view.
  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

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
        className="group flex w-full cursor-pointer items-center gap-3 rounded-inner px-4 py-2 text-left transition-colors duration-[220ms] ease-out hover:bg-primary/[0.06] aria-expanded:bg-primary/10"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-label text-muted">
            {label}
            {chosen.length > 0 && <span aria-hidden="true" className="size-1 rounded-full bg-accent" />}
          </span>
          <span className="mt-0.5 block truncate text-button font-medium text-primary">{current}</span>
        </span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="size-3 shrink-0 text-muted transition-transform duration-300 ease-premium group-aria-expanded:rotate-180"
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
        aria-multiselectable={multiple || undefined}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onKeyDown={onListKeyDown}
        style={{ maxHeight: place.maxHeight }}
        className={`absolute left-0 ${place.up ? "bottom-[calc(100%+0.625rem)] origin-bottom" : "top-[calc(100%+0.625rem)] origin-top"} z-30 w-max min-w-full max-w-[20rem] overflow-y-auto overscroll-contain rounded-control bg-neutral p-1.5 shadow-[0_0_0_1px_var(--line),0_28px_56px_-28px_rgb(0_0_0/0.45)] outline-none duration-200 ease-out ${
          // Opening, it is visible at once (so it can take focus) and fades in; closing, it fades and then hides.
          open ? "visible translate-y-0 opacity-100 transition-[opacity,transform]" : "invisible -translate-y-1 opacity-0 transition-[opacity,transform,visibility]"
        }`}
      >
        {items.map((item, index) => {
          const isSelected = isChosen(index);
          const heading = item?.group && item.group !== items[index - 1]?.group ? item.group : null;
          const option = (
            <li
              key={item?.value ?? "any"}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={isSelected}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
              className={`flex cursor-pointer items-center justify-between gap-8 rounded-inner px-3 py-2.5 text-body ${index === active ? "bg-primary/[0.08]" : ""} ${isSelected ? "font-medium text-primary" : "text-muted"}`}
            >
              {item?.label ?? anyLabel}
              {multiple && index > 0 ? (
                <span aria-hidden="true" className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border ${isSelected ? "border-primary bg-primary text-neutral" : "border-primary/35"}`}>
                  {isSelected && (
                    <svg viewBox="0 0 12 12" className="size-2.5">
                      <path d="m2.5 6.2 2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              ) : (
                <span aria-hidden="true" className={`size-1.5 rounded-full bg-accent ${isSelected ? "" : "invisible"}`} />
              )}
            </li>
          );
          return heading ? (
            <Fragment key={`group-${heading}`}>
              <li role="presentation" aria-hidden="true" className="px-3 pb-1 pt-3 text-label font-medium text-muted first:pt-1.5">
                {heading}
              </li>
              {option}
            </Fragment>
          ) : (
            option
          );
        })}
      </ul>
    </div>
  );
}
