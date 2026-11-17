/**
 * The careers taxonomy: career groups, departments and the master position
 * catalog, as supplied by Infinity HR (the Administration and Casino sides of
 * the position catalog, and the Grand Panevino restaurant list).
 *
 * A position in the catalog is a role Infinity can hire for, not an opening:
 * openings are the job listings in lib/careers/jobs.ts, which point at a
 * position here by its id. Nothing here says a role is vacant, its experience
 * level or its contract type; HR sets those on each listing.
 */

/* ------------------------------------------------------------------ groups */

export const CAREER_GROUPS = ["casino", "restaurant", "hotel", "administration"] as const;
export type CareerGroup = (typeof CAREER_GROUPS)[number];

export const CAREER_GROUP_LABEL: Record<CareerGroup, string> = {
  casino: "Casino",
  restaurant: "Restaurant",
  hotel: "Hotel",
  administration: "Administration",
};

/* -------------------------------------------------------- listing options */

export const EXPERIENCE_LEVELS = ["Entry Level", "Intermediate", "Senior"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/**
 * The search's Experience filter. It asks about the candidate a position is open to, not about
 * the position's seniority: Without Experience finds positions open to someone with no previous
 * work experience, With Experience those that ask for it. It is read from the level HR sets on
 * each listing, the only fact held about it: an Entry Level opening is open without experience,
 * an Intermediate or Senior one asks for it. A listing without a level matches neither.
 */
export const EXPERIENCE_FILTERS = ["With Experience", "Without Experience"] as const;
export type ExperienceFilter = (typeof EXPERIENCE_FILTERS)[number];

export function experienceFilterFor(level: ExperienceLevel | null): ExperienceFilter | null {
  if (level === null) return null;
  return level === "Entry Level" ? "Without Experience" : "With Experience";
}

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Seasonal"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

/* ------------------------------------------------------------- departments */

/**
 * A department can serve more than one career group (Systems & Tech, Reception,
 * Food & Beverage…): `groups` lists the ones it serves, which is what the
 * Department filter offers under a chosen group, and what HR may pair it with.
 * The Hotel group has no hotel-specific position list yet, so it is served by
 * the shared departments named for it.
 */
export type Department = { id: string; name: string; groups: readonly CareerGroup[] };

export const DEPARTMENTS = [
  // Administration
  { id: "administration", name: "Administration", groups: ["administration"] },
  { id: "finance", name: "Finance", groups: ["administration"] },
  { id: "human-resources", name: "Human Resources", groups: ["administration"] },
  { id: "legal", name: "Legal", groups: ["administration"] },
  { id: "marketing", name: "Marketing", groups: ["administration"] },
  { id: "procurement", name: "Procurement", groups: ["administration"] },
  { id: "project-unit", name: "Project Unit", groups: ["administration"] },
  { id: "support-services", name: "Support Services", groups: ["administration"] },
  // Shared between the Administration and Casino sides of the catalog, and the hotel.
  { id: "systems-tech", name: "Systems & Tech", groups: ["administration", "casino", "hotel"] },
  // Casino
  { id: "casino-management", name: "Casino Management", groups: ["casino"] },
  { id: "live-game", name: "Live Game", groups: ["casino"] },
  { id: "poker-room", name: "Poker Room", groups: ["casino"] },
  { id: "guest-relations", name: "Guest Relations", groups: ["casino", "hotel"] },
  { id: "slot-game", name: "Slot Game", groups: ["casino"] },
  { id: "cash-desk", name: "Cash Desk", groups: ["casino"] },
  { id: "reception", name: "Reception", groups: ["casino", "hotel"] },
  { id: "porters-drivers", name: "Porters and Drivers", groups: ["casino"] },
  { id: "food-beverage", name: "Food & Beverage", groups: ["casino", "restaurant", "hotel"] },
  { id: "housekeeping", name: "Housekeeping", groups: ["casino", "hotel"] },
  { id: "maintenance", name: "Maintenance", groups: ["casino", "hotel"] },
  { id: "cctv", name: "CCTV", groups: ["casino"] },
  // Restaurant (Grand Panevino)
  { id: "restaurant-management", name: "Restaurant Management", groups: ["restaurant"] },
  { id: "restaurant-administration", name: "Restaurant Administration", groups: ["restaurant"] },
  { id: "kitchen", name: "Kitchen", groups: ["restaurant"] },
  { id: "bar-operations", name: "Bar Operations", groups: ["restaurant"] },
  { id: "restaurant-service", name: "Restaurant Service", groups: ["restaurant"] },
] as const satisfies readonly Department[];

export type DepartmentId = (typeof DEPARTMENTS)[number]["id"];

const DEPARTMENT_BY_ID = new Map<string, Department>(DEPARTMENTS.map((d) => [d.id, d]));

export function getDepartment(id: DepartmentId): Department {
  const department = DEPARTMENT_BY_ID.get(id);
  if (!department) throw new Error(`Unknown department: ${id}`);
  return department;
}

export function isDepartmentId(value: string): value is DepartmentId {
  return DEPARTMENT_BY_ID.has(value);
}

/** Departments that serve a career group, in taxonomy order (all of them for `null`). */
export function departmentsFor(group: CareerGroup | null): Department[] {
  return DEPARTMENTS.filter((d) => group === null || (d.groups as readonly CareerGroup[]).includes(group));
}

/* --------------------------------------------------------------- positions */

/** The side of the supplied catalog a position comes from. */
export type CatalogSide = "administration" | "casino" | "restaurant";

export type Position = {
  /** Stable: `<side>.<department>.<title slug>`. */
  id: string;
  title: string;
  departmentId: DepartmentId;
  /** The career group the catalog lists it under. */
  careerGroup: CatalogSide;
  /**
   * The standardized title it shares with positions elsewhere (Bartender at the
   * casino and at the restaurant): the same role name, separate positions,
   * each with its own department.
   */
  roleKey: string;
  /** Other spellings it is known by: earlier names and corrected misspellings. */
  aliases?: readonly string[];
};

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type Entry = string | { title: string; aliases: readonly string[] };

function side(careerGroup: CatalogSide, departments: Partial<Record<DepartmentId, readonly Entry[]>>): Position[] {
  return Object.entries(departments).flatMap(([departmentId, entries]) =>
    (entries ?? []).map((entry) => {
      const title = typeof entry === "string" ? entry : entry.title;
      const position: Position = {
        id: `${careerGroup}.${departmentId}.${slug(title)}`,
        title,
        departmentId: departmentId as DepartmentId,
        careerGroup,
        roleKey: slug(title),
      };
      if (typeof entry !== "string") position.aliases = entry.aliases;
      return position;
    }),
  );
}

/** Administration side: 43 positions. */
const ADMINISTRATION = side("administration", {
  administration: [
    "Crisis Manager",
    "Executive Board Member",
    "Executive Chef of Hospitality",
    "Administrator",
    "Internal Audit",
    "Assistant Worker",
    "Postman",
    "General Manager",
    "Driver",
    "Compliance Manager",
    "Housekeeping",
  ],
  finance: [
    "Head Cashier",
    "Finance Director of the Group",
    "Finance Supervisor",
    "Finance Manager",
    "Finance Specialist",
    "Head Accounting",
    "Head Treasury",
    "Assistant Cost Controller",
    "Accountant",
    "Cost Controller",
    "Head of Financial Reporting",
  ],
  "human-resources": ["Human Resources Director", "Archive Protocol", "HR Specialist", "Payroll Specialist"],
  legal: ["Lawyer", "Head of Legal"],
  marketing: ["Graphic Designer", "Programmer", "Marketing Manager", "Marketing Specialist"],
  procurement: ["Procurement Specialist", "Deputy Director Procurement", "Project Coordinator"],
  "project-unit": ["Civil Works Engineer", "Architect"],
  "support-services": ["Director of Support Services", "Group Assistant"],
  "systems-tech": ["IT Supervisor", "IT Specialist", "Warehouseman", "Technician / Sector Supervisor"],
});

/** Casino side: 54 positions. */
const CASINO = side("casino", {
  "casino-management": ["Casino Manager", "Assistant Casino Manager"],
  "live-game": [
    "Floor Manager",
    "Senior Pit Boss",
    "Pit Boss",
    "Inspector",
    "Dealer Inspector",
    { title: "Dealer", aliases: ["Table Games Dealer"] },
    "Trainee Dealer",
  ],
  "poker-room": ["Poker Manager", "Poker Floorman", "Poker Dealer", "Poker Trainee Dealer"],
  "guest-relations": ["Executive Host", "Senior Host", "Host"],
  "systems-tech": ["Slot Technician"],
  "slot-game": ["Slot Manager", "Slot Supervisor", "Slot Attendant"],
  "cash-desk": ["Cash Desk Manager", "Cash Desk Supervisor", "Cash Desk Cashier"],
  reception: ["Reception Manager", "Receptionist Supervisor", { title: "Receptionist", aliases: ["Hotel Receptionist", "Casino Receptionist", "Front Desk Agent"] }],
  "porters-drivers": ["Driver Manager", "Driver Supervisor", "Driver", "Porter"],
  "food-beverage": [
    "F&B Manager",
    "Assistant F&B Manager",
    "Head Cook / Food & Health Security Manager",
    "F&B Shift Supervisor",
    "F&B Warehouseman",
    { title: "Bartender", aliases: ["Casino Bartender"] },
    { title: "Waiter", aliases: ["Casino Waiter"] },
    "Barback",
    "VIP Waiter",
    "Assistant Waiter / Stewarding",
    "Sous Chef",
    "Chef de Partie / Cook",
    "Pastry Chef",
    "Demi Chef de Partie",
    { title: "Commis / Kitchen Assistant", aliases: ["Kitchen Assistant"] },
  ],
  housekeeping: ["Housekeeping Manager", "Housekeeping Supervisor", "Housekeeping"],
  maintenance: ["Maintenance Manager", "Maintenance Supervisor", "Maintenance"],
  cctv: ["CCTV Manager", "CCTV Supervisor", "CCTV Officer"],
});

/** Grand Panevino: 12 positions, spelling corrected ("Aministrative", "Commie"). */
const RESTAURANT = side("restaurant", {
  "restaurant-management": ["Restaurant Manager", "Assistant Manager / Supervisor", "Supervisor"],
  "restaurant-administration": [{ title: "Administrative Assistant", aliases: ["Aministrative Assistant"] }],
  kitchen: ["Chef de Partie", { title: "Commis", aliases: ["Commie"] }, "Stewarding"],
  "bar-operations": ["Head of Bar", { title: "Bartender", aliases: ["Restaurant Bartender"] }],
  "restaurant-service": ["Waiter", "Cashier", "Host"],
});

export const POSITIONS: readonly Position[] = [...ADMINISTRATION, ...CASINO, ...RESTAURANT];

const POSITION_BY_ID = new Map(POSITIONS.map((p) => [p.id, p]));

export function getPosition(id: string): Position | undefined {
  return POSITION_BY_ID.get(id);
}

/**
 * The positions HR may choose from for a listing in a career group: those the
 * catalog lists under it, and those of the shared departments that serve it
 * (the Hotel group draws on Reception, Housekeeping, Food & Beverage…).
 */
export function positionsFor(group: CareerGroup): Position[] {
  return POSITIONS.filter((p) => p.careerGroup === group || (getDepartment(p.departmentId).groups as readonly CareerGroup[]).includes(group));
}
