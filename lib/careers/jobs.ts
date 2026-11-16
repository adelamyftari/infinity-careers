/**
 * Job listings: the openings the public site shows and the search filters
 * (lib/careers/filters.ts). Each points at a catalog position
 * (lib/careers/taxonomy.ts) and a property (lib/careers/properties.ts); this
 * list stands in for the HR dashboard's data until it exists, and has the same
 * shape that dashboard will write.
 *
 * The hero's carousel shows the roles Infinity has photographed (public/images):
 * the openings below, each with its own photograph, and the roles pictured
 * without an opening yet (ROLE_PREVIEWS), whose cards lead to all open
 * positions rather than to a listing of their own.
 */

import type { City, PropertyId } from "./properties";
import { getCareersProperty } from "./properties";
import { getDepartment, getPosition, type CareerGroup, type DepartmentId, type EmploymentType, type ExperienceLevel } from "./taxonomy";

export type CategoryId = "casino" | "hotel" | "restaurant" | "spa" | "bar" | "hospitality";

export type Category = {
  label: string;
  /** The career group the category belongs to. */
  group: string;
  /** Tags and artwork tint: one colour for all, so the label's text is what tells them apart. */
  accent: string;
};

const CATEGORY_ACCENT = "#102f32";

export const CATEGORIES: Record<CategoryId, Category> = {
  casino: { label: "Casino", group: "Gaming", accent: CATEGORY_ACCENT },
  hotel: { label: "Hotel", group: "Rooms", accent: CATEGORY_ACCENT },
  restaurant: { label: "Restaurant", group: "Food & Beverage", accent: CATEGORY_ACCENT },
  spa: { label: "Spa", group: "Wellness", accent: CATEGORY_ACCENT },
  bar: { label: "Bar & Lounge", group: "Food & Beverage", accent: CATEGORY_ACCENT },
  hospitality: { label: "Hospitality", group: "Guest Experience", accent: CATEGORY_ACCENT },
};

/** Only `published` listings are shown, counted and searchable on the public site. */
export const JOB_STATUSES = ["draft", "published", "closed", "archived"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * A job listing: an opening HR has created for a catalog position at a
 * property. Experience level and contract types are set per listing by HR,
 * never derived from the title; a value HR has not confirmed stays empty
 * (`null`, `[]`) and the listing then matches only "All" for that filter.
 */
export type Job = {
  id: string;
  /** Its page: /jobs/<slug>. */
  slug: string;
  /** The catalog position it is for (lib/careers/taxonomy.ts). */
  positionId: string;
  /** As advertised; may differ from the position's catalog title. */
  title: string;
  propertyId: PropertyId | null;
  /** The property's city: kept with the listing, and always the property's own city. */
  location: City | null;
  careerGroup: CareerGroup;
  departmentId: DepartmentId;
  experienceLevel: ExperienceLevel | null;
  employmentTypes: EmploymentType[];
  status: JobStatus;
  /** ISO date, set when HR publishes it. */
  publishedAt: string | null;
  summary: string;
  description?: string;
  /** The card's tag and artwork motif. */
  category: CategoryId;
  /** Photography; the detail page falls back to generated artwork without it. */
  image?: string;
  /** Where its subject stands, as CSS object-position, so the card's crop keeps it (default: centred). */
  imagePosition?: string;
};

/**
 * The site's existing placeholder listings, carried over unchanged in title,
 * copy and photography. Their former properties and locations ("Infinity
 * Grand Hotel", "Downtown"…) were not real properties, so they are unassigned
 * here until HR places them; levels and contract types were renamed to the new
 * terms where the meaning is the same ("Mid level" → Intermediate), and left
 * for HR where it is not ("Leadership"). HR to confirm each before launch.
 */
export const JOBS: Job[] = [
  {
    id: "job-hotel-receptionist",
    slug: "front-desk-agent",
    positionId: "casino.reception.receptionist",
    title: "Hotel Receptionist",
    propertyId: null,
    location: null,
    careerGroup: "hotel",
    departmentId: "reception",
    experienceLevel: "Entry Level",
    employmentTypes: ["Full-time"],
    status: "published",
    publishedAt: null,
    category: "hotel",
    summary: "Be the first welcome: arrivals, check-ins and the small details that make a stay.",
    image: "/images/hotel reception.png",
  },
  {
    id: "job-restaurant-manager",
    slug: "restaurant-manager",
    positionId: "restaurant.restaurant-management.restaurant-manager",
    title: "Restaurant Manager",
    propertyId: null,
    location: null,
    careerGroup: "restaurant",
    departmentId: "restaurant-management",
    experienceLevel: null,
    employmentTypes: ["Full-time"],
    status: "published",
    publishedAt: null,
    category: "restaurant",
    summary: "Lead the floor of our signature restaurant, from the team briefing to the last table.",
    image: "/images/Restaurant Manager.png",
    imagePosition: "50% 25%",
  },
  {
    id: "job-casino-bartender",
    slug: "casino-bartender",
    positionId: "casino.food-beverage.bartender",
    title: " Casino Bartender",
    propertyId: null,
    location: null,
    careerGroup: "casino",
    departmentId: "food-beverage",
    experienceLevel: "Intermediate",
    employmentTypes: ["Full-time"],
    status: "published",
    publishedAt: null,
    category: "bar",
    summary: "Mix, pour and host behind one of the city's most considered bars.",
    image: "/images/Barteder.jpg",
    imagePosition: "50% 30%",
  },
  {
    id: "job-table-games-dealer",
    slug: "table-games-dealer",
    positionId: "casino.live-game.dealer",
    title: "Table Games Dealer",
    propertyId: null,
    location: null,
    careerGroup: "casino",
    departmentId: "live-game",
    experienceLevel: "Entry Level",
    employmentTypes: ["Part-time"],
    status: "published",
    publishedAt: null,
    category: "casino",
    summary: "Run the game with precision and charm; full training on every table provided.",
    image: "/images/Dealer.jpeg",
  },
  {
    id: "job-sous-chef",
    slug: "sous-chef",
    positionId: "casino.food-beverage.sous-chef",
    title: "Sous Chef",
    propertyId: null,
    location: null,
    careerGroup: "restaurant",
    departmentId: "food-beverage",
    experienceLevel: "Senior",
    employmentTypes: ["Full-time"],
    status: "published",
    publishedAt: null,
    category: "restaurant",
    summary: "Run the pass alongside our head chef and shape a seasonal, produce-led menu.",
    image: "/images/chef.jpg",
    imagePosition: "50% 35%",
  },
];

/** The listings the public site shows: published ones only. */
export function openJobs(jobs: readonly Job[] = JOBS): Job[] {
  return jobs.filter((job) => job.status === "published");
}

export function getJob(slug: string) {
  return JOBS.find((job) => job.slug === slug);
}

/** A role Infinity has photographed but has no opening for yet. */
export type RolePreview = {
  id: string;
  title: string;
  category: CategoryId;
  /** The career group it is pictured in. It has no property, department, level or contract type. */
  careerGroup: CareerGroup;
  /** The catalog position it pictures (lib/careers/taxonomy.ts): its card on /roles. */
  positionId: string;
  image: string;
  imagePosition?: string;
};

export const ROLE_PREVIEWS: RolePreview[] = [
  { id: "casino-receptionist", positionId: "casino.reception.receptionist", careerGroup: "casino", title: "Casino Receptionist", category: "casino", image: "/images/Casino Recepsionit.jpg" },
  { id: "casino-waiter", positionId: "casino.food-beverage.waiter", careerGroup: "casino", title: "Casino Waiter", category: "casino", image: "/images/Casino Waiter.jpeg", imagePosition: "50% 45%" },
  { id: "slot-attendant", positionId: "casino.slot-game.slot-attendant", careerGroup: "casino", title: "Slot Attendant", category: "casino", image: "/images/Slot attedant.jpg" },
  { id: "waiter", positionId: "restaurant.restaurant-service.waiter", careerGroup: "restaurant", title: "Waiter", category: "restaurant", image: "/images/Waiter.JPG", imagePosition: "50% 30%" },
  { id: "kitchen-assistant", positionId: "restaurant.kitchen.commis", careerGroup: "restaurant", title: "Kitchen Assistant", category: "restaurant", image: "/images/Kitchen Assistant.jpeg" },
  { id: "restaurant-bartender", positionId: "restaurant.bar-operations.bartender", careerGroup: "restaurant", title: "Restaurant Bartender", category: "restaurant", image: "/images/DSC_1716.jpg" },
];

/** One card in the hero carousel: an opening (to its page) or a pictured role (to all open positions). */
export type CarouselRole = {
  key: string;
  title: string;
  /** The line under the title in the carousel's index: the opening's property (or department, until it has one), or the role's career group. */
  subtitle: string;
  category: CategoryId;
  image?: string;
  imagePosition?: string;
  /** Its opening, when it has one. */
  job?: Job;
  /** Its card on the positions page (/roles?role=…): the opening's slug, or the pictured position's id. */
  roleId: string;
};

/** The order the carousel shows them in, mixing the openings and the pictured roles across the floor. */
const CAROUSEL_ORDER = [
  "table-games-dealer",
  "front-desk-agent",
  "restaurant-manager",
  "casino-receptionist",
  "bartender",
  "waiter",
  "slot-attendant",
  "sous-chef",
  "casino-waiter",
  "kitchen-assistant",
  "restaurant-bartender",
];

export function carouselRoles(jobs: Job[], previews: RolePreview[]): CarouselRole[] {
  const roles: CarouselRole[] = [
    ...jobs.map((job) => ({ key: job.slug, title: job.title, subtitle: job.propertyId ? getCareersProperty(job.propertyId).name : getDepartment(job.departmentId).name, category: job.category, image: job.image, imagePosition: job.imagePosition, job, roleId: job.slug })),
    ...previews.map((role) => ({ key: role.id, title: role.title, subtitle: CATEGORIES[role.category].group, category: role.category, image: role.image, imagePosition: role.imagePosition, roleId: role.positionId })),
  ];
  const rank = (key: string) => {
    const i = CAROUSEL_ORDER.indexOf(key);
    return i < 0 ? CAROUSEL_ORDER.length : i;
  };
  return roles.sort((a, b) => rank(a.key) - rank(b.key));
}

/**
 * What is wrong with a listing, for the HR form to show before it is saved
 * (empty when it is consistent): the position, department, career group,
 * property and city must agree, and a published listing needs its level,
 * contract types and publication date.
 */
export function listingProblems(job: Job): string[] {
  const problems: string[] = [];
  const position = getPosition(job.positionId);
  if (!position) problems.push(`Unknown position: ${job.positionId}`);
  else if (position.departmentId !== job.departmentId) problems.push(`The position belongs to ${getDepartment(position.departmentId).name}, not ${getDepartment(job.departmentId).name}`);
  if (!(getDepartment(job.departmentId).groups as readonly CareerGroup[]).includes(job.careerGroup)) problems.push(`${getDepartment(job.departmentId).name} does not serve the ${job.careerGroup} group`);
  if (job.propertyId && getCareersProperty(job.propertyId).city !== job.location) problems.push(`The location must be the property's city, ${getCareersProperty(job.propertyId).city}`);
  if (!job.propertyId && job.location) problems.push("A location needs a property");
  if (job.status === "published") {
    if (!job.experienceLevel) problems.push("Experience level not set");
    if (job.employmentTypes.length === 0) problems.push("Employment type not set");
    if (!job.publishedAt) problems.push("Publication date not set");
    if (!job.propertyId) problems.push("Property not set");
  }
  return problems;
}
