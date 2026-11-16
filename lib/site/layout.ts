/**
 * When a section uses its side-by-side composition: from 1024px, or on any landscape screen from
 * 640px (a phone on its side). The `wide:` / `narrow:` variants in app/globals.css are the same query.
 */
export const WIDE_LAYOUT = "(min-width: 1024px), (orientation: landscape) and (min-width: 640px)";

export const isWideLayout = () => window.matchMedia(WIDE_LAYOUT).matches;
