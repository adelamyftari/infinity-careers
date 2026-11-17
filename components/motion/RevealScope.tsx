"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll reveals for the editorial pages (/company, /contact), declared in the markup so the
 * sections themselves stay server components:
 *
 * - `data-line`: a headline line rising out of its mask (wrap it in `overflow-hidden`).
 * - `data-reveal`: a block fading up; siblings inside one `data-group` follow each other.
 * - `data-mask`: an image unveiled from below by a clip, its picture settling as it opens.
 * - `data-drift="<percent>"`: a gentle parallax while it crosses the screen.
 *
 * `intro` plays the first screen's reveals at once, as the page arrives, instead of on scroll.
 * Blocks fade with opacity only, never visibility: a link or a field waiting to be revealed can
 * still take keyboard focus (focus scrolls it into view, which reveals it).
 * With reduced motion nothing moves: everything is simply there. All triggers are removed when
 * the page goes (or is kept hidden for Back/Forward).
 */
export function RevealScope({ children, intro = false, className, as: Tag = "div", ...rest }: { children: ReactNode; intro?: boolean; className?: string; as?: "div" | "section" | "main" } & Record<`data-${string}`, string | boolean | undefined> & { "aria-labelledby"?: string; id?: string }) {
  const root = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(el);
      const lines = q<HTMLElement>("[data-line]");
      const blocks = q<HTMLElement>("[data-reveal]");
      const masks = q<HTMLElement>("[data-mask]");

      const pictures = (list: HTMLElement[]) => list.map((m) => m.querySelector("img")).filter((img): img is HTMLImageElement => !!img);
      if (intro) {
        // Only what this screen has (a hero without a photograph has no mask to open).
        const timeline = gsap.timeline({ defaults: { ease: EASE } });
        if (lines.length) timeline.fromTo(lines, { yPercent: 108 }, { yPercent: 0, duration: 1.05, stagger: 0.1 }, 0.1);
        if (blocks.length) timeline.fromTo(blocks, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0);
        if (masks.length) timeline.fromTo(masks, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.inOut" }, 0.3);
        if (pictures(masks).length) timeline.fromTo(pictures(masks), { scale: 1.14 }, { scale: 1, duration: 1.8 }, 0.3);
      } else {
        // Lines and blocks, by the group they belong to: one trigger each, its members in turn.
        const groups = new Map<Element, HTMLElement[]>();
        for (const item of [...lines, ...blocks]) {
          const group = item.closest("[data-group]") ?? item;
          groups.set(group, [...(groups.get(group) ?? []), item]);
        }
        for (const [group, items] of groups) {
          const timeline = gsap.timeline({ defaults: { ease: EASE }, scrollTrigger: { trigger: group, start: "top 86%", once: true } });
          items.forEach((item, i) =>
            timeline.fromTo(item, item.hasAttribute("data-line") ? { yPercent: 108 } : { opacity: 0, y: 22 }, item.hasAttribute("data-line") ? { yPercent: 0, duration: 1 } : { opacity: 1, y: 0, duration: 0.85 }, i * 0.08),
          );
        }
        for (const mask of masks) {
          const timeline = gsap
            .timeline({ scrollTrigger: { trigger: mask, start: "top 88%", once: true } })
            .fromTo(mask, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.25, ease: "expo.inOut" }, 0);
          const img = pictures([mask]);
          if (img.length) timeline.fromTo(img, { scale: 1.14 }, { scale: 1, duration: 1.7, ease: EASE }, 0);
        }
      }

      for (const item of q<HTMLElement>("[data-drift]")) {
        const amount = Number(item.dataset.drift) || 8;
        gsap.fromTo(item, { yPercent: -amount }, { yPercent: amount, ease: "none", scrollTrigger: { trigger: item.parentElement ?? item, start: "top bottom", end: "bottom top", scrub: true } });
      }
    });
    return () => media.revert();
  }, [intro]);

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        root.current = node;
      }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}
