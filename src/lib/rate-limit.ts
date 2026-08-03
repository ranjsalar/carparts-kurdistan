import { headers } from "next/headers";
import { prisma } from "./db";

/*
  Fixed-window rate limiter backed by Postgres (the RateCounter table).

  It used to be an in-process Map, which had two problems that mattered for a
  real deployment: counters reset to zero on every restart and redeploy — so an
  attacker mid-brute-force got a clean slate each time we shipped — and the
  numbers were only correct if exactly one instance was ever running. Both are
  gone now: the database is the single source of truth, so limits survive
  restarts and stay correct no matter how many instances serve traffic.

  The cost is one round trip to a database we are already talking to on these
  paths anyway. Only auth and submission endpoints are rate limited, so this is
  nowhere near hot-path volume.
*/

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Counts a hit against `key` and reports whether it is still under `max`.
 *
 * The whole window update is a single INSERT … ON CONFLICT so concurrent
 * requests cannot interleave into a lost update: the CASE resets the counter
 * in the same statement that increments it, once the old window has expired.
 *
 * Blocked attempts still increment, so hammering a limit keeps it saturated
 * rather than letting an attacker slip a request in each time the count sits
 * exactly at the limit. The window itself is never extended by a blocked
 * attempt, so `retryAfterSeconds` always counts down honestly.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const resetAt = new Date(Date.now() + windowMs);

  try {
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateCounter" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateCounter"."resetAt" <= NOW() THEN 1
          ELSE "RateCounter"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateCounter"."resetAt" <= NOW() THEN ${resetAt}
          ELSE "RateCounter"."resetAt"
        END
      RETURNING "count", "resetAt"
    `;

    void pruneOccasionally();

    const row = rows[0];
    if (!row) return { ok: true };

    if (row.count > max) {
      const retryMs = row.resetAt.getTime() - Date.now();
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)) };
    }
    return { ok: true };
  } catch (e) {
    // Fail open. Every caller is an action that needs the database moments
    // later anyway (look up the user, write the OTP, insert the request), so
    // failing closed here would not protect anything — it would just turn a
    // database blip into a site-wide lockout with a confusing error.
    console.error("rate limit check failed, allowing request", e);
    return { ok: true };
  }
}

/**
 * Number of distinct subjects (accounts, phone numbers) seen under a key
 * prefix within the current window. This is what distinguishes an attack from
 * a mistake: one person fumbling their own password produces one subject, a
 * credential-stuffing run produces many.
 */
export async function countDistinctSubjects(prefix: string): Promise<number> {
  try {
    return await prisma.rateCounter.count({
      where: { key: { startsWith: prefix }, resetAt: { gt: new Date() } },
    });
  } catch (e) {
    console.error("distinct subject count failed", e);
    return 0;
  }
}

/** Marks one subject as seen under `key`, without any limit decision. */
export async function touchCounter(key: string, windowMs: number): Promise<void> {
  await rateLimit(key, Number.MAX_SAFE_INTEGER, windowMs);
}

// Expired rows are dead weight, but sweeping on every call would double the
// query count for no benefit. A ~2% chance per call keeps the table trimmed
// without a scheduler or a cron container to operate.
let pruning = false;
async function pruneOccasionally() {
  if (pruning || Math.random() > 0.02) return;
  pruning = true;
  try {
    await prisma.rateCounter.deleteMany({ where: { resetAt: { lte: new Date() } } });
  } catch {
    // Housekeeping only — never surface this.
  } finally {
    pruning = false;
  }
}

/** Best-effort client IP for rate-limit keys (first X-Forwarded-For hop). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "local";
}

/** Test hook: clear all counters. */
export async function resetRateLimits() {
  await prisma.rateCounter.deleteMany({});
}
