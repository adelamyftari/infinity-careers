import { Newsreader } from "next/font/google";

// The statement's serif, loaded and applied here (its class on the heading),
// so the heading can never fall back to the page's sans.
const editorial = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

/**
 * The editorial statement that takes over from the roles orbit: four
 * asymmetric lines in solid ink, one sturdy serif with true italics, and a
 * short description beneath.
 *
 * Plain markup. It is the foreground layer of the orbit's scroll scene (see
 * JobCarousel): there, the same scroll timeline that sends the cards back
 * into depth lifts `[data-handoff-rise]` from below the screen as one block,
 * in front of the cards, and fades in `[data-handoff-fade]`. Without that
 * (reduced motion, no JavaScript) it simply sits in the page below them.
 */
export function CompanyIntro() {
  return (
    <div data-handoff-rise className="px-(--gutter) py-[clamp(4rem,10vh,7rem)] in-data-[handoff=overlay]:pb-0 in-data-[handoff=overlay]:pt-[14vh]">
      <h2
        id="intro-title"
        className={`${editorial.className} text-[clamp(2.5rem,11.2vw,4.5rem)] font-medium leading-[0.86] tracking-[-0.03em] text-ink [font-variation-settings:'opsz'_48] sm:text-[clamp(2.5rem,min(9.9vw,17.5vh),12.5rem)]`}
      >
        <span className="block text-right sm:pr-[1%]">At Infinity,</span>
        <span className="block sm:pl-[17%]">
          there’s <em className="font-normal italic">more than</em>
        </span>
        <span className="block sm:pl-[8.5%]">one way to grow</span>
        <span className="block pl-[16%] sm:pl-[44%]">
          <em className="font-normal italic">your career</em>
          <span className="sr-only">.</span>
          <span aria-hidden="true" className="ml-[0.06em] inline-block size-[0.11em] bg-gold" />
        </span>
      </h2>

      <div data-handoff-fade className="mt-[clamp(2rem,6vh,4.5rem)] max-w-[44rem] sm:ml-[37%] sm:max-w-[min(47%,44rem)]">
        <span aria-hidden="true" className="mb-5 block h-px w-10 bg-foreground/70" />
        <p className="text-[clamp(1rem,1.5vw,1.5rem)] leading-[1.4] text-foreground/70">
          From hotels and restaurants to casinos and office teams, explore opportunities that match your interests and help you grow.
        </p>
      </div>
    </div>
  );
}
