"use client";

import Link from "next/link";
import { Letters } from "@/components/home/destinations/MagneticLetters";
import { button } from "@/components/ui/button";

const LINES = [
  { words: ["JOIN", "OUR"], tone: "" },
  // The second line in Infinity Yellow in the petrol world (petrol, like the rest, without the journey).
  { words: ["TEAM"], tone: "in-data-[journey=on]:text-accent" },
];

/**
 * The end of the journey: "JOIN OUR / TEAM" a little above the middle, over
 * the collection of marks that rests beneath it, monumental, in the site's display face: JOIN OUR in warm white, TEAM
 * in Infinity Yellow. As the camera dives toward it, each word rises from
 * behind its mask (TEAM a beat after), then the one button, to the open
 * positions: white with petrol type. The falling mark strikes it
 * (InfinityAdvantage drives --give, the strike's damped spring, --side, the
 * struck side, and --lit, its flash): it dips, presses shorter and a little wider,
 * tips a touch, springs back and settles, flashing Infinity Yellow for a moment
 * before it returns to white. Its type stays petrol on the yellow (white would
 * read at only 2:1); on hover it is yellow too, its arrow leaning up and right. The whole call lets the
 * pointer through to the scene except on the button.
 * Shown when InfinityAdvantage sets `data-join`; without the journey it simply
 * stands.
 */
export function FinalCall() {
  return (
    <div className="relative mt-20 text-center in-data-[journey=on]:pointer-events-none in-data-[journey=on]:absolute in-data-[journey=on]:inset-0 in-data-[journey=on]:mt-0 in-data-[journey=on]:flex in-data-[journey=on]:flex-col in-data-[journey=on]:items-center in-data-[journey=on]:justify-center in-data-[journey=on]:px-(--gutter) in-data-[journey=on]:pb-[24vh] in-data-[journey=on]:pt-20 in-data-[join=false]:invisible">
      <p className="text-[clamp(4rem,10vw,11.25rem)]/[0.86] font-semibold tracking-[-0.045em]">
        {LINES.map((line, l) => (
          <span key={l} className={`block ${line.tone}`}>
            {line.words.map((word, w) => (
              <span key={w}>
                {w > 0 && " "}
                {/* The mask the word rises from: a little wider than the word on both sides (and back by as
                    much, so nothing moves), as the tight tracking leaves the last letter overhanging its
                    box, and a clipping edge there would cut the bowl and leg off the R of OUR. */}
                <span className="-mx-[0.08em] inline-block overflow-hidden px-[0.08em] pb-[0.08em] align-bottom">
                  <span
                    className="inline-block transition-[translate] duration-[1000ms] ease-premium in-data-[join=false]:translate-y-[112%]"
                    style={{ transitionDelay: `${l === 0 ? w * 110 : 300}ms` }}
                  >
                    <Letters text={word} />
                  </span>
                </span>
              </span>
            ))}
          </span>
        ))}
      </p>
      <Link
        data-cta
        href="/roles"
        // It comes up a moment after the headline, ready before the mark reaches it; its hover colours answer at once.
        style={{ transitionDelay: "0ms, 0ms, 0ms, 0ms", transitionDuration: "220ms, 220ms, 350ms, 350ms" }}
        className={`group ${button.explore} mt-[clamp(1.75rem,4.5vh,3rem)] h-14 gap-3 px-8 tracking-[0.1em] transition-[background-color,color,opacity,translate] duration-700 ease-premium in-data-[join=false]:translate-y-4 in-data-[join=false]:opacity-0 origin-bottom in-data-[journey=on]:bg-[color-mix(in_oklab,var(--color-accent)_calc(var(--lit,0)*100%),#ffffff)] in-data-[journey=on]:text-petrol in-data-[journey=on]:[transform:translateY(calc(var(--give,0)*10px))_rotate(calc(var(--side,1)*var(--give,0)*1.2deg))_scale(calc(1+var(--give,0)*0.028),calc(1-var(--give,0)*0.065))] in-data-[journey=on]:hover:bg-accent in-data-[journey=on]:hover:text-petrol`}
      >
        EXPLORE OPEN POSITIONS
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 transition-[translate] duration-[260ms] ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 in-data-[journey=on]:[transform:translateY(calc(var(--give,0)*2px))]">
          <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}
