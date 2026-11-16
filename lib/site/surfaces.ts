/**
 * The site's dotted Warm White field, as the footer draws it: tiny dots in
 * --dot (Dark Forest Teal at 16%), 1.2px, every 28px, fixed to the viewport so
 * every surface that uses it lines up with the page canvas and with each other.
 * Lay it over a `bg-neutral` surface as its own absolute layer.
 */
export const DOTTED_FIELD = "bg-[radial-gradient(circle,var(--dot)_1.2px,transparent_1.2px)] bg-size-[28px_28px] bg-fixed";
