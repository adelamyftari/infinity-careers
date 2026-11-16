import { randomUUID } from "node:crypto";
import {
  CV_MAX_BYTES,
  CV_TYPES,
  cvExtension,
  cvProblem,
  EMPTY_EXPERIENCE,
  EMPTY_PERSONAL,
  experienceErrors,
  personalErrors,
  preferenceResult,
  PRIVACY_ERROR,
  storedExperience,
  type ApplicationInput,
  type CvExtension,
  type Errors,
} from "@/lib/careers/application";
import { EMPTY_PREFERENCES } from "@/lib/careers/offerings";
import { getCareersProperty } from "@/lib/careers/properties";
import { getRoleEntry } from "@/lib/careers/roles";
import { clientKey, rateLimited } from "@/lib/server/rate-limit";
import { appliedRecently, insertApplication, removeCv, supabaseConfig, uploadCv } from "@/lib/server/supabase";

/**
 * POST /api/applications: one application (or expression of interest), as
 * multipart form data: `application` (JSON) and `cv` (the file).
 *
 * Everything is checked here again, whatever the form already checked: the
 * role (it must still be listed), every field, the choice of property, level
 * and contract type (resolved to one of the listings' real offerings, never
 * taken from the browser), the experience, and the CV by its extension, its
 * declared type and its first bytes. The CV is stored under a generated name in
 * the private bucket; its original name is kept only as a label for HR.
 *
 * Responses never echo what the applicant sent, and nothing about the
 * applicant is logged.
 */

const PER_CLIENT = { limit: 5, windowMs: 15 * 60 * 1000 };
const ALL_CLIENTS = { limit: 120, windowMs: 15 * 60 * 1000 };
/** The CV, the JSON and the multipart framing. */
const MAX_BODY = CV_MAX_BYTES + 96 * 1024;
const MAX_JSON = 32 * 1024;
/** The same email for the same position within this window is a repeat. */
const REPEAT_WINDOW_MS = 24 * 60 * 60 * 1000;

type Failure =
  | "rate_limited"
  | "too_large"
  | "bad_request"
  | "not_configured"
  | "role_closed"
  | "invalid"
  | "invalid_cv"
  | "duplicate"
  | "upload_failed"
  | "save_failed";

const MESSAGES: Record<Failure, string> = {
  rate_limited: "Too many attempts from this connection. Please wait a few minutes and try again.",
  too_large: `Your CV is larger than ${CV_MAX_BYTES / (1024 * 1024)} MB. Please upload a smaller file.`,
  bad_request: "We couldn't read this application. Please refresh the page and try again.",
  not_configured: "Online applications are not open yet. Your details have not been sent; please try again soon.",
  role_closed: "This role is no longer accepting applications.",
  invalid: "Some details need your attention.",
  invalid_cv: "Please upload your CV as a PDF, DOC or DOCX file.",
  duplicate: "You have already applied for this role with this email address. Our recruitment team has your application.",
  upload_failed: "Your CV could not be uploaded. Nothing was submitted; please try again.",
  save_failed: "Your application could not be saved. Nothing was submitted; please try again.",
};

const STATUS: Record<Failure, number> = {
  rate_limited: 429,
  too_large: 413,
  bad_request: 400,
  not_configured: 503,
  role_closed: 410,
  invalid: 422,
  invalid_cv: 422,
  duplicate: 409,
  upload_failed: 502,
  save_failed: 502,
};

function fail(error: Failure, fields?: Errors) {
  return Response.json({ ok: false, error, message: MESSAGES[error], ...(fields ? { fields } : {}) }, { status: STATUS[error], headers: { "Cache-Control": "no-store" } });
}

/** The first bytes each format starts with: a renamed executable is not a CV. */
function looksLike(ext: CvExtension, head: Uint8Array) {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  if (ext === "pdf") return starts(0x25, 0x50, 0x44, 0x46, 0x2d); // %PDF-
  if (ext === "doc") return starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1); // OLE compound file
  return starts(0x50, 0x4b, 0x03, 0x04); // a ZIP package
}

/** The original file name, as a label only: no path, no control characters, bounded. */
function safeLabel(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "";
  // Without control characters, or those a file system or a header would trip on.
  const kept = Array.from(base)
    .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) !== 127 && !'<>:"|?*'.includes(ch))
    .join("")
    .trim()
    .slice(0, 120);
  return kept || "cv";
}

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");

/** An object's known string fields, each bounded; anything else is ignored. */
function pick<T extends Record<string, string>>(shape: T, raw: unknown, max: number): T {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(Object.keys(shape).map((k) => [k, str(r[k], max)])) as T;
}

/** The application JSON, read into its shape; anything else is ignored. */
function readInput(raw: unknown): ApplicationInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.roleId !== "string") return null;
  const experience = pick({ status: "", years: "", previousPosition: "" }, r.experience, 400);
  return {
    roleId: r.roleId.slice(0, 200),
    personal: pick(EMPTY_PERSONAL, r.personal, 400),
    preferences: pick(EMPTY_PREFERENCES, r.preferences, 200),
    experience: { ...EMPTY_EXPERIENCE, ...experience, status: experience.status === "no_experience" || experience.status === "with_experience" ? experience.status : "" },
    privacy: r.privacy === true,
  };
}

export async function POST(request: Request) {
  if (rateLimited("all", ALL_CLIENTS.limit, ALL_CLIENTS.windowMs) || rateLimited(`ip:${clientKey(request)}`, PER_CLIENT.limit, PER_CLIENT.windowMs)) return fail("rate_limited");

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY) return fail("too_large");
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return fail("bad_request");

  const config = supabaseConfig();
  if (!config) return fail("not_configured");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("bad_request");
  }

  // A field people never see: filled in, it was a script. It is told nothing more.
  if (str(form.get("company_website")).trim() !== "") return Response.json({ ok: true }, { status: 202 });

  const json = form.get("application");
  if (typeof json !== "string" || json.length > MAX_JSON) return fail("bad_request");
  let input: ApplicationInput | null = null;
  try {
    input = readInput(JSON.parse(json));
  } catch {
    input = null;
  }
  if (!input) return fail("bad_request");

  // The role, as the site lists it now: a listing that has closed is refused.
  const entry = getRoleEntry(input.roleId);
  if (!entry) return fail("role_closed");

  // The property, level and contract type: one of the role's real offerings, or refused.
  const preference = preferenceResult(entry, input.preferences);
  const fields: Errors = { ...personalErrors(input.personal), ...preference.errors, ...experienceErrors(input.experience) };
  if (!input.privacy) fields.privacy = PRIVACY_ERROR;

  const cv = form.get("cv");
  if (!(cv instanceof File)) fields.cv = "Please upload your CV.";
  else {
    const problem = cvProblem(cv);
    if (problem) fields.cv = problem;
  }
  if (Object.keys(fields).length) return fail(fields.cv && Object.keys(fields).length === 1 ? "invalid_cv" : "invalid", fields);

  const resolved = preference.resolved;
  if (!resolved) return fail("invalid", fields);
  const file = cv as File;
  const ext = cvExtension(file.name);
  if (!ext) return fail("invalid_cv");
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > CV_MAX_BYTES) return fail("too_large");
  if (!looksLike(ext, new Uint8Array(bytes, 0, Math.min(8, bytes.byteLength)))) return fail("invalid_cv", { cv: "This file doesn't look like a PDF, DOC or DOCX document. Please save your CV again and upload it." });

  const email = input.personal.email.trim().toLowerCase();
  const repeat = await appliedRecently(config, email, entry.positionId, entry.careerGroup, new Date(Date.now() - REPEAT_WINDOW_MS).toISOString());
  if (repeat === null) return fail("save_failed");
  if (repeat) return fail("duplicate");

  // A generated name: nothing the applicant typed reaches the storage path.
  const now = new Date();
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;
  if (!(await uploadCv(config, path, bytes, CV_TYPES[ext]))) {
    console.error("[applications] the CV could not be stored");
    return fail("upload_failed");
  }

  const { personal } = input;
  const saved = await insertApplication(config, {
    application_type: entry.kind === "vacancy" ? "vacancy" : "interest",
    // The listing the chosen offering belongs to (an expression of interest has none).
    vacancy_id: resolved.vacancyId,
    position_id: entry.positionId,
    position_title: entry.title,
    property_id: resolved.propertyId,
    location: resolved.propertyId ? getCareersProperty(resolved.propertyId).city : null,
    department_id: entry.departmentId,
    career_group: entry.careerGroup,
    selected_job_level: resolved.level,
    selected_employment_type: resolved.employmentType,
    ...storedExperience(input.experience),
    first_name: personal.firstName.trim(),
    last_name: personal.lastName.trim(),
    email,
    phone: personal.phone.trim(),
    cv_storage_path: path,
    cv_original_name: safeLabel(file.name),
    cv_mime_type: CV_TYPES[ext],
    cv_size_bytes: bytes.byteLength,
    privacy_acknowledged_at: now.toISOString(),
  });
  if (!saved) {
    // No row, no orphaned CV.
    await removeCv(config, path);
    console.error("[applications] the application row could not be written");
    return fail("save_failed");
  }

  return Response.json({ ok: true, type: entry.kind === "vacancy" ? "vacancy" : "interest" }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
