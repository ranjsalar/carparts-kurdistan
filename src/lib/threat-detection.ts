import { prisma } from "./db";
import { countDistinctSubjects, rateLimit, touchCounter } from "./rate-limit";

/*
  Lightweight attack-pattern detection.

  This is deliberately not an IDS. It watches the handful of signals the app
  already produces — failed logins, failed OTP checks, request volume — and
  raises a visible alert when they form a shape that honest traffic does not.
  Everything runs inside the app against the existing database; there is no
  agent, no traffic mirroring and no third-party service.

  The design rule throughout is that a mistake must never look like an attack.
  A customer who mistypes their password twice touches exactly one account, so
  the account-based detectors key on the number of DISTINCT accounts a single
  IP has failed against, not on the raw failure count.
*/

export const SECURITY_EVENT = {
  credentialStuffing: "CREDENTIAL_STUFFING",
  otpAbuse: "OTP_ABUSE",
  adminTargeting: "ADMIN_TARGETING",
  highVolume: "HIGH_VOLUME",
} as const;

export type SecurityEventKind = (typeof SECURITY_EVENT)[keyof typeof SECURITY_EVENT];

/** English, like the rest of the audit trail — see ADMIN_ACTION_LABEL. */
export const SECURITY_EVENT_LABEL: Record<string, string> = {
  CREDENTIAL_STUFFING: "Credential stuffing",
  OTP_ABUSE: "OTP abuse",
  ADMIN_TARGETING: "Admin targeting",
  HIGH_VOLUME: "High request volume",
};

const MINUTE = 60 * 1000;

/*
  Thresholds. The reasoning matters more than the numbers, because these are
  the knobs to turn if the alerts ever get noisy:

  - Iraqi mobile carriers put large numbers of real customers behind carrier
    -grade NAT, so "one IP" is not "one person". Every threshold below has to
    survive a few unrelated customers sharing an address.
  - Failures are much rarer than successes. Five different accounts failing
    from one address inside fifteen minutes is not a shared-connection
    coincidence; it is someone working through a list.
*/
const WINDOW_MS = 15 * MINUTE;

/** Distinct accounts one IP may fail against before it looks like a list. */
const STUFFING_DISTINCT_ACCOUNTS = 5;

/** Distinct phone numbers one IP may fail OTP against. */
const OTP_DISTINCT_PHONES = 5;

/*
  Failed admin sign-ins from one IP. Set to the account-lockout threshold on
  purpose: the moment the admin account locks is exactly the moment a human
  should look at why. An admin who genuinely forgets their own password will
  raise one of these, which is a fair trade — it is rare, it folds into a
  single alert, and "your admin account just locked" is worth knowing either
  way.
*/
const ADMIN_FAILURES = 5;

/*
  Volume, counted only over auth and submission endpoints (see noteEndpointHit
  callers) rather than page views. Set high on purpose: behind CGNAT a genuine
  burst of unrelated customers must not trip it. 150 auth/submission calls in
  five minutes from one address is ~30/minute of pure form posting, which no
  legitimate use of this site produces.
*/
const VOLUME_WINDOW_MS = 5 * MINUTE;
const VOLUME_MAX_HITS = 150;

/*
  Repeat detections from the same source fold into the open alert instead of
  creating a row per attempt, so a sustained attack is one line an admin can
  acknowledge, not a thousand. A fresh alert is only raised once the previous
  one has been acknowledged, or after this long.
*/
const REFRESH_AFTER_MS = 6 * 60 * MINUTE;

/**
 * Records one detected pattern. Never throws: detection must not be able to
 * break the authentication path it is observing.
 */
async function raise(
  kind: SecurityEventKind,
  ip: string,
  observed: number,
  detail: string,
): Promise<void> {
  try {
    // Fold first, create only if there was nothing to fold into. Written as
    // updateMany rather than findFirst-then-update so the common case during a
    // sustained attack — where this runs on every hostile request — costs one
    // query instead of two.
    const folded = await prisma.securityEvent.updateMany({
      where: {
        kind,
        ip,
        acknowledgedAt: null,
        createdAt: { gt: new Date(Date.now() - REFRESH_AFTER_MS) },
      },
      data: { observed, hitCount: { increment: 1 }, lastSeenAt: new Date(), detail },
    });
    if (folded.count > 0) return;

    await prisma.securityEvent.create({ data: { kind, ip, observed, detail } });
  } catch (e) {
    console.error("security event write failed", e);
  }
}

/**
 * Call on every failed credential check. `subject` is the account identifier
 * that was attempted — an email here, a phone number for the OTP path. It is
 * only ever used to count distinct values, never displayed in the alert.
 */
export async function noteAuthFailure(input: {
  kind: typeof SECURITY_EVENT.credentialStuffing | typeof SECURITY_EVENT.otpAbuse;
  ip: string;
  subject: string;
}): Promise<void> {
  const { kind, ip, subject } = input;
  try {
    // Mark this (ip, subject) pair as seen, then ask how many distinct
    // subjects this IP has failed against inside the window.
    const prefix = `seen:${kind}:${ip}:`;
    await touchCounter(`${prefix}${subject}`, WINDOW_MS);
    const distinct = await countDistinctSubjects(prefix);

    const threshold =
      kind === SECURITY_EVENT.credentialStuffing
        ? STUFFING_DISTINCT_ACCOUNTS
        : OTP_DISTINCT_PHONES;
    if (distinct < threshold) return;

    const what =
      kind === SECURITY_EVENT.credentialStuffing
        ? `${distinct} different accounts`
        : `${distinct} different phone numbers`;
    await raise(kind, ip, distinct, `Failed sign-in attempts against ${what} from ${ip} within 15 minutes.`);
  } catch (e) {
    console.error("auth failure detection skipped", e);
  }
}

/**
 * Call on every failed admin sign-in. Admin is the highest-value target and
 * there is only ever a handful of admin accounts, so this counts raw failures
 * per IP rather than distinct accounts.
 */
export async function noteAdminAuthFailure(ip: string): Promise<void> {
  try {
    const key = `fail:admin:${ip}`;
    const result = await rateLimit(key, ADMIN_FAILURES - 1, WINDOW_MS);
    if (result.ok) return;

    await raise(
      SECURITY_EVENT.adminTargeting,
      ip,
      ADMIN_FAILURES,
      `${ADMIN_FAILURES} or more failed admin sign-in attempts from ${ip} within 15 minutes. The admin account locks at ${ADMIN_FAILURES} failures.`,
    );
  } catch (e) {
    console.error("admin targeting detection skipped", e);
  }
}

/**
 * Call at the top of auth and submission endpoints. Flags an address pushing
 * an implausible amount of traffic at the write surface of the app.
 */
export async function noteEndpointHit(ip: string): Promise<void> {
  try {
    const result = await rateLimit(`vol:${ip}`, VOLUME_MAX_HITS, VOLUME_WINDOW_MS);
    if (result.ok) return;

    await raise(
      SECURITY_EVENT.highVolume,
      ip,
      VOLUME_MAX_HITS,
      `More than ${VOLUME_MAX_HITS} authentication or submission requests from ${ip} within 5 minutes.`,
    );
  } catch (e) {
    console.error("volume detection skipped", e);
  }
}

/** Unacknowledged alerts, for the admin alert bar. */
export async function countOpenSecurityEvents(): Promise<number> {
  try {
    return await prisma.securityEvent.count({ where: { acknowledgedAt: null } });
  } catch {
    return 0;
  }
}
