/**
 * Infinity's seven properties and its headquarters, as the /properties page
 * shows them: the map's eight locations, the property card and its gallery all
 * come from here.
 *
 * Only verified facts live here. Positions and addresses come from the
 * OpenStreetMap feature named in `source`; nothing is estimated. A location
 * without a verified `position` is placed at its city's own point from the
 * map's data (city-level precision), marked as such, until coordinates are
 * supplied.
 *
 * The order is the properties' order: Grand Casino Tirana, Grand Panevino,
 * Arena Casino, Hotel Butrinti, Grand Casino Durrës, International Casino
 * Tirana, Royal Casino Korçë. The headquarters is a location, not a property.
 */

import { openJobs } from "@/lib/careers/jobs";
import type { PropertyId } from "@/lib/careers/properties";
import type { DepartmentId } from "@/lib/careers/taxonomy";

export type PropertyCategory = "casino" | "hotel" | "restaurant" | "administration";

export const PROPERTY_CATEGORY_LABEL: Record<PropertyCategory, string> = {
  casino: "Casino",
  hotel: "Hotel",
  restaurant: "Restaurant",
  administration: "Administration",
};

export type PropertyImage = { src: string; alt: string };

export type Property = {
  id: string;
  /** Its address on the properties page: /properties?property=<slug>. Stable: links are shared. */
  slug: string;
  name: string;
  category: PropertyCategory;
  city: string;
  /**
   * Its id in the careers property catalog (lib/careers/properties.ts), which
   * job listings point at (`Job.propertyId`). Open-role counts and the open
   * positions link both key on it.
   */
  jobProperty: PropertyId;
  /** Where it is, more precisely than its city, for its card (otherwise "<city>, Albania"). */
  place?: string;
  /** The organisation it belongs to, where its card should name it. */
  organization?: string;
  /** Verified coordinates. Without them the map places it at its city (city-level). */
  position?: { lat: number; lng: number };
  address?: string;
  /** Where `position` and `address` come from. */
  source?: string;
  /** The card's copy, two or three sentences: edit freely. */
  description: string;
  /**
   * Its own career areas, where its kind of business's usual list (CAREER_AREAS) would not fit
   * (a slot-only casino has no table games). Without it, that list is shown.
   */
  careerAreas?: DepartmentId[];
  /**
   * The property's own photographs, in order (the first leads). Only images of
   * this property belong here; add files to public/images and list them.
   */
  gallery: PropertyImage[];
};

/**
 * The kinds of career found across each type of business, from the department
 * taxonomy (lib/careers/taxonomy.ts): shown as areas across Infinity's casinos,
 * restaurants, hotels or administration, not as a claim about one property.
 */
export const CAREER_AREAS: Record<PropertyCategory, DepartmentId[]> = {
  casino: ["live-game", "slot-game", "guest-relations", "food-beverage"],
  restaurant: ["kitchen", "restaurant-service", "bar-operations"],
  hotel: ["reception", "housekeeping", "food-beverage"],
  administration: ["finance", "human-resources", "marketing", "systems-tech"],
};

/** How the career areas are introduced, per type of business. */
export const CAREER_AREAS_LABEL: Record<PropertyCategory, string> = {
  casino: "Career areas across our casinos",
  restaurant: "Career areas across our restaurants",
  hotel: "Career areas across our hotels",
  administration: "Career areas at headquarters",
};

export const PROPERTIES: Property[] = [
  {
    id: "grand-casino-tirana",
    slug: "grand-casino-tirana",
    name: "Grand Casino Tirana",
    category: "casino",
    city: "Tirana",
    jobProperty: "grand-casino-tirana",
    position: { lat: 41.3275394, lng: 19.8211465 },
    address: "Rruga Abdi Toptani 18, Tirana",
    source: "https://www.openstreetmap.org/node/8916544316",
    // Inside the five-star Maritim Plaza Hotel, Tirana.
    description:
      "Located within the five-star Maritim Plaza Hotel in the heart of Tirana, Grand Casino Tirana offers a premium entertainment experience combining live table games, modern slot machines, and exclusive VIP gaming areas. With its sophisticated interiors, welcoming atmosphere, and professional hospitality, the casino brings together entertainment, service, and elegance in one distinctive destination.",
    // Grand Casino Tirana's own photographs, in their order (GCT 1 leads).
    gallery: [
      { src: "/images/GCT 1.jpg", alt: "Grand Casino Tirana, the entrance under the Grand Casino sign" },
      { src: "/images/GCT 2.jpg", alt: "Grand Casino Tirana, a row of slot machines" },
      { src: "/images/GCT 3.jpg", alt: "Grand Casino Tirana, a saxophonist and dancers on the gaming floor" },
      { src: "/images/GCT 4.jpg", alt: "Grand Casino Tirana, the VIP lounge slot machines" },
      { src: "/images/GCT 5.jpg", alt: "Grand Casino Tirana, a live performance on stage" },
      { src: "/images/GCT 6.jpg", alt: "Grand Casino Tirana, guests at a gaming table with the dealer" },
      { src: "/images/GCT 7.jpg", alt: "Grand Casino Tirana, a singer performing among the slot machines" },
      { src: "/images/GCT 8.jpg", alt: "Grand Casino Tirana, a blackjack table" },
      { src: "/images/GCT 9.jpg", alt: "Grand Casino Tirana, guests among the slot machines" },
      { src: "/images/GCT 10.jpg", alt: "Grand Casino Tirana, a singer on stage" },
    ],
  },
  {
    id: "grand-panevino",
    slug: "grand-panevino",
    name: "Grand Panevino",
    category: "restaurant",
    city: "Tirana",
    jobProperty: "grand-panevino",
    position: { lat: 41.3277837, lng: 19.8215184 },
    address: "Rruga Abdi Toptani 18, Tirana",
    source: "https://www.openstreetmap.org/node/11990140873",
    description:
      "Located in the heart of Tirana, our restaurant brings together Mediterranean flavors, carefully selected ingredients, and a warm, elegant experience designed for every occasion.",
    // Grand Panevino's own photographs, in their numbered order (Panevino 1 leads; there is no
    // panevino 4 yet), then the restaurant's earlier photograph.
    gallery: [
      { src: "/images/Panevino 1.png", alt: "Grand Panevino, a table set with dishes and cocktails" },
      { src: "/images/Panevino 2.png", alt: "Grand Panevino, the entrance with its sculpture" },
      { src: "/images/Panevino3.jpeg", alt: "Grand Panevino, chefs at work in the open kitchen" },
      { src: "/images/panevino 5.jpg", alt: "Grand Panevino, a live performance on stage" },
      { src: "/images/panevino 6.jpg", alt: "Grand Panevino, performers on stage" },
      { src: "/images/panevino.jpeg", alt: "Grand Panevino, the restaurant" },
    ],
  },
  {
    id: "arena-casino",
    slug: "arena-casino",
    name: "Arena Casino",
    category: "casino",
    city: "Tirana",
    jobProperty: "arena-casino",
    // Not in OpenStreetMap yet: add verified coordinates to place its pin exactly.
    description:
      "A luxurious haven of entertainment and opulence that redefines the modern gaming experience. Nestled across four exquisite floors, Arena Casino is a captivating destination designed to enthrall the new generation of discerning players seeking a refined and immersive atmosphere.",
    // Arena Casino's own photographs, in their order (arena 1 leads).
    gallery: [
      { src: "/images/arena 1.jpg", alt: "Arena Casino, the reception beneath the Arena sign" },
      { src: "/images/arena 2.jpg", alt: "Arena Casino, guests at a gaming table" },
      { src: "/images/arena 3.jpg", alt: "Arena Casino, the bar beside the slot machines" },
      { src: "/images/arena 4.jpg", alt: "Arena Casino, the gaming floor" },
      { src: "/images/arena 5.jpg", alt: "Arena Casino, a card game in play" },
      { src: "/images/arena 6.jpg", alt: "Arena Casino, a performance on the floor" },
      { src: "/images/arena 7.jpg", alt: "Arena Casino, musicians playing" },
      { src: "/images/arena 8.jpg", alt: "Arena Casino, dancers on stage" },
    ],
  },
  {
    id: "hotel-saranda-butrinti",
    slug: "hotel-butrinti",
    name: "Hotel Butrinti",
    category: "hotel",
    city: "Sarandë",
    jobProperty: "hotel-butrinti",
    // OpenStreetMap lists it as "Butrinti" (hotel) on Rruga Butrinti.
    position: { lat: 39.8711871, lng: 20.0147583 },
    address: "Rruga Butrinti, Sarandë",
    source: "https://www.openstreetmap.org/way/1085039416",
    description:
      "Saranda Butrinti Affiliated by Meliá is located in a Balkan coastal city facing the island of Corfu. Near the famous Blue Eye natural spring and Butrint National Park, this hotel provides rooms designed to accommodate couples, families and travellers seeking rest and relaxation. Enjoy a fantastic spa, gym, outdoor pool and restaurant serving wonderful local cuisine and a delicious buffet breakfast.",
    // The two new photographs first (HB leads), then the existing ones in their order.
    gallery: [
      { src: "/images/HB.jpg", alt: "Hotel Butrinti, the entrance beneath the Butrinti sign" },
      { src: "/images/HB 1.webp", alt: "Hotel Butrinti, a guest bedroom" },
      { src: "/images/Hotel Butrinti.jpeg", alt: "Hotel Butrinti" },
      { src: "/images/hotel reception.png", alt: "Hotel Butrinti, the reception desk" },
    ],
  },
  {
    id: "grand-casino-durres",
    slug: "grand-casino-durres",
    name: "Grand Casino Durrës",
    category: "casino",
    city: "Durrës",
    jobProperty: "grand-casino-durres",
    // Not in OpenStreetMap yet: add verified coordinates to place its pin exactly.
    description:
      "Grand Casino Durrës carries Infinity's casino experience to Durrës. Explore its casino operations and discover the people and roles behind the experience.",
    // Grand Casino Durrës's own photographs: the existing cover first, then the GCD set.
    gallery: [
      { src: "/images/Grand Casino Durres.png", alt: "Grand Casino Durrës, the gaming floor" },
      { src: "/images/GCD 1.webp", alt: "Grand Casino Durrës, the slot machine room" },
      { src: "/images/GCD 3.webp", alt: "Grand Casino Durrës, a roulette wheel" },
      { src: "/images/GCD 4.webp", alt: "Grand Casino Durrës, a singer performing on stage" },
      { src: "/images/GCD 5.webp", alt: "Grand Casino Durrës, a dancer on stage" },
    ],
  },
  {
    id: "international-casino-tirana",
    slug: "international-casino-tirana",
    name: "International Casino Tirana",
    category: "casino",
    city: "Tirana",
    jobProperty: "international-casino-tirana",
    position: { lat: 41.3300217, lng: 19.8189345 },
    address: "Rruga Urani Pano, Tirana",
    source: "https://www.openstreetmap.org/way/624100501",
    // Inside Tirana International Hotel.
    description:
      "Located within Tirana International Hotel, in the heart of Albania's capital, International Casino Tirana brings together modern gaming, refined hospitality, and contemporary entertainment. Featuring live table games, slot machines, and dedicated VIP gaming areas, the casino offers a sophisticated atmosphere where professional service and an elegant setting come together.",
    // International Casino Tirana's own photographs, in their order (ICT 1 leads).
    gallery: [
      { src: "/images/ICT 1.jpg", alt: "International Casino Tirana, the bar beneath the red ceiling" },
      { src: "/images/ICT 2.jpg", alt: "International Casino Tirana, a dealer at the roulette table" },
      { src: "/images/ICT 3.jpg", alt: "International Casino Tirana, a singer performing for guests" },
      { src: "/images/ICT 4.jpg", alt: "International Casino Tirana, a dealer at a card table" },
      { src: "/images/ICT 5.jpg", alt: "International Casino Tirana, a DJ among the slot machines" },
    ],
  },
  {
    id: "royal-casino-korce",
    slug: "royal-casino-korca",
    name: "Royal Casino Korçë",
    category: "casino",
    city: "Korçë",
    jobProperty: "royal-casino",
    // Not in OpenStreetMap yet: add verified coordinates to place its pin exactly.
    // Inside Grand Palace Hotel, Korçë; slot machines only (no table games).
    description:
      "Located inside Grand Palace Hotel in Korçë, Royal Casino is a casino destination dedicated exclusively to slot machines. Designed around a focused gaming experience, it offers visitors a dedicated space for slot entertainment within the hotel.",
    careerAreas: ["slot-game", "systems-tech"],
    // Royal Casino's own photographs: the existing cover first, then the royal korca set.
    gallery: [
      { src: "/images/Royal Casino.png", alt: "Royal Casino Korçë" },
      { src: "/images/royal korca 1.jpeg", alt: "Royal Casino Korçë, the slot machine floor" },
      { src: "/images/royal korca 2.jpeg", alt: "Royal Casino Korçë, the illuminated Royal Casino sign on the hotel" },
      { src: "/images/royal korca 3.jpeg", alt: "Royal Casino Korçë, electronic gaming terminals" },
    ],
  },
];

/** The headquarters: on the map as an administrative location, not one of the seven properties. */
export const HEADQUARTERS: Property = {
  id: "infinity-hq",
  slug: "headquarters",
  name: "Infinity Headquarters",
  category: "administration",
  city: "Tirana",
  jobProperty: "infinity-hq",
  place: "Air Albania Stadium, Second Floor, Tirana, Albania",
  organization: "Infinity Investment Group",
  // No verified coordinates yet: placed at Tirana's city point.
  // Two paragraphs, separated by a blank line.
  description:
    "Located on the second floor of Air Albania Stadium in Tirana, Infinity Investment Group's headquarters brings together a diverse team of professionals across administration, finance, human resources, marketing, IT, legal, procurement, and project development.\n\n" +
    "From concept to completion, our teams combine expertise, creativity, and innovation to design, develop, and manage exceptional casino and hospitality projects that reflect Infinity's commitment to quality, luxury, and memorable experiences.",
  // The departments its description names, from the taxonomy (IT is Systems & Tech; project
  // development is the Project Unit).
  careerAreas: ["administration", "finance", "human-resources", "marketing", "systems-tech", "legal", "procurement", "project-unit"],
  // The headquarters' own photographs, in their order (HQ 1 leads).
  gallery: [
    { src: "/images/HQ 1.png", alt: "Infinity Headquarters, the reception beneath the Infinity Investment sign" },
    { src: "/images/HQ 2.png", alt: "Infinity Headquarters, the open-plan offices" },
    { src: "/images/HQ 3.png", alt: "Infinity Headquarters, the corridor between the offices" },
  ],
};

/**
 * Each city's own point, as the map's data has it: OpenStreetMap place points, as
 * OpenFreeMap serves them (OpenMapTiles "place" layer), read at zoom 9 and rounded.
 * A location without verified coordinates is drawn here, at city level, and says so.
 */
export const CITY_POINTS: Record<string, { lat: number; lng: number }> = {
  Tirana: { lat: 41.3281, lng: 19.81848 },
  Durrës: { lat: 41.31327, lng: 19.44632 },
  Korçë: { lat: 40.61591, lng: 20.77721 },
  Sarandë: { lat: 39.87523, lng: 20.00645 },
};

/** Everything on the map: the seven properties and the headquarters. */
export const LOCATIONS: Property[] = [...PROPERTIES, HEADQUARTERS];

/** The query parameter that names the selected property on /properties. */
export const PROPERTY_PARAM = "property";

/** The location a URL names, or undefined (a missing or unknown value). */
export function propertyBySlug(slug: string | null | undefined) {
  return slug ? LOCATIONS.find((property) => property.slug === slug) : undefined;
}

/** The properties page, opened on one property. */
export const propertyHref = (property: Property) => `/properties?${PROPERTY_PARAM}=${property.slug}`;

/** The properties page opened on the property a careers id belongs to (the homepage showcase's ids), or the page itself. */
export function propertyHrefFor(jobProperty: string) {
  const property = LOCATIONS.find((candidate) => candidate.jobProperty === jobProperty);
  return property ? propertyHref(property) : "/properties";
}

/**
 * The open positions for this location, on the positions page: a property's own
 * (/roles reads ?property=<careers id>); for the headquarters, the Administration career group.
 */
export const openPositionsHref = (property: Property) =>
  property.category === "administration" ? "/roles?careerGroup=administration" : `/roles?property=${property.jobProperty}`;

/** Real open roles at a property: its published listings. */
export function openRoleCount(property: Property) {
  return openJobs().filter((job) => job.propertyId === property.jobProperty).length;
}
