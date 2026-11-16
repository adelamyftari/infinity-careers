/**
 * What the positions page (/roles) lists: one entry per card, and one card per
 * position in its career group.
 *
 * - A vacancy card is a position with published listings (lib/careers/jobs.ts):
 *   every listing for it in that career group, at any property, level or
 *   contract type, is one of its offerings (lib/careers/offerings.ts), so a
 *   receptionist offered entry level and intermediate, full-time and part-time,
 *   is one card. The listings themselves stay separate records; only their
 *   public card is shared. Applied for with APPLY NOW.
 * - A role is a catalog position (lib/careers/taxonomy.ts) with no published
 *   listing in its career group: a career Infinity hires for, not an opening.
 *   It takes an expression of interest, never presented as a vacancy.
 *
 * The same position in two career groups (the receptionist at the hotel and at
 * the casinos) is two cards: different teams, departments and properties.
 *
 * Nothing here adds facts about a role: experience levels, contract types and
 * dates come only from HR's listings, and a catalog role has none of them. The
 * properties a catalog role is relevant at are the ones of its kind of business
 * (casino roles at the casinos, the restaurant's at Grand Panevino, the
 * administration's at the headquarters), honouring a property's own career
 * areas where the site already gives them (lib/properties/properties.ts).
 */

import { CATEGORIES, openJobs, ROLE_PREVIEWS, type CategoryId, type Job } from "./jobs";
import { offeringsOf, type Offering } from "./offerings";
import { CAREERS_PROPERTIES, getCareersProperty, propertiesIn, type City, type PropertyId } from "./properties";
import {
  CAREER_GROUP_LABEL,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  getDepartment,
  POSITIONS,
  type CareerGroup,
  type DepartmentId,
  type EmploymentType,
  type ExperienceLevel,
  type Position,
} from "./taxonomy";
import { PROPERTIES } from "@/lib/properties/properties";

export type RoleKind = "vacancy" | "role";

export type RoleEntry = {
  /** Stable, and the page's URL key (/roles?role=…): its first listing's slug, or the position's id. */
  id: string;
  kind: RoleKind;
  title: string;
  /** The catalog position it is for. */
  positionId: string;
  careerGroup: CareerGroup;
  departmentId: DepartmentId;
  /** A vacancy: the slugs of all its listings (each also finds the card). A role: none. */
  listingIds: string[];
  /** A vacancy: every combination its listings offer. A role: none (nothing is offered). */
  offerings: Offering[];
  /** A vacancy: the properties its listings are at, once HR has set them. A role: the properties it is relevant at. */
  propertyIds: PropertyId[];
  cities: City[];
  /** The levels and contract types its offerings have, in the taxonomy's order (empty for a role). */
  levels: ExperienceLevel[];
  employmentTypes: EmploymentType[];
  /** The latest publication date of its listings. */
  publishedAt: string | null;
  /** The card's line: the listing's own copy, or the department's overview. */
  summary: string;
  description: string | null;
  image?: string;
  imagePosition?: string;
  category: CategoryId;
  /** Other names it is searched by. */
  aliases: readonly string[];
  /** Catalog order, for "Relevant". */
  order: number;
};

/**
 * A short, general overview of each department's work: what a catalog role in
 * it is part of. Not a job description and not HR's requirements; a listing's
 * own description replaces it.
 */
export const DEPARTMENT_OVERVIEW: Record<DepartmentId, string> = {
  administration: "Part of the group's central administration, keeping the business coordinated, compliant and running day to day.",
  finance: "Part of the group finance team: accounting, treasury, cost control and reporting across the properties.",
  "human-resources": "Part of the people team behind recruitment, records, payroll and the everyday working life of Infinity's teams.",
  legal: "Part of the legal team advising the group and its properties on contracts, licensing and regulation.",
  marketing: "Part of the marketing team shaping how Infinity's casinos, restaurant and hotel are seen, online and on site.",
  procurement: "Part of the procurement team sourcing the goods and services the properties depend on.",
  "project-unit": "Part of the project unit that plans, designs and delivers Infinity's new spaces and renovations.",
  "support-services": "Part of the support services that assist the group's leadership and keep its offices running.",
  "systems-tech": "Part of the systems and technology team that keeps Infinity's equipment, networks and software working.",
  "casino-management": "Part of the casino's leadership, responsible for the gaming floor, its teams and its guests.",
  "live-game": "Part of the live gaming team running the casino's table games with precision and fairness.",
  "poker-room": "Part of the poker room team: tournaments, cash games and the players who come for them.",
  "guest-relations": "Part of the guest relations team that welcomes, looks after and remembers the casino's guests.",
  "slot-game": "Part of the slot floor team, looking after the machines and the guests who play them.",
  "cash-desk": "Part of the cash desk team handling the casino's chips, cash and transactions with care.",
  reception: "Part of the reception team: the first welcome, the arrivals and the questions guests bring.",
  "porters-drivers": "Part of the porters and drivers team that moves guests and their belongings smoothly.",
  "food-beverage": "Part of the food and beverage team serving guests at the bars, tables and kitchens.",
  housekeeping: "Part of the housekeeping team that keeps every space clean, ready and welcoming.",
  maintenance: "Part of the maintenance team that keeps the buildings, systems and equipment in good order.",
  cctv: "Part of the surveillance team that protects the casino, its guests and its staff.",
  "restaurant-management": "Part of Grand Panevino's leadership, running the restaurant's service and its team.",
  "restaurant-administration": "Part of Grand Panevino's administration, supporting the restaurant behind the scenes.",
  kitchen: "Part of Grand Panevino's kitchen brigade, from preparation to the pass.",
  "bar-operations": "Part of Grand Panevino's bar team, from the classics to the house cocktails.",
  "restaurant-service": "Part of Grand Panevino's service team, looking after every table and guest.",
};

/** Catalog career groups, in the order the page lists them. */
const GROUP_ORDER: CareerGroup[] = ["casino", "restaurant", "hotel", "administration"];

/** The properties a catalog position is relevant at. */
function relevantProperties(position: Position): PropertyId[] {
  return CAREERS_PROPERTIES.filter((property) => {
    if (property.businessType !== position.careerGroup) return false;
    // A property that names its own career areas (a slot-only casino) takes only those.
    const areas = PROPERTIES.find((p) => p.jobProperty === property.id)?.careerAreas;
    return property.businessType === "administration" || !areas || areas.includes(position.departmentId);
  }).map((property) => property.id);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** The photograph the site already has for a position (the homepage's pictured roles). */
const POSITION_IMAGE = new Map(ROLE_PREVIEWS.map((role) => [role.positionId, role]));

const categoryFor = (position: Position): CategoryId =>
  position.careerGroup === "casino"
    ? "casino"
    : position.careerGroup === "restaurant"
      ? position.departmentId === "bar-operations"
        ? "bar"
        : "restaurant"
      : "hospitality";

const inOrder = <T extends string>(order: readonly T[], values: readonly (T | null)[]) => order.filter((value) => values.includes(value));

/**
 * One card for a position's listings in one career group: the first listing's
 * title, copy and photograph (the first with a photograph, if it has none),
 * and every listing's offerings.
 */
function vacancyEntry(jobs: readonly Job[], order: number): RoleEntry {
  const [first] = jobs;
  const position = POSITIONS.find((p) => p.id === first.positionId);
  const offerings = jobs.flatMap(offeringsOf);
  const pictured = jobs.find((job) => job.image);
  const propertyIds = inOrder(
    propertiesIn(null).map((p) => p.id as PropertyId),
    offerings.map((o) => o.propertyId),
  );
  const titles = unique(jobs.map((job) => job.title.trim()));
  return {
    id: first.slug,
    kind: "vacancy",
    title: titles[0],
    positionId: first.positionId,
    careerGroup: first.careerGroup,
    departmentId: first.departmentId,
    listingIds: jobs.map((job) => job.slug),
    offerings,
    propertyIds,
    cities: unique(propertyIds.map((id) => getCareersProperty(id).city)),
    levels: inOrder(EXPERIENCE_LEVELS, offerings.map((o) => o.level)),
    employmentTypes: inOrder(EMPLOYMENT_TYPES, offerings.map((o) => o.employmentType)),
    publishedAt: jobs.map((job) => job.publishedAt ?? "").sort().at(-1) || null,
    summary: first.summary,
    description: first.description ?? null,
    image: pictured?.image,
    imagePosition: pictured?.imagePosition,
    category: first.category,
    aliases: [...(position ? [position.title, ...(position.aliases ?? [])] : []), ...titles.slice(1)],
    order,
  };
}

function roleEntry(position: Position, order: number): RoleEntry {
  const propertyIds = relevantProperties(position);
  const pictured = POSITION_IMAGE.get(position.id);
  return {
    id: position.id,
    kind: "role",
    title: position.title,
    positionId: position.id,
    careerGroup: position.careerGroup,
    departmentId: position.departmentId,
    listingIds: [],
    offerings: [],
    propertyIds,
    cities: unique(propertyIds.map((id) => getCareersProperty(id).city)),
    levels: [],
    employmentTypes: [],
    publishedAt: null,
    summary: DEPARTMENT_OVERVIEW[position.departmentId],
    description: null,
    image: pictured?.image,
    imagePosition: pictured?.imagePosition,
    category: categoryFor(position),
    aliases: [...(position.aliases ?? []), ...(pictured && pictured.title !== position.title ? [pictured.title] : [])],
    order,
  };
}

/**
 * Every card: the positions with published listings first (one card for all of
 * a position's listings in a career group, in the order its first listing
 * comes), then each catalog position that has no published listing in its own
 * career group (a listing for the same position elsewhere, like the hotel's
 * receptionist, leaves the casino's in place).
 */
export function roleEntries(jobs: readonly Job[] = openJobs()): RoleEntry[] {
  const groups = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = `${job.careerGroup}:${job.positionId}`;
    groups.set(key, [...(groups.get(key) ?? []), job]);
  }
  const vacancies = [...groups.values()].map((listings, i) => vacancyEntry(listings, i));
  const catalog = [...POSITIONS]
    .sort((a, b) => GROUP_ORDER.indexOf(a.careerGroup) - GROUP_ORDER.indexOf(b.careerGroup))
    .filter((position) => !groups.has(`${position.careerGroup}:${position.id}`))
    .map((position, i) => roleEntry(position, vacancies.length + i));
  return [...vacancies, ...catalog];
}

export const ROLE_ENTRIES: readonly RoleEntry[] = roleEntries();

/** A card by its id or by any of its listings' slugs (an older link, the carousel's). */
export function roleLookup(entries: readonly RoleEntry[]): (id: string) => RoleEntry | undefined {
  const byId = new Map<string, RoleEntry>();
  for (const entry of entries) for (const id of [entry.id, ...entry.listingIds]) if (!byId.has(id)) byId.set(id, entry);
  return (id) => byId.get(id);
}

export const getRoleEntry = roleLookup(ROLE_ENTRIES);

/** A property's name as the page shows it (the headquarters by its own name, not the search's label). */
export const propertyLabel = (id: PropertyId) => (id === "infinity-hq" ? "Infinity Headquarters" : getCareersProperty(id).name);

/** Where the role is, for a card or the application's header: its property (or how many), and its cities. */
export function roleWhere(entry: RoleEntry): { property: string; location: string } {
  if (entry.kind === "vacancy") {
    const n = entry.propertyIds.length;
    return {
      property: n === 0 ? "Property to be confirmed" : n === 1 ? propertyLabel(entry.propertyIds[0]) : `${n} properties`,
      location: entry.cities.length ? entry.cities.join(" · ") : "Location to be confirmed",
    };
  }
  const property =
    entry.propertyIds.length === 1
      ? propertyLabel(entry.propertyIds[0])
      : entry.propertyIds.length === 0
        ? CAREER_GROUP_LABEL[entry.careerGroup]
        : `${CAREER_GROUP_LABEL[entry.careerGroup]} properties`;
  return { property, location: entry.cities.length ? entry.cities.join(" · ") : "Albania" };
}

export const departmentName = (entry: RoleEntry) => getDepartment(entry.departmentId).name;
export const categoryLabel = (entry: RoleEntry) => CATEGORIES[entry.category].label;
