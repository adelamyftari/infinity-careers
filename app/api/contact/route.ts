import { CONTACT_LIMITS, CONTACT_SUBJECTS, contactErrors, EMPTY_MESSAGE, type ContactErrors, type ContactMessage } from "@/lib/site/contact-form";
import { clientKey, rateLimited } from "@/lib/server/rate-limit";
import { insertContactMessage, sentRecently, supabaseConfig } from "@/lib/server/supabase";

/**
 * POST /api/contact: one message from the contact page, as JSON.
 *
 * Checked here again, whatever the form checked. Saved to public.contact_messages through the
 * server's service-role key, which no browser ever sees; only HR staff can read the table
 * (supabase/migrations/20261117120000_contact_messages.sql). Nothing is emailed: no verified
 * recipient has been configured. Until Supabase is configured the message is refused, with the
 * headquarters' phone number offered instead, rather than lost or falsely confirmed.
 *
 * Responses never echo what was sent, and nothing about the sender is logged.
 */

const PER_CLIENT = { limit: 5, windowMs: 15 * 60 * 1000 };
const ALL_CLIENTS = { limit: 200, windowMs: 15 * 60 * 1000 };
const MAX_BODY = 16 * 1024;
/** The same email again within a minute is a double submission. */
const REPEAT_WINDOW_MS = 60 * 1000;

type Failure = "rate_limited" | "too_large" | "bad_request" | "not_configured" | "invalid" | "duplicate" | "save_failed";

const MESSAGES: Record<Failure, string> = {
  rate_limited: "Too many messages from this connection. Please wait a few minutes and try again.",
  too_large: "This message is too long. Please shorten it and try again.",
  bad_request: "We couldn't read this message. Please refresh the page and try again.",
  not_configured: "Messages can't be sent online yet, and yours has not been sent. Please call our headquarters instead.",
  invalid: "Some details need your attention.",
  duplicate: "We have just received a message from this email address. There is no need to send it again.",
  save_failed: "Your message could not be sent. Nothing was saved; please try again.",
};

const STATUS: Record<Failure, number> = { rate_limited: 429, too_large: 413, bad_request: 400, not_configured: 503, invalid: 422, duplicate: 409, save_failed: 502 };

function fail(error: Failure, fields?: ContactErrors) {
  return Response.json({ ok: false, error, message: MESSAGES[error], ...(fields ? { fields } : {}) }, { status: STATUS[error], headers: { "Cache-Control": "no-store" } });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** The JSON, read into its shape; anything else is ignored. */
function readInput(raw: unknown): ContactMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const subject = str(r.subject, 60);
  return {
    ...EMPTY_MESSAGE,
    fullName: str(r.fullName, CONTACT_LIMITS.fullName + 50),
    email: str(r.email, CONTACT_LIMITS.email + 50),
    phone: str(r.phone, CONTACT_LIMITS.phone + 20),
    subject: (CONTACT_SUBJECTS as readonly string[]).includes(subject) ? (subject as ContactMessage["subject"]) : "",
    message: str(r.message, CONTACT_LIMITS.message + 200),
    privacy: r.privacy === true,
  };
}

export async function POST(request: Request) {
  if (rateLimited("contact:all", ALL_CLIENTS.limit, ALL_CLIENTS.windowMs) || rateLimited(`contact:${clientKey(request)}`, PER_CLIENT.limit, PER_CLIENT.windowMs)) return fail("rate_limited");
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY) return fail("too_large");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("bad_request");

  const config = supabaseConfig();
  if (!config) return fail("not_configured");

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return fail("too_large");
    raw = JSON.parse(text);
  } catch {
    return fail("bad_request");
  }
  // A field people never see: filled in, it was a script. It is told nothing more.
  if (raw && typeof raw === "object" && str((raw as Record<string, unknown>).company_website, 200).trim() !== "") return Response.json({ ok: true }, { status: 202 });

  const input = readInput(raw);
  if (!input) return fail("bad_request");
  const fields = contactErrors(input);
  if (Object.keys(fields).length) return fail("invalid", fields);

  const email = input.email.trim().toLowerCase();
  const repeat = await sentRecently(config, email, new Date(Date.now() - REPEAT_WINDOW_MS).toISOString());
  if (repeat === null) return fail("save_failed");
  if (repeat) return fail("duplicate");

  const saved = await insertContactMessage(config, {
    full_name: input.fullName.trim(),
    email,
    phone: input.phone.trim() || null,
    subject: input.subject,
    message: input.message.trim(),
    privacy_acknowledged_at: new Date().toISOString(),
  });
  if (!saved) {
    console.error("[contact] the message could not be written");
    return fail("save_failed");
  }
  return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
