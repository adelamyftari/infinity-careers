"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { isWideLayout } from "@/lib/site/layout";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { InfinityMark } from "@/components/brand/InfinityMark";
import { button } from "@/components/ui/button";
import { CITIES, DESTINATIONS, type Destination } from "@/lib/properties/destinations";
import { propertyHrefFor } from "@/lib/properties/properties";
import { Letters, useMagneticLetters } from "./MagneticLetters";

const PROPERTIES = DESTINATIONS.filter((destination) => !destination.headquarters);
/** Behind the frame's own card there are the other six, so the deck has seven layers. */
const DECK_LAYERS = PROPERTIES.length - 1;

// The master timeline's budget, in screens of scrolling, from the moment the orbit holds its stack.
/** orangeSlideUp: the properties section rises over the orbit, carrying the title and the closed deck. */
const SLIDE_UP = 0.55;
/** titleTransform + deckUnfold: the deck fans out and converges into the one frame as the title settles. */
const FAN = 0.28;
const CONVERGE = 0.32;
const FRAME_SET = SLIDE_UP + FAN + CONVERGE;
/** filmstripEntrance: from the right, behind the frame. */
const STRIP_ENTERS_AT = SLIDE_UP + 0.45;
const STRIP_ENTRANCE = 0.3;
/** mediaProgress: from one property's arrival to the next's; of that, the wipe itself. */
const MEDIA_AT = FRAME_SET + 0.25;
const STEP = 0.6;
const WIPE = 0.42;
/** deckFold: Royal Casino has had its moment; the frame closes, once. */
const FOLD_AT = MEDIA_AT + (PROPERTIES.length - 1) * STEP + 0.2;
const FOLD_FAN = 0.28;
const FOLD_STACK = 0.32;
/** Closed: the deck holds while the next section (The Infinity Advantage) rises over it, in this many screens. */
const CLOSED_AT = FOLD_AT + FOLD_FAN + FOLD_STACK;
export const ADVANTAGE_RISE = 1;
const SCREENS = CLOSED_AT + ADVANTAGE_RISE;

/** How the frame's own card sits in the closed deck. */
const DECK_SCALE = 0.55;
/** The cut around the button: its gap, and the radii of the card and of the step, as on the job cards. */
const NOTCH_GAP = 8;
const CARD_RADIUS = 16;
const STEP_RADIUS = 12;
/** The settled title, in px on screen: as large as the room beside the frame allows, up to this. */
const TITLE_MAX = 84;
/** Between the settled title and the frame, and the statement and the frame: one axis on each side. */
const FRAME_GAP = 28;

/** The card's silhouette, with the stepped notch at the lower right that the button stands in. */
function silhouette(w: number, h: number, notchW: number, notchH: number) {
  const r = CARD_RADIUS;
  const step = STEP_RADIUS;
  const top = h - notchH - NOTCH_GAP;
  const left = w - notchW - NOTCH_GAP;
  return `M0 ${r}A${r} ${r} 0 0 1 ${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${top - step}A${step} ${step} 0 0 1 ${w - step} ${top}H${left + step}A${step} ${step} 0 0 0 ${left} ${top + step}V${h - step}A${step} ${step} 0 0 1 ${left - step} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}Z`;
}

/**
 * The same button as "Explore role" on the job cards, answering to its own hover. Each
 * property's own button opens the properties page on that property
 * (/properties?property=…): fixed per card, so it is always the shown one's.
 */
function ExploreButton({ href }: { href: string }) {
  return (
    <Link href={href} className={`group ${button.explore}`}>
      Explore opportunities
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 transition-transform duration-[220ms] ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
        <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/** The last resort, with no footage or photograph yet: a quiet tone of the brand, never pretending to be the place. */
function BrandSurface({ index, mark }: { index: number; mark: boolean }) {
  const lifted = index % 2 === 1;
  return (
    <div className={`absolute inset-0 overflow-hidden ${lifted ? "bg-properties-surface-raised" : "bg-properties-surface"}`}>
      {mark && (
        <InfinityMark fill="rgb(247 247 242 / 0.07)" className="absolute inset-0 m-auto aspect-square h-auto w-[34%]" />
      )}
    </div>
  );
}

/** A property's still: its poster or photograph, or else the branded surface. */
function Still({ property, index, sizes, mark = false }: { property: Destination; index: number; sizes: string; mark?: boolean }) {
  const src = property.posterSrc ?? property.imageSrc;
  if (src) return <Image src={src} alt="" fill sizes={sizes} className="object-cover" />;
  return <BrandSurface index={index} mark={mark} />;
}

/**
 * A property inside the frame: its media on a layer of its own, which the next
 * one's wipes across, its name, and the button in the notch. The still lies under
 * the video, so there is always a picture, whatever the video's state: it only
 * shows itself once it has a frame to show.
 */
function Property({ property, index }: { property: Destination; index: number }) {
  return (
    <article
      aria-label={`${property.name}, ${property.category}, ${property.city}, ${property.country}`}
      className="relative mx-auto mt-14 aspect-[9/16] w-[min(78vw,22rem)] in-data-[handoff=overlay]:absolute in-data-[handoff=overlay]:inset-0 in-data-[handoff=overlay]:mt-0 in-data-[handoff=overlay]:aspect-auto in-data-[handoff=overlay]:w-auto"
    >
      <div data-notched className="absolute inset-0 overflow-hidden rounded-[16px]">
        <div data-layer className="absolute inset-0 overflow-hidden">
          <div data-layer-inner className="absolute inset-0">
            <Still property={property} index={index} sizes="(min-width: 1024px) 440px, (orientation: landscape) and (min-width: 640px) 440px, 72vw" mark />
            {property.videoSrc && (
              <video
                data-video
                poster={property.posterSrc}
                muted
                loop
                playsInline
                preload="none"
                onLoadedData={(event) => {
                  event.currentTarget.dataset.ready = "true";
                }}
                className="absolute inset-0 size-full object-cover opacity-0 data-[ready=true]:opacity-100"
              >
                <source src={property.videoSrc} type="video/mp4" />
              </video>
            )}
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 bg-[linear-gradient(to_top,rgb(16_47_50/0.7),transparent)]" />
          </div>
        </div>
        {/* The name, low on the left, just above the button's step so that long names have the card's full width. */}
        <h3 data-name className="absolute bottom-[4.75rem] left-6 right-6 text-property font-semibold text-white">
          {property.name}
        </h3>
      </div>
      <div data-cta className="absolute bottom-0 right-0">
        <ExploreButton href={propertyHrefFor(property.id)} />
      </div>
    </article>
  );
}

/**
 * The properties section: "7 PROPERTIES — 4 cities — one Infinity world". A giant title
 * and a closed seven-layer deck; the title settles at the left over the four
 * cities, a short statement comes up at the right, and the deck unfolds, once,
 * into one fixed frame. Seven properties' media wipe across one another inside
 * that frame, with a filmstrip passing behind it. After the seventh the frame
 * folds back into the deck, once, and the next section rises over it.
 *
 * The frame's shell moves only in those two folds. Between them nothing touches
 * it: only the media, the name and the button's target change inside it.
 *
 * It is the foreground of the roles orbit's pinned scene (see JobCarousel),
 * waiting below the screen, clipped by its layer. The scene stays pinned for
 * `data-handoff-scroll` more screens, reporting progress through the block's
 * "handoff:progress" event, which drives this one timeline, reversible by
 * construction. Playback is not tied to the scroll: a video simply plays while
 * it is on screen, and only those and their neighbours load. Without any of this
 * (reduced motion, no JavaScript) everything sits in the page, one after another,
 * with ordinary video controls.
 *
 * Transforms never collide: the scroll moves the title's outer element, the
 * cursor only its letters (MagneticLetters).
 */
export function DestinationsShowcase() {
  const root = useRef<HTMLDivElement>(null);
  useMagneticLetters(root);

  useLayoutEffect(() => {
    const block = root.current;
    if (!block) return;
    const q = gsap.utils.selector(block);
    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: reduce)", () => {
      q<HTMLVideoElement>("[data-video]").forEach((video) => {
        video.controls = true;
      });
    });

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const title = q<HTMLElement>("[data-title]")[0];
      const slot = q<HTMLElement>("[data-label-slot]")[0];
      const frame = q<HTMLElement>("[data-frame]")[0];
      const notched = q<HTMLElement>("[data-notched]");
      const edge = q<SVGPathElement>("[data-edge-path]")[0];
      const edgeSvg = q<SVGSVGElement>("[data-edge]")[0];
      const layers = q<HTMLElement>("[data-layer]");
      const inners = q<HTMLElement>("[data-layer-inner]");
      const names = q<HTMLElement>("[data-name]");
      const ctas = q<HTMLElement>("[data-cta]");
      const deck = q<HTMLElement>("[data-deck]");
      const strip = q<HTMLElement>("[data-strip]")[0];
      const stripImages = q<HTMLElement>("[data-strip-image]");
      const cities = q<HTMLElement>("[data-city]");
      const statement = q<HTMLElement>("[data-statement]");
      const cityLabels = q<HTMLElement>("[data-city-label]");
      const parallax = q<HTMLElement>("[data-parallax]")[0];

      const cityOf = (i: number) => CITIES.indexOf(PROPERTIES[i].city);

      // The deck's two poses, per layer: closed, a neat stack; fanned, spread with a little depth.
      const place = (i: number) => i - (DECK_LAYERS - 1) / 2;
      const closed = (i: number) => ({ x: place(i) * 5, y: -(DECK_LAYERS - i) * 5, scale: DECK_SCALE, rotationY: 0, rotationZ: 0 });
      const fanned = (i: number, width: number) => ({
        x: place(i) * width * 0.17,
        y: -Math.abs(place(i)) * 4,
        scale: 0.62 - Math.abs(place(i)) * 0.012,
        rotationY: place(i) * -6,
        rotationZ: place(i) * 1.2,
      });

      // Below the screen, whole: the layer's clip keeps every pixel of it out of view.
      gsap.set(block, { yPercent: 100 });
      gsap.set(frame, { scale: DECK_SCALE });
      // Nearest the frame on top, so the fan opens evenly to both sides.
      deck.forEach((card, i) => gsap.set(card, { transformPerspective: 1200, zIndex: 5 - Math.floor(Math.abs(place(i))), ...closed(i) }));
      gsap.set(layers.slice(1), { clipPath: "inset(0% 0% 0% 100%)" });
      gsap.set(names, { autoAlpha: 0, y: 18 });
      gsap.set(ctas, { autoAlpha: 0 });
      gsap.set(cities, { autoAlpha: 0, y: 18 });
      gsap.set(cityLabels, { autoAlpha: 0, y: 10 });
      gsap.set(statement, { autoAlpha: 0, y: 35 });
      gsap.set(strip, { autoAlpha: 0 });

      /** Everything measured lives here: it is built afresh when the layout changes. */
      const build = () => {
        const timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
        const width = frame.offsetWidth;
        const height = frame.offsetHeight;
        const wide = isWideLayout();

        // The stepped silhouette, around the button, in exact pixels. On each property's own
        // element, not on the frame's shell, so that the wipe inside it is a separate clip.
        const cta = ctas[0].getBoundingClientRect();
        const scaleNow = frame.getBoundingClientRect().width / width;
        const path = silhouette(width, height, cta.width / scaleNow, cta.height / scaleNow);
        notched.forEach((el) => {
          el.style.clipPath = `path('${path}')`;
          el.style.borderRadius = "0";
        });
        edgeSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        edge.setAttribute("d", path);

        // orangeSlideUp: the title comes in from the right, at full size, behind the deck.
        timeline
          .addLabel("orangeSlideUp", 0)
          .to(block, { yPercent: 0, duration: SLIDE_UP }, 0)
          .fromTo(title, { x: window.innerWidth * 0.75 }, { x: 0, duration: SLIDE_UP, immediateRender: false }, 0);

        // titleTransform: one element, one transform. It stays a real heading: as large as the
        // room left of the frame allows, and the cities and the rest lay out beneath its size.
        const from = title.getBoundingClientRect();
        const to = slot.getBoundingClientRect();
        const fontSize = parseFloat(getComputedStyle(title).fontSize);
        // Beside the frame, its right edge on the frame's axis, so that the two read as one composition.
        // From the frame's final left edge: it may still be scaled down as the closed deck.
        const pageWidth = document.documentElement.clientWidth;
        const axis = (pageWidth - width) / 2 - FRAME_GAP;
        const margin = Math.min(to.left, pageWidth * 0.04);
        const room = wide ? axis - margin : pageWidth - to.left * 2;
        const settled = Math.min(wide ? TITLE_MAX : Math.min(44, pageWidth * 0.085), (room / from.width) * fontSize);
        const left = wide ? axis - (from.width * settled) / fontSize : to.left;
        block.style.setProperty("--title-settled", `${settled}px`);
        block.style.setProperty("--title-left", `${left}px`);
        timeline
          .addLabel("titleTransform", SLIDE_UP)
          .to(title, { x: left - from.left, y: to.top - from.top, scale: settled / fontSize, duration: FAN + CONVERGE, ease: "power1.inOut" }, SLIDE_UP);

        // deckUnfold: once. The layers spread, then converge behind the frame as it reaches its size.
        timeline.addLabel("deckUnfold", SLIDE_UP);
        deck.forEach((card, i) => {
          timeline
            .to(card, { ...fanned(i, width), duration: FAN, ease: "power1.out" }, SLIDE_UP)
            .to(card, { x: 0, y: 0, scale: 0.98, rotationY: 0, rotationZ: 0, duration: CONVERGE, ease: "power2.inOut" }, SLIDE_UP + FAN)
            .to(card, { autoAlpha: 0, duration: 0.001 }, FRAME_SET);
        });
        timeline
          .to(frame, { scale: 0.62, duration: FAN, ease: "power1.out" }, SLIDE_UP)
          .to(frame, { scale: 1, duration: CONVERGE, ease: "power2.inOut" }, SLIDE_UP + FAN)
          .to(names[0], { autoAlpha: 1, y: 0, duration: 0.14 }, FRAME_SET - 0.04)
          .to(ctas[0], { autoAlpha: 1, duration: 0.14 }, FRAME_SET - 0.04);

        // cityReveal, then statementReveal: as the title makes way.
        timeline
          .addLabel("cityReveal", SLIDE_UP + 0.34)
          .to(cityLabels, { autoAlpha: 1, y: 0, duration: 0.16, stagger: 0.1 }, SLIDE_UP + 0.34)
          .to(cities[cityOf(0)], { autoAlpha: 1, y: 0, duration: 0.18 }, SLIDE_UP + 0.38);
        timeline.addLabel("statementReveal", SLIDE_UP + 0.3);
        statement.forEach((part, i) => {
          timeline.to(part, { autoAlpha: 1, y: 0, duration: 0.2 }, SLIDE_UP + 0.3 + i * 0.07);
        });

        // filmstripEntrance: from beyond the right edge; the first image comes to rest behind the frame.
        const stepPx = stripImages[1].getBoundingClientRect().left - stripImages[0].getBoundingClientRect().left;
        const stripX = (i: number) => -i * stepPx;
        placeStrip = () => {
          const x = Number(gsap.getProperty(strip, "x"));
          stripImages.forEach((image, i) => {
            const fromCentre = (x + i * stepPx) / (pageWidth / 2);
            const away = Math.min(1, Math.abs(fromCentre));
            gsap.set(image, { rotationY: -gsap.utils.clamp(-1, 1, fromCentre) * 14, scale: 1 - away * 0.14 });
          });
        };
        timeline
          .addLabel("filmstripEntrance", STRIP_ENTERS_AT)
          .to(strip, { autoAlpha: 1, duration: 0.001 }, STRIP_ENTERS_AT)
          .fromTo(strip, { x: window.innerWidth / 2 + stepPx }, { x: stripX(0), duration: STRIP_ENTRANCE, ease: "power1.out", immediateRender: false }, STRIP_ENTERS_AT);

        // mediaProgress: the frame is left alone. The next media wipes across from the right as
        // the old one drifts left, the names change over, the strip moves on, the index follows.
        timeline.addLabel("mediaProgress", MEDIA_AT);
        layers.slice(1).forEach((layer, i) => {
          const at = MEDIA_AT + i * STEP;
          const move = { duration: WIPE, ease: "power1.inOut" };
          timeline
            .to(layer, { clipPath: "inset(0% 0% 0% 0%)", ...move }, at)
            .fromTo(inners[i + 1], { xPercent: 10 }, { xPercent: 0, ...move, immediateRender: false }, at)
            .to(inners[i], { xPercent: -6, ...move }, at)
            .to(strip, { x: stripX(i + 1), ...move }, at)
            .to(names[i], { autoAlpha: 0, y: -15, duration: 0.14 }, at + 0.04)
            .to(names[i + 1], { autoAlpha: 1, y: 0, duration: 0.16 }, at + 0.2)
            .to(ctas[i], { autoAlpha: 0, duration: 0.001 }, at + 0.2)
            .to(ctas[i + 1], { autoAlpha: 1, duration: 0.001 }, at + 0.2);
          if (cityOf(i) !== cityOf(i + 1)) {
            timeline
              .to(cities[cityOf(i)], { autoAlpha: 0, y: -14, duration: 0.14 }, at + 0.04)
              .to(cities[cityOf(i + 1)], { autoAlpha: 1, y: 0, duration: 0.16 }, at + 0.2);
          }
        });

        // deckFold: once, after the seventh, mirroring the opening. The strip draws in and
        // recedes, the layers come out from behind the frame, and all of it closes up.
        const last = PROPERTIES.length - 1;
        timeline
          .addLabel("deckFold", FOLD_AT)
          .to(stripImages, { x: (i: number) => -(i * stepPx + stripX(last)) * 0.8, duration: FOLD_FAN + 0.1, ease: "power1.in" }, FOLD_AT)
          .to(strip, { autoAlpha: 0, duration: FOLD_FAN, ease: "power1.out" }, FOLD_AT)
          .to(names[last], { autoAlpha: 0, y: -15, duration: 0.14 }, FOLD_AT)
          .to(ctas[last], { autoAlpha: 0, duration: 0.1 }, FOLD_AT);
        deck.forEach((card, i) => {
          timeline
            .to(card, { autoAlpha: 1, duration: 0.001 }, FOLD_AT)
            .to(card, { ...fanned(i, width), duration: FOLD_FAN, ease: "power1.inOut" }, FOLD_AT)
            .to(card, { ...closed(i), duration: FOLD_STACK, ease: "power2.inOut" }, FOLD_AT + FOLD_FAN);
        });
        timeline
          .to(frame, { scale: 0.62, duration: FOLD_FAN, ease: "power1.inOut" }, FOLD_AT)
          .to(frame, { scale: DECK_SCALE, duration: FOLD_STACK, ease: "power2.inOut" }, FOLD_AT + FOLD_FAN);

        // Closed: from here the deck holds, and the next section rises over it (in the page, not here).
        timeline.addLabel("closed", CLOSED_AT);
        // Timeline time is scrolled screens: the budget above holds exactly.
        timeline.to({}, { duration: 0.001 }, SCREENS - 0.001);
        return timeline;
      };

      // Playback follows what is on screen; the scroll only decides that. Only the
      // visible video or two ever play, and only they and their neighbours load.
      const videos = layers.map((layer) => layer.querySelector<HTMLVideoElement>("[data-video]"));
      let playing = "";
      const syncPlayback = (time: number) => {
        const onScreen = new Set<number>();
        if (time > 0 && time < SCREENS) {
          const step = Math.floor((time - MEDIA_AT) / STEP);
          const into = time - MEDIA_AT - step * STEP;
          const previous = Math.min(Math.max(step, 0), layers.length - 1);
          if (step < 0) onScreen.add(0);
          else if (step >= layers.length - 1) onScreen.add(layers.length - 1);
          else {
            onScreen.add(previous + (into < WIPE ? 0 : 1));
            if (into < WIPE) onScreen.add(previous + 1);
          }
        }
        const key = [...onScreen].join();
        if (key === playing) return;
        playing = key;
        videos.forEach((video, i) => {
          if (!video) return;
          const near = [...onScreen].some((visible) => Math.abs(visible - i) <= 1);
          if (near && video.preload !== "auto") video.preload = "auto";
          if (onScreen.has(i)) void video.play().catch(() => undefined); // Blocked or broken: its still stays.
          else if (!video.paused) video.pause();
        });
      };

      let timeline: gsap.core.Timeline | null = null;
      let progress = 0;
      /** Depth along the strip: the previews shrink and turn away from the centre. */
      let placeStrip = () => {};
      const onProgress = (event: Event) => {
        if (!(event instanceof CustomEvent) || typeof event.detail !== "number") return;
        progress = event.detail;
        timeline ??= build();
        timeline.progress(progress);
        placeStrip();
        syncPlayback(timeline.time());
      };
      const onRefresh = () => {
        if (!timeline) return;
        timeline.revert();
        timeline = build();
        timeline.progress(progress);
        placeStrip();
      };
      block.addEventListener("handoff:progress", onProgress);
      ScrollTrigger.addEventListener("refresh", onRefresh);

      // A few pixels of depth behind the frame, with the cursor. The frame itself never answers.
      const pointerFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const driftX = gsap.quickTo(parallax, "x", { duration: 0.9, ease: "power3.out" });
      const driftY = gsap.quickTo(parallax, "y", { duration: 0.9, ease: "power3.out" });
      const onPointer = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        driftX((event.clientX / window.innerWidth - 0.5) * -14);
        driftY((event.clientY / window.innerHeight - 0.5) * -8);
      };
      if (pointerFine) window.addEventListener("pointermove", onPointer, { passive: true });

      return () => {
        block.removeEventListener("handoff:progress", onProgress);
        ScrollTrigger.removeEventListener("refresh", onRefresh);
        window.removeEventListener("pointermove", onPointer);
        timeline?.revert();
        videos.forEach((video) => video?.pause());
        notched.forEach((el) => {
          el.style.removeProperty("clip-path");
          el.style.removeProperty("border-radius");
        });
      };
    });

    return () => media.revert();
  }, []);

  return (
    <div
      ref={root}
      data-handoff-rise
      data-handoff-scroll={SCREENS.toFixed(3)}
      data-handoff-cover={SLIDE_UP}
      className="relative flow-root overflow-clip bg-properties pb-12 [--frame-top:12rem] [--frame-w:min(66vw,29vh)] [--label-top:4.75rem] [--strip-h:15vh] [--strip-top:calc(var(--frame-top)+var(--frame-w)*0.85)] [--title-left:var(--gutter)] [--title-settled:2.75rem] wide:[--frame-top:calc(50%-var(--frame-w)*0.8889)] wide:[--frame-w:min(40.5vh,27.5rem)] wide:[--label-top:14vh] wide:[--strip-h:20vh] wide:[--strip-top:58vh] in-data-[handoff=overlay]:h-[calc(100vh+4px)] in-data-[handoff=overlay]:pb-0"
    >
      {/* Back to front: the giant title, the filmstrip, the deck, the frame.
          The title's place once it has settled, at the margin. */}
      <span data-label-slot aria-hidden="true" className="absolute left-(--gutter) top-(--label-top) hidden size-px in-data-[handoff=overlay]:block" />

      <div className="pointer-events-none flex items-center justify-center px-2 pt-28 in-data-[handoff=overlay]:absolute in-data-[handoff=overlay]:inset-0 in-data-[handoff=overlay]:px-0 in-data-[handoff=overlay]:pt-0">
        <h2 id="intro-title" data-title aria-label="7 Properties" className="origin-top-left whitespace-nowrap text-colossal font-bold text-neutral">
          <Letters text="7" /> <Letters text="PROPERTIES" />
        </h2>
      </div>

      {/* Where the frame is right now: one city, the active property's, under the settled title. */}
      <div className="mx-auto mt-6 w-fit text-neutral in-data-[handoff=overlay]:absolute in-data-[handoff=overlay]:left-(--title-left) in-data-[handoff=overlay]:top-[calc(var(--label-top)+var(--title-settled)*1.14+0.4rem)] in-data-[handoff=overlay]:z-20 in-data-[handoff=overlay]:mt-0 wide:in-data-[handoff=overlay]:top-[calc(var(--label-top)+var(--title-settled)*1.14+1.25rem)]">
        <p data-city-label className="text-label font-medium tracking-[0.16em] narrow:in-data-[handoff=overlay]:hidden">
          CURRENT DESTINATION
        </p>
        <div className="flex flex-wrap gap-x-4 text-[clamp(1.5rem,1rem+1.65vw,2.625rem)]/[1.1] font-medium tracking-[-0.012em] in-data-[handoff=overlay]:relative in-data-[handoff=overlay]:mt-1.5 in-data-[handoff=overlay]:block in-data-[handoff=overlay]:h-[1.15em] in-data-[handoff=overlay]:w-[8em]">
          {CITIES.map((city) => (
            <span key={city} data-city data-city-name={city} className="whitespace-nowrap in-data-[handoff=overlay]:absolute in-data-[handoff=overlay]:left-0 in-data-[handoff=overlay]:top-0">
              <Letters text={city.toUpperCase()} />
            </span>
          ))}
        </div>
        <p data-city-label className="mt-1 text-label font-medium tracking-[0.16em] narrow:in-data-[handoff=overlay]:hidden">
          ALBANIA
        </p>
      </div>

      {/* The statement, on the frame's other axis, level with its upper part. */}
      <div className="mx-auto mt-8 max-w-sm px-(--gutter) text-neutral in-data-[handoff=overlay]:absolute in-data-[handoff=overlay]:inset-x-(--gutter) in-data-[handoff=overlay]:top-[calc(var(--frame-top)+var(--frame-w)*1.7778+0.75rem)] in-data-[handoff=overlay]:z-20 in-data-[handoff=overlay]:mt-0 in-data-[handoff=overlay]:max-w-none in-data-[handoff=overlay]:px-0 wide:in-data-[handoff=overlay]:left-[calc(50%+var(--frame-w)/2+1.75rem)] wide:in-data-[handoff=overlay]:right-auto wide:in-data-[handoff=overlay]:top-[calc(var(--frame-top)+var(--frame-w)*0.28)] wide:in-data-[handoff=overlay]:w-[min(21rem,calc(50vw-var(--frame-w)/2-1.75rem-var(--gutter)))]">
        <h3 data-statement className="text-[clamp(1.25rem,0.1rem+2vw,2.25rem)]/[1.08] font-semibold tracking-[-0.018em] narrow:hidden">
          <span className="block">ONE WORLD.</span>
          <span className="block whitespace-nowrap">ENDLESS OPPORTUNITIES.</span>
        </h3>
        <p data-statement className="max-w-[34ch] text-[clamp(0.875rem,0.35rem+0.95vw,1.1875rem)]/[1.55] wide:mt-4">
          From luxury hotels and vibrant restaurants to iconic casinos and corporate teams, discover the places where your next career begins.
        </p>
      </div>

      {/* The filmstrip, secondary, behind the lower part of the frame. Its first image starts on the centre.
          Its wrapper answers to the cursor by a few pixels; the strip inside it to the scroll. */}
      <div data-parallax aria-hidden="true" className="hidden in-data-[handoff=overlay]:absolute in-data-[handoff=overlay]:inset-0 in-data-[handoff=overlay]:block">
        <div
          data-strip
          className="absolute left-[calc(50%-var(--strip-h)*0.39)] top-(--strip-top) flex gap-4 will-change-transform [perspective:900px]"
        >
          {PROPERTIES.map((property, index) => (
            <div key={property.id} data-strip-image className="relative aspect-[0.78] h-(--strip-h) shrink-0 overflow-hidden rounded-[8px] ring-1 ring-neutral/12">
              <Still property={property} index={index} sizes="200px" />
            </div>
          ))}
        </div>
      </div>

      {/* The other six layers of the deck, exactly the frame's size and place. */}
      {PROPERTIES.slice(1).map((property, index) => (
        <div
          key={property.id}
          data-deck
          aria-hidden="true"
          className="hidden overflow-hidden rounded-[16px] ring-1 ring-neutral/20 in-data-[handoff=overlay]:absolute in-data-[handoff=overlay]:left-[calc(50%-var(--frame-w)/2)] in-data-[handoff=overlay]:top-(--frame-top) in-data-[handoff=overlay]:block in-data-[handoff=overlay]:aspect-[9/16] in-data-[handoff=overlay]:w-(--frame-w)"
        >
          <Still property={property} index={index + 1} sizes="240px" />
        </div>
      ))}

      {/* The one frame. Seven properties pass through it; the shell itself moves only in the two folds. */}
      <div
        data-frame
        className="in-data-[handoff=overlay]:absolute in-data-[handoff=overlay]:left-[calc(50%-var(--frame-w)/2)] in-data-[handoff=overlay]:top-(--frame-top) in-data-[handoff=overlay]:z-10 in-data-[handoff=overlay]:aspect-[9/16] in-data-[handoff=overlay]:w-(--frame-w)"
      >
        {PROPERTIES.map((property, index) => (
          <Property key={property.id} property={property} index={index} />
        ))}
        {/* The glass edge, traced along the silhouette, as on the job cards. */}
        <svg data-edge aria-hidden="true" className="pointer-events-none absolute inset-0 hidden size-full overflow-visible in-data-[handoff=overlay]:block">
          <path data-edge-path fill="none" stroke="rgb(247 247 242 / 0.22)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

    </div>
  );
}
