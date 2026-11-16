/**
 * The properties a job can be listed at, for the careers search: each with its
 * city and business type. Ids are the destinations' ids
 * (lib/properties/destinations.ts), and the cities are the ones the site's
 * property data already gives (lib/properties/properties.ts and destinations);
 * nothing here is new information about a property.
 */

import type { CareerGroup } from "./taxonomy";

export const CITIES = ["Tirana", "Durrës", "Korçë", "Sarandë"] as const;
export type City = (typeof CITIES)[number];

/** A property's business, which is also the career group its roles normally fall in. */
export type BusinessType = CareerGroup;

export const BUSINESS_TYPES: readonly BusinessType[] = ["restaurant", "casino", "hotel", "administration"];

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  restaurant: "Restaurant",
  casino: "Casino",
  hotel: "Hotel",
  administration: "Administration",
};

export type CareersProperty = { id: string; name: string; city: City; businessType: BusinessType };

export const CAREERS_PROPERTIES = [
  { id: "grand-panevino", name: "Grand Panevino", city: "Tirana", businessType: "restaurant" },
  { id: "grand-casino-tirana", name: "Grand Casino Tirana", city: "Tirana", businessType: "casino" },
  { id: "arena-casino", name: "Arena Casino", city: "Tirana", businessType: "casino" },
  { id: "international-casino-tirana", name: "International Casino Tirana", city: "Tirana", businessType: "casino" },
  { id: "grand-casino-durres", name: "Grand Casino Durrës", city: "Durrës", businessType: "casino" },
  { id: "royal-casino", name: "Royal Casino Korçë", city: "Korçë", businessType: "casino" },
  { id: "hotel-butrinti", name: "Hotel Butrinti", city: "Sarandë", businessType: "hotel" },
  { id: "infinity-hq", name: "Headquarters (Administration)", city: "Tirana", businessType: "administration" },
] as const satisfies readonly CareersProperty[];

export type PropertyId = (typeof CAREERS_PROPERTIES)[number]["id"];

const BY_ID = new Map<string, CareersProperty>(CAREERS_PROPERTIES.map((p) => [p.id, p]));

export function getCareersProperty(id: PropertyId): CareersProperty {
  const property = BY_ID.get(id);
  if (!property) throw new Error(`Unknown property: ${id}`);
  return property;
}

export function isPropertyId(value: string): value is PropertyId {
  return BY_ID.has(value);
}

/** The properties in a city (all of them for `null`), in business-type order. */
export function propertiesIn(city: City | null): CareersProperty[] {
  return BUSINESS_TYPES.flatMap((type) => CAREERS_PROPERTIES.filter((p) => p.businessType === type && (city === null || p.city === city)));
}
