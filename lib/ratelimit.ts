import "server-only";
import { headers } from "next/headers";

/**
 * Minimal in-memory fixed-window rate limiter. Fine for a single-instance VPS.
 * If this ever runs multi-instance, swap the Map for Redis.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** Returns true if the action is allowed, false if the limit is exceeded. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
