/**
 * Placeholder openings until the jobs API exists. Filter options are derived
 * from this list (lib/careers/filters.ts), so the two can never disagree.
 */

export type CategoryId = "casino" | "hotel" | "restaurant" | "spa" | "bar" | "hospitality";

export type Category = {
  label: string;
  /** The career group the category belongs to. */
  group: string;
  /** Hover outline and artwork tint: refined tones that hold up over photography. */
  accent: string;
};

export const CATEGORIES: Record<CategoryId, Category> = {
  casino: { label: "Casino", group: "Gaming", accent: "#d9a632" },
  hotel: { label: "Hotel", group: "Rooms", accent: "#5b86e0" },
  restaurant: { label: "Restaurant", group: "Food & Beverage", accent: "#d9643c" },
  spa: { label: "Spa", group: "Wellness", accent: "#8fbf9b" },
  bar: { label: "Bar & Lounge", group: "Food & Beverage", accent: "#9a76d6" },
  hospitality: { label: "Hospitality", group: "Guest Experience", accent: "#d8c3a0" },
};

/** Placeholder photography until real property imagery exists. */
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=80`;

export const EXPERIENCE_LEVELS = ["Entry level", "Mid level", "Senior", "Leadership"] as const;

export type Job = {
  slug: string;
  title: string;
  category: CategoryId;
  property: string;
  location: string;
  department: string;
  experience: (typeof EXPERIENCE_LEVELS)[number];
  type: "Full time" | "Part time" | "Seasonal";
  summary: string;
  /** Photography; the detail page falls back to generated artwork without it. */
  image?: string;
};

export const JOBS: Job[] = [
  {
    slug: "casino-host",
    title: "Casino Host",
    category: "casino",
    property: "Infinity Casino",
    location: "Downtown",
    department: "Guest Services",
    experience: "Mid level",
    type: "Full time",
    summary: "Build lasting relationships with our guests and craft evenings they come back for.",
    image: photo("1596838132731-3301c3fd4317"),
  },
  {
    slug: "front-desk-agent",
    title: "Front Desk Agent",
    category: "hotel",
    property: "Infinity Grand Hotel",
    location: "Downtown",
    department: "Front Office",
    experience: "Entry level",
    type: "Full time",
    summary: "Be the first welcome: arrivals, check-ins and the small details that make a stay.",
    image: photo("1551882547-ff40c63fe5fa"),
  },
  {
    slug: "restaurant-manager",
    title: "Restaurant Manager",
    category: "restaurant",
    property: "Infinity Resort",
    location: "Waterfront",
    department: "Service",
    experience: "Leadership",
    type: "Full time",
    summary: "Lead the floor of our signature restaurant, from the team briefing to the last table.",
    image: photo("1517248135467-4c7edcad34c4"),
  },
  {
    slug: "spa-therapist",
    title: "Spa Therapist",
    category: "spa",
    property: "Infinity Resort",
    location: "Waterfront",
    department: "Wellness",
    experience: "Mid level",
    type: "Part time",
    summary: "Deliver restorative treatments in a calm, carefully designed wellness space.",
    image: photo("1544161515-4ab6ce6db874"),
  },
  {
    slug: "bartender",
    title: "Bartender",
    category: "bar",
    property: "Infinity Lounge",
    location: "Old Town",
    department: "Bar",
    experience: "Mid level",
    type: "Full time",
    summary: "Mix, pour and host behind one of the city's most considered bars.",
    image: photo("1470337458703-46ad1756a187"),
  },
  {
    slug: "guest-relations",
    title: "Guest Relations",
    category: "hospitality",
    property: "Infinity Grand Hotel",
    location: "Downtown",
    department: "Guest Relations",
    experience: "Mid level",
    type: "Full time",
    summary: "Anticipate needs, solve the unexpected and turn guests into regulars.",
    image: photo("1520250497591-112f2f40a3f4"),
  },
  {
    slug: "table-games-dealer",
    title: "Table Games Dealer",
    category: "casino",
    property: "Infinity Casino",
    location: "Downtown",
    department: "Gaming Operations",
    experience: "Entry level",
    type: "Part time",
    summary: "Run the game with precision and charm; full training on every table provided.",
    image: photo("1511193311914-0346f16efe90"),
  },
  {
    slug: "housekeeping-supervisor",
    title: "Housekeeping Supervisor",
    category: "hotel",
    property: "Infinity Resort",
    location: "Waterfront",
    department: "Housekeeping",
    experience: "Senior",
    type: "Full time",
    summary: "Set the standard for every room and guide a team that takes pride in the detail.",
    image: photo("1590490360182-c33d57733427"),
  },
  {
    slug: "sous-chef",
    title: "Sous Chef",
    category: "restaurant",
    property: "Infinity Grand Hotel",
    location: "Downtown",
    department: "Kitchen",
    experience: "Senior",
    type: "Full time",
    summary: "Run the pass alongside our head chef and shape a seasonal, produce-led menu.",
    image: photo("1577219491135-ce391730fb2c"),
  },
  {
    slug: "spa-receptionist",
    title: "Spa Receptionist",
    category: "spa",
    property: "Infinity Resort",
    location: "Waterfront",
    department: "Wellness",
    experience: "Entry level",
    type: "Seasonal",
    summary: "Welcome guests into the spa and keep every treatment day flowing gently.",
    image: photo("1540555700478-4be289fbecef"),
  },
  {
    slug: "head-mixologist",
    title: "Head Mixologist",
    category: "bar",
    property: "Infinity Lounge",
    location: "Old Town",
    department: "Bar",
    experience: "Leadership",
    type: "Full time",
    summary: "Own the cocktail programme, from menu development to training the team.",
    image: photo("1572116469696-31de0f17cc34"),
  },
  {
    slug: "vip-concierge",
    title: "VIP Concierge",
    category: "hospitality",
    property: "Infinity Casino",
    location: "Downtown",
    department: "Guest Relations",
    experience: "Senior",
    type: "Full time",
    summary: "Curate private experiences for our most valued guests, discreetly and impeccably.",
    image: photo("1542314831-068cd1dbfeeb"),
  },
];

export function getJob(slug: string) {
  return JOBS.find((job) => job.slug === slug);
}
