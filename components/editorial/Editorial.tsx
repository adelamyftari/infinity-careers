import type { ReactNode } from "react";

/**
 * Small pieces shared by the editorial pages (/company, /contact), in the site's existing type:
 * the numbered section label, a headline built from masked lines (RevealScope raises them), and
 * the diagonal arrow the site's buttons and links already use.
 */

/** "01 / WHO WE ARE": the number in Infinity Yellow, the rest in the section's own colour. */
export function SectionLabel({ number, children, tone = "light" }: { number?: string; children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <p data-reveal className={`flex items-center gap-2.5 text-label font-semibold tracking-[0.18em] ${tone === "dark" ? "text-neutral/85" : "text-primary"}`}>
      <span aria-hidden="true" className="size-2 shrink-0 bg-accent" />
      <span>
        {number && (
          <>
            <span className="tabular-nums text-accent">{number}</span> <span className={tone === "dark" ? "text-neutral/40" : "text-primary/35"}>/</span>{" "}
          </>
        )}
        {children}
      </span>
    </p>
  );
}

/**
 * A headline of lines (written in capitals, not transformed), each in its own mask so it can rise
 * into place. `label` is the sentence a screen reader hears once (the lines are hidden from it).
 */
export function Headline({ as: Tag = "h2", id, label, lines, className = "" }: { as?: "h1" | "h2"; id?: string; label: string; lines: ReactNode[]; className?: string }) {
  return (
    <Tag id={id} aria-label={label} className={`font-bold leading-[0.9] tracking-[-0.04em] ${className}`}>
      {lines.map((line, i) => (
        <span key={i} aria-hidden="true" className="block overflow-hidden pb-[0.07em]">
          <span data-line className="block">
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/** The site's diagonal arrow (buttons, links), moving up and right with its `group/arrow` parent. */
export function ArrowUpRight({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`${className} shrink-0 transition-transform duration-500 ease-premium group-hover/arrow:-translate-y-0.5 group-hover/arrow:translate-x-0.5 group-focus-visible/arrow:-translate-y-0.5 group-focus-visible/arrow:translate-x-0.5`}>
      <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
