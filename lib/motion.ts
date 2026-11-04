/** The one easing curve, shared with CSS (`ease-premium` in globals.css). */
export const EASE = "expo.out";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/**
 * Read at the moment of use, in effects and handlers. Unlike the hook, this
 * is correct during the hydration commit.
 */
export const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
export const hasFinePointer = () => window.matchMedia(FINE_POINTER).matches;
