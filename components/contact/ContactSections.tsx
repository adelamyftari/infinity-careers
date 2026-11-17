import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Headline, SectionLabel } from "@/components/editorial/Editorial";
import { RevealScope } from "@/components/motion/RevealScope";
import { button } from "@/components/ui/button";
import { HEADQUARTERS_CONTACT as HQ } from "@/lib/site/contact";
import { DOTTED_FIELD } from "@/lib/site/surfaces";
import { ContactForm } from "./ContactForm";
import { HeadquartersMap } from "./HeadquartersMap";

/**
 * The Contact page (/contact). Only the details Infinity has confirmed: the headquarters' address
 * and telephone number. No email address or opening hours are shown, as none has been supplied.
 */

const h2 = "text-[clamp(2.25rem,1rem+4.4vw,5.25rem)]";
const body = "text-[clamp(1.0625rem,0.95rem+0.4vw,1.3125rem)]/[1.6]";
const light = "relative isolate bg-neutral px-(--gutter) text-primary";
const Dots = () => <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 ${DOTTED_FIELD}`} />;
/** A link that draws an Infinity Yellow underline in from the left (as the footer's links do). */
const drawn =
  "bg-[linear-gradient(var(--color-accent),var(--color-accent))] bg-size-[0%_2px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-premium hover:bg-size-[100%_2px] focus-visible:bg-size-[100%_2px]";

export function ContactHero() {
  return (
    <RevealScope as="section" intro aria-labelledby="contact-title" data-header-surface data-tone="light" className={`${light} pb-[clamp(3rem,6vw,5rem)] pt-[calc(5rem+clamp(2.5rem,6vw,5rem))]`}>
      <Dots />
      <SectionLabel>
        INFINITY CAREERS <span className="text-accent">/</span> CONTACT
      </SectionLabel>
      {/* CONNECT. in Infinity Yellow on a Dark Forest Teal band: yellow alone on the cream would not be legible. */}
      <Headline
        as="h1"
        id="contact-title"
        label="Let’s connect."
        className="mt-5 text-[clamp(3rem,1rem+9vw,10.5rem)]"
        lines={[
          "LET’S",
          <span key="c" className="inline-block bg-petrol px-[0.14em] pb-[0.02em] text-accent">
            CONNECT.
          </span>,
        ]}
      />
      <p data-reveal className={`${body} mt-[clamp(1.5rem,3vw,2.5rem)] max-w-[34rem] text-muted`}>
        Have a question about Infinity or our career opportunities? Get in touch with our team.
      </p>
    </RevealScope>
  );
}

export function VisitHeadquarters() {
  return (
    <RevealScope as="section" aria-labelledby="visit-title" data-header-surface data-tone="light" className={`${light} py-[clamp(3rem,7vw,6rem)]`}>
      <Dots />
      {/* The headline across the page, the details and the photograph side by side beneath it. */}
      <div data-group className="border-t border-line pt-[clamp(3rem,6vw,5rem)]">
        <SectionLabel number="01">HEADQUARTERS</SectionLabel>
        <Headline id="visit-title" label="Visit our headquarters." className={`mt-6 ${h2}`} lines={["VISIT OUR", <>HEADQUARTERS<span className="text-accent">.</span></>]} />
      </div>
      <div className="mt-[clamp(2.5rem,5vw,4rem)] grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-[clamp(2rem,4vw,4rem)]">
        <div data-group className="lg:col-span-5">
          <dl className="border-t border-primary/15">
            <div data-reveal className="grid gap-1 border-b border-primary/15 py-5 sm:grid-cols-[7rem_1fr] sm:gap-6">
              <dt className="text-label font-semibold tracking-[0.18em] text-muted">LOCATION</dt>
              <dd>
                <address className="text-lead not-italic">
                  <span className="block font-semibold">
                    {HQ.organization} — {HQ.label}
                  </span>
                  <span className="block">{HQ.street}</span>
                  <span className="block">{HQ.city}</span>
                </address>
              </dd>
            </div>
            <div data-reveal className="grid gap-1 border-b border-primary/15 py-5 sm:grid-cols-[7rem_1fr] sm:items-baseline sm:gap-6">
              <dt className="text-label font-semibold tracking-[0.18em] text-muted">PHONE</dt>
              <dd>
                <a href={HQ.phoneHref} className={`text-[clamp(1.375rem,1.1rem+0.9vw,1.875rem)] font-semibold tabular-nums tracking-[-0.01em] outline-none ${drawn}`}>
                  {HQ.phone}
                </a>
              </dd>
            </div>
          </dl>
        </div>
        <figure className="lg:col-span-7">
          <div data-mask className="relative aspect-[4/3] overflow-hidden rounded-[6px] lg:aspect-[16/11]">
            <div data-drift="5" className="absolute inset-x-0 -inset-y-[7%]">
              <Image src="/images/HQ 1.png" alt="The reception of Infinity Headquarters, beneath the Infinity Investment sign" fill sizes="(min-width: 1024px) 56vw, 100vw" className="object-cover" />
            </div>
          </div>
          <figcaption data-reveal className="mt-4 flex items-center gap-3 text-label font-medium tracking-[0.16em] text-muted">
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            ARENA CENTER, FLOOR 2 · TIRANA
          </figcaption>
        </figure>
      </div>
    </RevealScope>
  );
}

export function LocationMap() {
  return (
    <RevealScope as="section" aria-labelledby="map-title" data-header-surface data-tone="light" className={`${light} pb-[clamp(3rem,7vw,6rem)]`}>
      <Dots />
      <div data-group className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel number="02">FIND US</SectionLabel>
          <h2 id="map-title" data-reveal className="mt-4 text-title font-semibold">
            Arena Center, at the Air Albania Stadium, on Dervish Hima Street.
          </h2>
        </div>
        <a data-reveal href={HQ.mapsHref} target="_blank" rel="noreferrer" className={`group/arrow ${button.tertiary} -mx-4 shrink-0 font-semibold tracking-[0.06em]`}>
          OPEN IN MAPS
          <ArrowUpRight />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <div data-reveal className="mt-6 h-[clamp(20rem,42vw,34rem)]">
        <HeadquartersMap />
      </div>
    </RevealScope>
  );
}

export function MessageSection() {
  return (
    <RevealScope as="section" aria-labelledby="message-title" data-header-surface data-tone="light" className={`${light} py-[clamp(4rem,8vw,7rem)]`}>
      <Dots />
      <div className="grid gap-12 border-t border-line pt-[clamp(3rem,6vw,5rem)] lg:grid-cols-12 lg:gap-[clamp(2rem,4vw,4rem)]">
        <div data-group className="lg:col-span-5">
          <SectionLabel number="03">WRITE TO US</SectionLabel>
          <Headline id="message-title" label="Send us a message." className={`mt-6 ${h2}`} lines={["SEND US A", <>MESSAGE<span className="text-accent">.</span></>]} />
          <p data-reveal className="mt-6 max-w-[28rem] text-lead text-muted">
            For general questions about Infinity. To apply for a position, use the application on{" "}
            <Link href="/roles" className={`font-semibold text-primary ${drawn}`}>
              Positions
            </Link>
            .
          </p>
        </div>
        <div data-reveal className="lg:col-span-7">
          <ContactForm />
        </div>
      </div>
    </RevealScope>
  );
}

export function CareersCall() {
  return (
    <RevealScope as="section" aria-labelledby="careers-call-title" data-header-surface data-tone="dark" className="relative isolate overflow-hidden bg-petrol px-(--gutter) py-[clamp(4.5rem,9vw,8rem)] text-neutral">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <Headline id="careers-call-title" label="Looking for your next opportunity?" className="text-[clamp(2.25rem,1rem+4.4vw,5.25rem)]" lines={["LOOKING FOR", <>YOUR NEXT <span className="text-accent">OPPORTUNITY?</span></>]} />
        <div data-group className="max-w-[26rem] lg:pb-2">
          <p data-reveal className="text-lead text-neutral/80">
            Explore positions across Infinity&apos;s hospitality, entertainment, and corporate teams.
          </p>
          <div data-reveal className="mt-6">
            <Link href="/roles" className={`group/arrow ${button.search}`}>
              VIEW POSITIONS
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </div>
    </RevealScope>
  );
}
