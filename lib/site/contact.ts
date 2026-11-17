/**
 * Infinity Careers' public contact details, for the footer.
 *
 * Only confirmed details belong here; none may be invented. The email
 * address and telephone number appear under the footer's description once set.
 */
export type SocialLink = { label: string; href: string };

export const CONTACT: { email?: string; phone?: string } = {};

/**
 * The footer's FOLLOW US column, in its order. A channel without a confirmed
 * `href` is shown as plain text, not a link: add its profile URL
 * (e.g. href: "https://www.instagram.com/…") and it becomes one.
 */
export type SocialChannel = { label: string; href?: string };

export const SOCIALS: SocialChannel[] = [{ label: "Instagram" }, { label: "Facebook" }, { label: "LinkedIn" }];

/** Legal pages, once they exist (e.g. { label: "Privacy Policy", href: "/privacy" }). */
export const LEGAL_LINKS: SocialLink[] = [];

/**
 * The headquarters, as supplied by Infinity for the contact page. No email address and no
 * opening hours have been confirmed, so none are shown.
 */
export const HEADQUARTERS_CONTACT = {
  organization: "Infinity Investment Group",
  label: "Headquarters",
  street: "Dervish Hima, Arena Center, Floor 2",
  city: "Tirana, Albania 1001",
  phone: "+355 69 40 89 112",
  phoneHref: "tel:+355694089112",
  /**
   * The Air Albania Stadium building, which houses Arena Center, on Rruga Dervish Hima: geocoded
   * with OpenStreetMap Nominatim (relation 10311002, "Air Albania Stadium, Rruga Dervish Hima").
   * Arena Center itself has no entry of its own in OpenStreetMap, so the pin marks its building.
   */
  position: { lat: 41.3183889, lng: 19.8245757 },
  /** "Open in maps": Google's documented Maps URL for the verified point; on a phone it opens the maps app. */
  mapsHref: "https://www.google.com/maps/search/?api=1&query=41.3183889%2C19.8245757",
} as const;
