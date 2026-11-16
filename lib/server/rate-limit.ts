import "server-only";

/**
 * A sliding-window limit per client, in this server's memory: enough to stop
 * a script hammering one instance. Behind several instances (serverless), each
 * keeps its own count; the database's duplicate check
 * (app/api/applications/route.ts) still applies across all of them.
 */

const hits = new Map<string, number[]>();

export function rateLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const limited = recent.length >= limit;
  if (!limited) recent.push(now);
  hits.set(key, recent);
  // Keep the map small: forget clients whose window has passed.
  if (hits.size > 5000) for (const [k, times] of hits) if (times.every((t) => now - t >= windowMs)) hits.delete(k);
  return limited;
}

/** The client's address, as the proxy in front of the app reports it. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
