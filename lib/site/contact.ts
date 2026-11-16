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
