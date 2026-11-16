/**
 * The Infinity Advantage: the employee benefits, one chapter each, in this order.
 *
 * PROVISIONAL, FOR HR REVIEW BEFORE PUBLICATION: these are proposed messages,
 * not confirmed entitlements. Edit here; titles are written in capitals as shown.
 */
export type Benefit = {
  title: string;
  description: string;
};

export const BENEFITS: Benefit[] = [
  {
    title: "COMPETITIVE SALARIES",
    description:
      "We offer competitive salaries that reflect your experience, skills, and contribution. At Infinity, your work is recognized with fair compensation designed to support long-term motivation, stability, and professional confidence.",
  },
  {
    title: "PERFORMANCE BONUSES",
    description:
      "Exceptional effort deserves meaningful reward. Our performance bonus structure recognizes results, consistency, and dedication, giving team members extra motivation while celebrating the impact they bring to the business.",
  },
  {
    title: "TRAINING & DEVELOPMENT",
    description:
      "We invest in your growth through practical learning, on-the-job development, and opportunities to strengthen your professional skills. Infinity supports continuous improvement so you can build a stronger future with confidence.",
  },
];
