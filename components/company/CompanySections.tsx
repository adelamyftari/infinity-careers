import Image from "next/image";
import Link from "next/link";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { ArrowUpRight, Headline, SectionLabel } from "@/components/editorial/Editorial";
import { RevealScope } from "@/components/motion/RevealScope";
import { button } from "@/components/ui/button";
import { DOTTED_FIELD } from "@/lib/site/surfaces";
import { DestinationsIndex } from "./DestinationsIndex";

/**
 * The Company page (/company), section by section. The words are Infinity's own, as supplied:
 * "Infinity Entertainment" for the casino development and entertainment group, "Infinity
 * Investment Group" where the supplied text names it. Nothing is added to them: no figures,
 * awards, licences or partners. The photographs are the site's own: the headquarters (HQ 1–3),
 * the teams at work (the job photographs) and the properties' galleries.
 */

const h2 = "text-[clamp(2.25rem,1rem+4.4vw,5.25rem)]";
const body = "text-[clamp(1.0625rem,0.95rem+0.4vw,1.3125rem)]/[1.6]";
const dark = "relative isolate overflow-hidden bg-petrol px-(--gutter) text-neutral";
const light = "relative isolate bg-neutral px-(--gutter) text-primary";
const space = "py-[clamp(5rem,10vw,9rem)]";
const Dots = () => <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 ${DOTTED_FIELD}`} />;

export function CompanyHero() {
  return (
    <RevealScope as="section" intro aria-labelledby="company-title" data-header-surface data-tone="dark" className={`${dark} pb-[clamp(4rem,8vw,7rem)] pt-[calc(5rem+clamp(2.5rem,6vw,5rem))]`}>
      <SectionLabel tone="dark">ABOUT INFINITY</SectionLabel>
      <Headline
        as="h1"
        id="company-title"
        label="Beyond entertainment."
        className="mt-5 text-[clamp(2rem,9.4vw,10rem)]"
        lines={["BEYOND", <span key="b" className="text-accent">ENTERTAINMENT.</span>]}
      />
      <div className="mt-[clamp(2.5rem,5vw,4.5rem)] grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-[clamp(2rem,4vw,4rem)]">
        <div className="lg:col-span-4">
          <p data-reveal className={`${body} max-w-[30rem] text-neutral/85`}>
            Infinity Entertainment is a casino development and management group dedicated to creating exceptional entertainment destinations through innovation, expertise, and a commitment to excellence.
          </p>
          <p data-reveal className="mt-8 flex items-center gap-3 text-label font-medium tracking-[0.18em] text-neutral/55">
            <span aria-hidden="true" className="h-px w-10 bg-accent" />
            HEADQUARTERS <span aria-hidden="true">·</span> TIRANA
          </p>
        </div>
        <figure className="lg:col-span-8 lg:-mr-(--gutter)">
          <div data-mask className="relative aspect-[16/10] overflow-hidden lg:aspect-[16/9]">
            <Image src="/images/HQ 3.png" alt="Infinity Headquarters in Tirana: the lit corridor between the offices" fill priority sizes="(min-width: 1024px) 70vw, 100vw" className="object-cover" />
          </div>
        </figure>
      </div>
    </RevealScope>
  );
}

export function WhoWeAre() {
  return (
    <RevealScope as="section" aria-labelledby="who-title" data-header-surface data-tone="light" className={`${light} ${space}`}>
      <Dots />
      <div data-group className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionLabel number="01">WHO WE ARE</SectionLabel>
          <Headline id="who-title" label="Creating extraordinary experiences." className={`mt-6 ${h2}`} lines={["CREATING", "EXTRAORDINARY", <>EXPERIENCES<span className="text-accent">.</span></>]} />
        </div>
        <div className="space-y-5 lg:col-span-5 lg:pt-[clamp(2.5rem,6vw,5.5rem)]">
          <p data-reveal className={body}>
            Infinity Entertainment Casino Development and Management Group is a leading organization in the region, specializing in the development and management of world-class casinos.
          </p>
          <p data-reveal className={`${body} text-muted`}>
            With a passion for delivering unparalleled entertainment experiences, we strive to create iconic destinations that captivate guests from around the globe.
          </p>
        </div>
      </div>
      <figure className="mt-[clamp(3rem,6vw,5.5rem)]">
        <div data-mask className="relative aspect-[4/3] overflow-hidden rounded-[6px] sm:aspect-[21/9]">
          <div data-drift="5" className="absolute inset-x-0 -inset-y-[7%]">
            <Image src="/images/HQ 1.png" alt="Infinity Headquarters: the reception beneath the Infinity Investment sign" fill sizes="(min-width: 1440px) 1440px, 100vw" className="object-cover" />
          </div>
        </div>
        <figcaption data-reveal className="mt-4 flex items-center gap-3 text-label font-medium tracking-[0.16em] text-muted">
          <span aria-hidden="true" className="h-px w-8 bg-accent" />
          INFINITY HEADQUARTERS, TIRANA
        </figcaption>
      </figure>
    </RevealScope>
  );
}

const THEMES = [
  { title: "DEVELOPMENT", text: "Concept creation, planning, design, and the development of exceptional entertainment destinations." },
  { title: "OPERATIONS", text: "Professional management, operational coordination, and the teams supporting daily business performance." },
  { title: "EXPERIENCE", text: "Hospitality, service quality, and memorable experiences for guests." },
];

export function OurExpertise() {
  return (
    <RevealScope as="section" aria-labelledby="expertise-title" data-header-surface data-tone="dark" className={`${dark} ${space}`}>
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-[clamp(2rem,4vw,4rem)]">
        <div data-group className="lg:col-span-6">
          <SectionLabel number="02" tone="dark">
            OUR EXPERTISE
          </SectionLabel>
          <Headline id="expertise-title" label="From concept to completion." className={`mt-6 ${h2}`} lines={["FROM CONCEPT", <>TO COMPLETION<span className="text-accent">.</span></>]} />
          <p data-reveal className={`${body} mt-8 max-w-[36rem] text-neutral/80`}>
            At Infinity Investment Group, we bring together a diverse team of industry experts, each contributing their unique skills and expertise to craft extraordinary casino projects. From concept to completion, we meticulously design and construct state-of-the-art facilities that embody innovation, luxury, and excitement.
          </p>
        </div>
        <figure className="lg:col-span-6">
          <div data-mask className="relative aspect-[4/3] overflow-hidden rounded-[6px] lg:aspect-[5/4]">
            <div data-drift="6" className="absolute inset-x-0 -inset-y-[8%]">
              <Image src="/images/HQ 2.png" alt="Infinity Headquarters: the open-plan offices beneath the ribbon light" fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover" />
            </div>
          </div>
        </figure>
      </div>

      {/* The three themes: editorial summaries of the text above, not separate divisions. */}
      <ol data-group className="mt-[clamp(4rem,8vw,7rem)] grid border-t border-neutral/15 md:grid-cols-3">
        {THEMES.map((theme, i) => (
          <li key={theme.title} data-reveal className="border-b border-neutral/15 py-9 md:border-b-0 md:border-l md:px-[clamp(1.25rem,2.5vw,2.5rem)] md:py-12 md:first:border-l-0 md:first:pl-0">
            <span aria-hidden="true" data-drift="4" className="block text-[clamp(3.5rem,6vw,6.5rem)] font-bold leading-none tracking-[-0.04em] text-transparent [-webkit-text-stroke:1px_var(--color-accent)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-6 text-[clamp(1.25rem,1rem+0.6vw,1.625rem)] font-semibold tracking-[0.06em]">
              <span className="sr-only">{String(i + 1).padStart(2, "0")} — </span>
              {theme.title}
            </h3>
            <p className="mt-3 max-w-[26rem] text-lead text-neutral/70">{theme.text}</p>
          </li>
        ))}
      </ol>
    </RevealScope>
  );
}

export function OurPeople() {
  return (
    <RevealScope as="section" aria-labelledby="people-title" data-header-surface data-tone="light" className={`${light} ${space}`}>
      <Dots />
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-[clamp(2rem,4vw,4rem)]">
        {/* The teams at work, from the site's own photography. */}
        <div aria-hidden="true" className="grid grid-cols-2 gap-[clamp(0.75rem,1.5vw,1.25rem)] max-lg:order-2 lg:col-span-6">
          <div data-mask className="relative row-span-2 aspect-[3/4] self-center overflow-hidden rounded-[6px]">
            <div data-drift="7" className="absolute inset-x-0 -inset-y-[9%]">
              <Image src="/images/Dealer.jpeg" alt="" fill sizes="(min-width: 1024px) 24vw, 48vw" className="object-cover" />
            </div>
          </div>
          <div data-mask className="relative aspect-square overflow-hidden rounded-[6px]">
            <Image src="/images/Waiter.JPG" alt="" fill sizes="(min-width: 1024px) 24vw, 48vw" className="object-cover object-[50%_30%]" />
          </div>
          <div data-mask className="relative aspect-square overflow-hidden rounded-[6px]">
            <Image src="/images/chef.jpg" alt="" fill sizes="(min-width: 1024px) 24vw, 48vw" className="object-cover object-[50%_35%]" />
          </div>
        </div>
        <div data-group className="lg:col-span-6 lg:pl-[clamp(0rem,2vw,2rem)]">
          <SectionLabel number="03">OUR PEOPLE</SectionLabel>
          <Headline id="people-title" label="People make the difference." className={`mt-6 ${h2}`} lines={["PEOPLE MAKE", <>THE DIFFERENCE<span className="text-accent">.</span></>]} />
          <p data-reveal className={`${body} mt-8`}>
            Our commitment to excellence extends beyond physical space. We believe that the true heart of any casino lies in its ability to provide unrivaled customer service and unforgettable moments. Our dedicated staff is meticulously trained to ensure that every guest receives personalized attention and a seamless gaming experience.
          </p>
          <p data-reveal className="mt-8 border-l-2 border-accent pl-5 text-[clamp(1.125rem,1rem+0.5vw,1.5rem)]/[1.45] font-medium tracking-[-0.01em]">
            Behind every exceptional experience is a team of people bringing expertise, dedication, and attention to detail to their work.
          </p>
          <div data-reveal className="mt-10">
            <Link href="/roles" className={`group/arrow ${button.action}`}>
              EXPLORE POSITIONS
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </div>
    </RevealScope>
  );
}

export function OurResponsibility() {
  return (
    <RevealScope as="section" aria-labelledby="trust-title" data-header-surface data-tone="light" className={`${light} border-t border-line ${space}`}>
      <Dots />
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-[clamp(2rem,4vw,4rem)]">
        <div data-group className="lg:col-span-5">
          <SectionLabel number="04">OUR RESPONSIBILITY</SectionLabel>
          <Headline id="trust-title" label="Built on trust." className="mt-6 text-[clamp(3rem,1rem+7vw,8.5rem)]" lines={["BUILT ON", <>TRUST<span className="text-accent">.</span></>]} />
        </div>
        <div data-group className="lg:col-span-7 lg:pt-[clamp(2.5rem,6vw,5.5rem)]">
          <p data-reveal className="text-[clamp(1.375rem,1rem+1.2vw,2.25rem)]/[1.3] font-medium tracking-[-0.015em]">
            As responsible stewards of the industry, we prioritize the highest standards of integrity, transparency, and regulatory compliance.
          </p>
          <div className="mt-[clamp(2.5rem,5vw,4rem)] grid gap-10 md:grid-cols-2 md:gap-[clamp(2rem,4vw,3.5rem)]">
            <div data-reveal className="border-t border-primary/20 pt-6">
              <h3 className="text-label font-semibold tracking-[0.18em] text-muted">STAKEHOLDERS</h3>
              <p className="mt-4 text-lead">
                We work closely with local authorities, communities, and stakeholders to foster mutually beneficial relationships and promote sustainable growth.
              </p>
            </div>
            <div data-reveal className="border-t border-primary/20 pt-6">
              <h3 className="text-label font-semibold tracking-[0.18em] text-muted">COMMUNITIES</h3>
              <p className="mt-4 text-lead">
                At Infinity Entertainment, we recognize the social and economic impact our projects can have on communities. We are committed to being good corporate citizens, supporting local initiatives, and creating job opportunities that contribute to the growth and prosperity of the regions in which we operate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </RevealScope>
  );
}

export function OurVision() {
  return (
    <RevealScope as="section" aria-labelledby="vision-title" data-header-surface data-tone="dark" className={`${dark} ${space}`}>
      {/* The official mark, large and barely there. */}
      <InfinityMark aria-hidden="true" data-drift="6" className="pointer-events-none absolute -right-[12%] top-1/2 -z-10 size-[min(52rem,95vw)] -translate-y-1/2 fill-neutral opacity-[0.045] max-lg:-right-[35%]" />
      <SectionLabel number="05" tone="dark">
        OUR VISION
      </SectionLabel>
      <Headline id="vision-title" label="Always moving forward." className="mt-6 text-[clamp(2.75rem,1rem+7.4vw,9rem)]" lines={["ALWAYS", <>MOVING <span className="text-accent">FORWARD.</span></>]} />
      <div data-group className="mt-[clamp(2.5rem,5vw,4.5rem)] grid gap-8 lg:grid-cols-12">
        <span data-reveal aria-hidden="true" className="h-px w-16 self-start bg-accent lg:col-span-1 lg:mt-4 lg:w-full" />
        <p data-reveal className={`${body} text-neutral/85 lg:col-span-6 lg:col-start-3`}>
          With a global perspective, we actively seek out opportunities to expand our portfolio and bring our expertise to new markets. Our unwavering focus on innovation enables us to stay ahead of industry trends and adapt to the evolving demands of the modern gaming landscape.
        </p>
        <p data-reveal className="text-lead text-neutral/60 lg:col-span-4">
          Every new destination carries the same ambition: memorable entertainment experiences, developed for the long term.
        </p>
      </div>
    </RevealScope>
  );
}

export function OurDestinations() {
  return (
    <RevealScope as="section" aria-labelledby="destinations-title" data-header-surface data-tone="light" className={`${light} ${space}`}>
      <Dots />
      <div data-group className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <SectionLabel number="06">OUR DESTINATIONS</SectionLabel>
          <Headline id="destinations-title" label="Explore the Infinity world." className={`mt-6 ${h2}`} lines={["EXPLORE THE", <>INFINITY <span className="text-accent">WORLD.</span></>]} />
        </div>
        <p data-reveal className={`${body} text-muted lg:col-span-5`}>
          Discover the destinations and teams behind Infinity&apos;s hospitality, dining, and entertainment experiences across Albania.
        </p>
      </div>
      <div className="mt-[clamp(3rem,6vw,5rem)]">
        <DestinationsIndex />
      </div>
      <div data-reveal className="mt-12">
        <Link href="/properties" className={`group/arrow ${button.action}`}>
          EXPLORE OUR PROPERTIES
          <ArrowUpRight />
        </Link>
      </div>
    </RevealScope>
  );
}

export function CompanyCall() {
  return (
    <RevealScope as="section" aria-labelledby="call-title" data-header-surface data-tone="dark" className={`${dark} py-[clamp(6rem,12vw,11rem)]`}>
      <Headline id="call-title" label="Your future starts here." className="text-[clamp(2.75rem,1rem+7.4vw,9rem)]" lines={["YOUR FUTURE", <>STARTS <span className="text-accent">HERE.</span></>]} />
      <div data-group className="mt-[clamp(2rem,4vw,3.5rem)] flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <p data-reveal className={`${body} max-w-[34rem] text-neutral/80`}>
          Explore career opportunities across Infinity and discover where your skills and ambitions can make an impact.
        </p>
        <div data-reveal className="flex flex-wrap gap-3">
          <Link href="/roles" className={`group/arrow ${button.search}`}>
            EXPLORE POSITIONS
            <ArrowUpRight />
          </Link>
          <Link href="/contact" className={`group/arrow ${button.ghost}`}>
            GET IN TOUCH
            <ArrowUpRight />
          </Link>
        </div>
      </div>
    </RevealScope>
  );
}
