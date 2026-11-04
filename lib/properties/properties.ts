/**
 * Infinity Entertainment properties, as shown in "Where we are".
 *
 * Only verified facts live here. Positions and addresses come from the
 * OpenStreetMap feature named in `source` (the same data the map draws);
 * nothing is estimated. A property without a verified `position` still
 * appears in the panel and the index, just without a pin, until one is
 * supplied.
 *
 * Adding an entry is all it takes for a property to appear on the map, in the
 * detail panel and in the index ("01 / 07").
 */

import { JOBS } from "@/lib/careers/jobs";

export type PropertyCategory = "casino" | "hotel" | "restaurant";

export const PROPERTY_CATEGORY_LABEL: Record<PropertyCategory, string> = {
  casino: "Casino",
  hotel: "Hotel",
  restaurant: "Restaurant",
};

export type PropertyImage = { src: string; alt: string };

export type Property = {
  id: string;
  name: string;
  category: PropertyCategory;
  city: string;
  /**
   * The name job records use for this property (`Job.property` in
   * lib/careers/jobs.ts). Open-role counts and the "Explore opportunities"
   * filter both key on it.
   */
  jobProperty: string;
  /** Verified coordinates. Without them the property has no map pin. */
  position?: { lat: number; lng: number };
  address?: string;
  /** Where `position` and `address` come from. */
  source?: string;
  /** Approved copy only. */
  description?: string;
  /** Approved photography only. */
  images?: PropertyImage[];
};

export const PROPERTIES: Property[] = [
  {
    id: "grand-casino-tirana",
    name: "Grand Casino Tirana",
    category: "casino",
    city: "Tirana",
    jobProperty: "Grand Casino Tirana",
    position: { lat: 41.3275394, lng: 19.8211465 },
    address: "Rruga Abdi Toptani 18, Tirana",
    source: "https://www.openstreetmap.org/node/8916544316",
  },
  {
    id: "grand-casino-durres",
    name: "Grand Casino Durres",
    category: "casino",
    city: "Durrës",
    jobProperty: "Grand Casino Durres",
    // Not in OpenStreetMap yet: add verified coordinates to place its pin.
  },
  {
    id: "grand-panevino",
    name: "Grand Panevino",
    category: "restaurant",
    city: "Tirana",
    jobProperty: "Grand Panevino",
    position: { lat: 41.3277837, lng: 19.8215184 },
    address: "Rruga Abdi Toptani 18, Tirana",
    source: "https://www.openstreetmap.org/node/11990140873",
  },
  {
    id: "international-casino-tirana",
    name: "International Casino Tirana",
    category: "casino",
    city: "Tirana",
    jobProperty: "International Casino Tirana",
    position: { lat: 41.3300217, lng: 19.8189345 },
    address: "Rruga Urani Pano, Tirana",
    source: "https://www.openstreetmap.org/way/624100501",
  },
  {
    id: "royal-casino-korce",
    name: "Royal Casino",
    category: "casino",
    city: "Korçë",
    jobProperty: "Royal Casino",
    // Not in OpenStreetMap yet: add verified coordinates to place its pin.
  },
  {
    id: "hotel-saranda-butrinti",
    name: "Hotel Saranda Butrinti Affiliated by Meliá",
    category: "hotel",
    city: "Sarandë",
    jobProperty: "Hotel Saranda Butrinti Affiliated by Meliá",
    // OpenStreetMap lists it as "Butrinti" (hotel) on Rruga Butrinti.
    position: { lat: 39.8711871, lng: 20.0147583 },
    address: "Rruga Butrinti, Sarandë",
    source: "https://www.openstreetmap.org/way/1085039416",
  },
  // The seventh property: add it here once its details are verified.
];

/** Real open roles at a property, from the site's job data. */
export function openRoleCount(property: Property) {
  return JOBS.filter((job) => job.property === property.jobProperty).length;
}
