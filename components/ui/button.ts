/**
 * The site's button hierarchy, as class strings so they work on a <button>,
 * a <Link> or a <span> alike. Focus comes from the global :focus-visible ring.
 * Hover turns a button Infinity Yellow, with Deep Blue text.
 *
 * - action: the hero's one big action. Built into the search bar.
 * - primary: the same voice at standard size.
 * - secondary: "Explore role". It lives inside a card that is the link, so it
 *   answers to that link: the parent needs `group`.
 * - explore: "Explore opportunities", on the dark properties section: the secondary
 *   button's shape, as a link of its own, light so that it stands clear of the field.
 * - tertiary: quiet actions. Text and icon only.
 *
 * The Menu pill is its own shape, and shares these tokens and timings.
 */
const BASE =
  "inline-flex cursor-pointer items-center whitespace-nowrap rounded-button duration-[220ms] ease-out disabled:pointer-events-none disabled:opacity-40";

export const button = {
  action: `${BASE} h-12 gap-3 bg-primary px-5 text-button font-semibold text-neutral transition-colors hover:bg-accent hover:text-primary active:bg-accent active:text-primary lg:h-14 lg:px-6`,
  search: `${BASE} h-12 gap-3 bg-accent px-5 text-button font-semibold text-petrol transition-colors hover:bg-petrol hover:text-white active:bg-petrol active:text-white lg:h-14 lg:px-6`,
  primary: `${BASE} h-11 gap-2.5 bg-primary px-5 text-button font-semibold text-neutral transition-colors hover:bg-accent hover:text-primary active:bg-accent active:text-primary`,
  secondary: `${BASE} h-11 justify-center bg-petrol text-button font-medium text-white transition-colors group-hover:bg-accent group-hover:text-petrol group-active:bg-accent group-active:text-petrol group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-petrol`,
  explore: `${BASE} pointer-events-auto h-11 justify-center gap-1.5 bg-petrol px-4 text-button font-medium text-white transition-colors hover:bg-accent hover:text-petrol active:bg-accent active:text-petrol`,
  tertiary: `${BASE} h-11 gap-2.5 px-4 text-button font-medium text-primary transition-opacity hover:opacity-70 active:opacity-55`,
};
