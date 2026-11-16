import type { MouseEvent } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ROLES_SCENE } from "@/lib/carousel/orbit-scroll";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * "Open positions" links on the home page: to the roles orbit's scene (where it
 * pins), not to the section's top, which lies inside the pinned scroll. Anywhere
 * else, or before that scene exists, the link's own href (/#roles) is followed.
 */
export function showRoles(event: MouseEvent<HTMLAnchorElement>) {
  const roles = document.getElementById("roles");
  const scene = ScrollTrigger.getById(ROLES_SCENE);
  if (!roles || !scene) return;
  event.preventDefault();
  window.scrollTo({ top: scene.start, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  roles.focus({ preventScroll: true });
}
