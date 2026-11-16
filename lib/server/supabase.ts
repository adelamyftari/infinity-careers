import "server-only";

/**
 * The applications store, through Supabase's REST and Storage APIs, from the
 * server only. The service-role key is read from the server's environment
 * (never a NEXT_PUBLIC_ variable, so it is never sent to a browser) and used
 * for exactly two things: writing an application row and its CV into the
 * private bucket. HR reads them through Supabase itself (docs/hr-applications.md).
 *
 * Until SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, nothing is
 * configured and the endpoint refuses applications rather than lose them.
 */

export const CV_BUCKET = "cvs";

type Config = { url: string; key: string };

export function supabaseConfig(): Config | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    // Plain http only for a local Supabase (supabase start).
    const local = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) return null;
  } catch {
    return null;
  }
  return { url, key };
}

const headers = ({ key }: Config, extra: Record<string, string> = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, ...extra });

/** A request that gives up rather than hang the applicant's submission. */
async function call(input: string, init: RequestInit): Promise<Response | null> {
  try {
    return await fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  } catch {
    return null;
  }
}

export async function uploadCv(config: Config, path: string, bytes: ArrayBuffer, contentType: string): Promise<boolean> {
  const response = await call(`${config.url}/storage/v1/object/${CV_BUCKET}/${path}`, {
    method: "POST",
    headers: headers(config, { "Content-Type": contentType, "x-upsert": "false", "Cache-Control": "no-store" }),
    body: bytes,
  });
  return !!response?.ok;
}

export async function removeCv(config: Config, path: string): Promise<void> {
  await call(`${config.url}/storage/v1/object/${CV_BUCKET}`, {
    method: "DELETE",
    headers: headers(config, { "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: [path] }),
  });
}

export async function insertApplication(config: Config, row: Record<string, unknown>): Promise<boolean> {
  const response = await call(`${config.url}/rest/v1/applications`, {
    method: "POST",
    headers: headers(config, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify(row),
  });
  return !!response?.ok;
}

/**
 * Whether this email already applied for this position, in this career group, recently (a double
 * submission, or a repeat). The same position in another group (the hotel's receptionist and the
 * casinos') is another role.
 */
export async function appliedRecently(config: Config, email: string, positionId: string, careerGroup: string, sinceIso: string): Promise<boolean | null> {
  const query = new URLSearchParams({ select: "id", email: `eq.${email}`, position_id: `eq.${positionId}`, career_group: `eq.${careerGroup}`, created_at: `gte.${sinceIso}`, limit: "1" });
  const response = await call(`${config.url}/rest/v1/applications?${query}`, { method: "GET", headers: headers(config) });
  if (!response?.ok) return null;
  const rows: unknown = await response.json().catch(() => null);
  return Array.isArray(rows) && rows.length > 0;
}
