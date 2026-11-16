import { Letters } from "@/components/home/destinations/MagneticLetters";
import { BENEFITS } from "@/lib/careers/benefits";

const title = "text-[clamp(3rem,0.5rem+8.6vw,9.5rem)]/[0.88] font-semibold tracking-[-0.04em]";
const line = "text-[clamp(1.0625rem,0.95rem+0.35vw,1.25rem)]/[1.55]";

/**
 * The three benefits as text. In the journey their titles are drawn in 3D (and
 * kept here for assistive technology and search), and each description is read
 * on the same grid as its type, placed by InfinityAdvantage from the scene's
 * measured type (--type-left, --desc-top): just below the headline, at the lower
 * right of the frame, its right edge on the content's right margin (where the
 * section bar's counter ends), one editorial column about 480px wide (narrower on a small screen), left-aligned
 * (`data-layout="aside"`); on a phone, on the headline's left edge (`"stack"`).
 * In warm white on petrol. All three share the same place, measure and type
 * (the dominant lines share one baseline, so the tops match too). --in brings it
 * in once (0 → 1), a short rise as it appears; then it stays, and --slide moves
 * it sideways with its composition as the camera travels (px); --out (0 → 1)
 * takes the last one away with the drop. Without the journey (reduced motion, no WebGL) it is a plain list
 * with large titles.
 */
export function BenefitOverlay() {
  return (
    <ol className="relative mt-20 space-y-20 in-data-[journey=on]:static in-data-[journey=on]:mt-0 in-data-[journey=on]:space-y-0">
      {BENEFITS.map((benefit) => (
        <li
          key={benefit.title}
          data-chapter
          className="in-data-[journey=on]:pointer-events-none in-data-[journey=on]:absolute in-data-[journey=on]:top-(--desc-top,70vh) in-data-[journey=on]:[opacity:calc(var(--in,1)*(1-var(--out,0)))] in-data-[journey=on]:[translate:calc(var(--slide,0)*1px)_calc((1-var(--in,1))*1.25rem)] in-data-[journey=on]:data-[layout=aside]:right-[max(var(--gutter),8vw)] in-data-[journey=on]:data-[layout=aside]:w-[min(30rem,max(22rem,40vw),calc(100%-2*max(var(--gutter),8vw)))] short:in-data-[journey=on]:data-[layout=aside]:w-[min(36rem,55vw)] in-data-[journey=on]:data-[layout=stack]:left-(--type-left,8vw) in-data-[journey=on]:data-[layout=stack]:w-[min(36rem,calc(100%-var(--type-left,8vw)-var(--gutter)))]"
        >
          <h3 className={`${title} in-data-[journey=on]:sr-only`}>
            {benefit.title.split(" ").map((word, w) => (
              <span key={w}>
                {w > 0 && " "}
                <Letters text={word} />
              </span>
            ))}
          </h3>
          <p
            className={`${line} mt-[clamp(1.25rem,3vh,2.25rem)] max-w-[36rem] text-pretty in-data-[journey=on]:mt-0 in-data-[journey=on]:text-[#f7f7f2] in-data-[layout=aside]:max-w-none in-data-[layout=aside]:text-[clamp(1.0625rem,0.92rem+0.2vw,1.125rem)]/[1.55]`}
          >
            {benefit.description}
          </p>
        </li>
      ))}
    </ol>
  );
}
