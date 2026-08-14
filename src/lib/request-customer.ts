/*
  Who placed an order.

  A web order belongs to a registered User. A walk-in order belongs to nobody —
  the person stood at the counter, gave their name and number, and left. Their
  details are recorded on the request itself.

  Rather than making every screen ask "is this a walk-in?" and branch, these
  helpers answer the question the screen actually has: what is this person
  called, how do we reach them, and is there an account we can notify.
*/

export type RequestParty = {
  channel?: "WEB" | "WALK_IN" | string;
  customerId?: string | null;
  customer?: { name: string; email?: string | null; phone?: string | null } | null;
  walkInName?: string | null;
  walkInPhone?: string | null;
  walkInEmail?: string | null;
};

export function isWalkIn(req: RequestParty): boolean {
  return req.channel === "WALK_IN";
}

/** Display name, whichever side the order came from. Never empty. */
export function partyName(req: RequestParty): string {
  return req.customer?.name ?? req.walkInName ?? "—";
}

export function partyPhone(req: RequestParty): string | null {
  return req.customer?.phone ?? req.walkInPhone ?? null;
}

export function partyEmail(req: RequestParty): string | null {
  return req.customer?.email ?? req.walkInEmail ?? null;
}

/**
 * The account to notify, or null when there is nobody to notify.
 *
 * Walk-in customers have no login, so there is no inbox to write to — the
 * conversation happens at the counter or over the phone. Every notification
 * write in the pipeline goes through this so a walk-in order simply skips that
 * step instead of failing on a null foreign key.
 */
export function notifiableUserId(req: RequestParty): string | null {
  return req.customerId ?? null;
}

/** Translation key for the channel badge (admin.channel.*). */
export function channelKey(req: RequestParty): "web" | "walkIn" {
  return isWalkIn(req) ? "walkIn" : "web";
}
