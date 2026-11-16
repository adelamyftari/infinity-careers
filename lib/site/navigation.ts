import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ROLES_SCENE } from "@/lib/carousel/orbit-scroll";

/**
 * The home page's sections the main menu can take the visitor to, and where
 * each one is on the page. The open positions and the 7 Properties showcase
 * both live inside the roles orbit's pinned scroll scene (JobCarousel), so
 * their places are read from that scene rather than from their elements, which
 * sit inside the pin. Without the scene (reduced motion, before it exists) the
 * elements are where they appear.
 */
export type HomeSection = "home" | "properties" | "positions";

/** Past the point the showcase covers the cards, so its title has settled (screens). */
const PROPERTIES_SETTLE = 0.15;

const elementTop = (selector: string) => {
  const el = document.querySelector(selector);
  // Less its scroll margin, as an anchor jump would (room for the header).
  return el ? el.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) : null;
};

/** Where a section starts on the page (scroll px), or null when it is not on this page. */
export function sectionTop(section: HomeSection): number | null {
  if (section === "home") return 0;
  if (!document.getElementById("roles")) return null;
  const scene = ScrollTrigger.getById(ROLES_SCENE);
  if (section === "positions") return scene ? scene.start : elementTop("#roles");
  const block = document.querySelector<HTMLElement>("[data-handoff-rise]");
  if (scene && block) {
    const screens = Number(block.dataset.handoffScroll ?? 0);
    const cover = Number(block.dataset.handoffCover ?? 0);
    // The handoff begins `screens` before the scene's end; the cards are covered `cover` into it.
    return scene.end - window.innerHeight * (screens - cover - PROPERTIES_SETTLE);
  }
  return elementTop("[data-handoff-layer]");
}

/** Which section the page is showing now. */
export function currentSection(): HomeSection {
  const y = window.scrollY + 2;
  const properties = sectionTop("properties");
  const positions = sectionTop("positions");
  if (properties !== null && y >= properties) return "properties";
  if (positions !== null && y >= positions) return "positions";
  return "home";
}

/** Goes to a section at once (the menu covers the move). Returns false when it is not on this page. */
export function jumpToSection(section: HomeSection) {
  const top = sectionTop(section);
  if (top === null) return false;
  window.scrollTo({ top, behavior: "instant" });
  if (section === "positions") document.getElementById("roles")?.focus({ preventScroll: true });
  return true;
}

/**
 * A section asked for from another page: held until the home page's scene is
 * ready, as the property filter request is (lib/careers/property-filter.ts).
 */
let pending: HomeSection | null = null;

export function requestSection(section: HomeSection) {
  pending = section;
}

/** Takes a held request once the home page can answer it; returns a cleanup. */
export function onSectionRequest() {
  if (pending === null) return () => {};
  const section = pending;
  pending = null;
  let tries = 0;
  const timer = window.setInterval(() => {
    tries++;
    const ready = section === "home" || ScrollTrigger.getById(ROLES_SCENE) || (tries > 20 && document.getElementById("roles"));
    if (!ready && tries < 60) return;
    window.clearInterval(timer);
    // One frame more, so the scene's last refresh has placed it.
    requestAnimationFrame(() => jumpToSection(section));
  }, 100);
  return () => window.clearInterval(timer);
}
