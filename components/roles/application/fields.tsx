"use client";

import type { ReactNode } from "react";

/**
 * The application's fields: white inputs on the dark glass, a label above,
 * an optional hint, and the error in Infinity Yellow below (the palette has no
 * red; on the dark field the yellow reads as the alert). Each control names
 * its hint and error with aria-describedby, and says aria-invalid.
 */

const INPUT =
  "block w-full rounded-[12px] border border-transparent bg-neutral px-4 text-body text-primary outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted/60 focus:border-accent focus:shadow-[0_0_0_3px_rgb(233_174_0/0.35)] aria-invalid:border-accent";

type Base = { id: string; label: string; error?: string; hint?: string; required?: boolean };

function describedBy({ id, error, hint }: Base) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

function Label({ id, label, required }: Base) {
  return (
    <label htmlFor={id} className="block text-small font-medium text-neutral/85">
      {label}
      {required ? (
        <span aria-hidden="true" className="ml-1 text-accent">
          *
        </span>
      ) : (
        <span className="ml-1.5 font-normal text-neutral/45">(optional)</span>
      )}
    </label>
  );
}

function Message(props: Base) {
  return (
    <>
      {props.hint && (
        <p id={`${props.id}-hint`} className="mt-1.5 text-label text-neutral/50">
          {props.hint}
        </p>
      )}
      {props.error && (
        <p id={`${props.id}-error`} className="mt-1.5 flex items-start gap-1.5 text-small text-accent">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 4.75v4M8 11.1v.15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {props.error}
        </p>
      )}
    </>
  );
}

type TextFieldProps = Base & {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "url" | "date";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
  min?: string;
};

export function TextField(props: TextFieldProps) {
  const { id, value, onChange, type = "text", autoComplete, inputMode, maxLength, placeholder, multiline, error, required, min } = props;
  const shared = {
    id,
    name: id,
    value,
    maxLength,
    placeholder,
    required,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy(props),
  };
  return (
    <div>
      <Label {...props} />
      <div className="mt-1.5">
        {multiline ? (
          <textarea {...shared} rows={4} onChange={(e) => onChange(e.target.value)} className={`${INPUT} min-h-28 resize-y py-3`} />
        ) : (
          <input {...shared} type={type} min={min} autoComplete={autoComplete} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} className={`${INPUT} h-12`} />
        )}
      </div>
      {multiline && maxLength && (
        <p aria-hidden="true" className="mt-1 text-right text-label tabular-nums text-neutral/45">
          {value.length} / {maxLength}
        </p>
      )}
      <Message {...props} />
    </div>
  );
}

export type Option = { value: string; label: string };

type SelectFieldProps = Base & { value: string; onChange: (value: string) => void; options: readonly Option[]; placeholder?: string };

export function SelectField(props: SelectFieldProps) {
  const { id, value, onChange, options, placeholder = "Choose…", error, required } = props;
  return (
    <div>
      <Label {...props} />
      <div className="relative mt-1.5">
        <select
          id={id}
          name={id}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(props)}
          className={`${INPUT} h-12 cursor-pointer appearance-none pr-10`}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 12 12" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-3 -translate-y-1/2 text-muted">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <Message {...props} />
    </div>
  );
}

type RadioProps = Base & {
  options: readonly Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Four options: two by two on a phone, one row from 640px. Otherwise one row that wraps when it must. */
  grid?: boolean;
  /** Five options, the first apart: on its own row, the rest two by two, until there is room for one row of five. */
  lead?: boolean;
};

/**
 * One choice among a few: a compact segmented control of radio buttons (arrow
 * keys move between them, as radios do). The chosen one in Infinity Yellow. An
 * option never shrinks below its label: the row wraps instead.
 */
export function RadioField(props: RadioProps) {
  const { id, label, options, value, onChange, error, required, hint, className = "", grid = false, lead = false } = props;
  const layout = lead ? "grid grid-cols-2 lg:grid-cols-5" : grid ? "grid grid-cols-2 sm:grid-cols-4" : "flex flex-wrap";
  return (
    <fieldset id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(props)} tabIndex={-1} className={`min-w-0 outline-none ${className}`}>
      <legend className="text-small font-medium text-neutral/85">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-accent">
            *
          </span>
        ) : (
          <span className="ml-1.5 font-normal text-neutral/45">(optional)</span>
        )}
      </legend>
      <div className={`mt-1.5 gap-1 rounded-[12px] bg-neutral/[0.07] p-1 ring-1 ${layout} ${error ? "ring-accent" : "ring-neutral/10"}`}>
        {options.map((option, i) => (
          <label key={option.value} className={`cursor-pointer ${lead ? (i === 0 ? "col-span-2 lg:col-span-1" : "") : grid ? "" : "flex-1"}`}>
            <input type="radio" name={id} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="peer sr-only" />
            <span className="flex min-h-10 items-center justify-center whitespace-nowrap rounded-[9px] px-3.5 text-center text-small text-neutral/80 transition-colors duration-200 hover:bg-neutral/10 hover:text-neutral peer-checked:bg-accent peer-checked:font-medium peer-checked:text-petrol peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-accent">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      <Message id={id} label={label} error={error} hint={hint} />
    </fieldset>
  );
}

/** A value the role decides (its only property, level or contract type): shown, not asked. */
export function FixedField({ id, label, value, note }: { id: string; label: string; value: string; note?: string }) {
  return (
    <div id={id} role="group" aria-labelledby={`${id}-label`} tabIndex={-1} className="min-w-0 outline-none">
      <p id={`${id}-label`} className="text-small font-medium text-neutral/85">
        {label}
      </p>
      <p className="mt-1.5 flex min-h-12 items-center justify-between gap-3 rounded-[12px] border border-neutral/15 px-4 py-2 text-body text-neutral">
        <span className="min-w-0">{value}</span>
        {note && <span className="shrink-0 text-label text-neutral/45">{note}</span>}
      </p>
    </div>
  );
}

/** A titled group of fields in a step: two columns from tablet width. */
export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-neutral/10 pt-5 first:border-t-0 first:pt-0">
      <h4 className="text-label font-medium tracking-[0.18em] text-neutral/55">{title}</h4>
      <div className="mt-4 grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}
