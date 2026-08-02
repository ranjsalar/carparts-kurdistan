/*
  Timeline (StatusLog) note templating.

  System-generated timeline entries are written with a `noteKey` plus
  `noteParams` so they can be rendered in whatever language the reader is
  using, exactly like Notification.templateKey. The English `note` column is
  still written as a snapshot: it is the fallback for rows created before this
  existed, and it keeps the database readable on its own.

  Free text an admin typed (shipment notes, override reasons) is stored with no
  noteKey and shown verbatim — translating someone's own words would be wrong.
*/

export const TIMELINE = {
  requestSubmitted: "requestSubmitted",
  quoteSent: "quoteSent",
  quoteUpdated: "quoteUpdated",
  quoteApproved: "quoteApproved",
  quoteRejected: "quoteRejected",
  paymentSubmitted: "paymentSubmitted",
  paymentPaidInFull: "paymentPaidInFull",
  paymentFirstConfirmed: "paymentFirstConfirmed",
  paymentSettled: "paymentSettled",
  paymentPartialConfirmed: "paymentPartialConfirmed",
  paymentRejected: "paymentRejected",
  statusOverridden: "statusOverridden",
} as const;

export type TimelineLog = {
  note: string | null;
  noteKey: string | null;
  noteParams: unknown;
};

/** Translators a page supplies so enum params render in the reader's language. */
export type TimelineContext = {
  t: (key: string, values?: Record<string, string>) => string;
  hasKey: (key: string) => boolean;
  /** Resolves CHINA / FIB / SOURCING style enum values to localized labels. */
  label: (kind: "source" | "method" | "status", value: string) => string;
};

/**
 * Renders one timeline entry. Falls back to the stored English text for rows
 * with no key (legacy rows and admin free text), so nothing ever renders blank.
 */
export function renderTimelineNote(log: TimelineLog, ctx: TimelineContext): string | null {
  if (!log.noteKey || !ctx.hasKey(log.noteKey)) return log.note;

  const params = (log.noteParams ?? {}) as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) values[key] = String(value ?? "");

  // Enum-valued params are stored raw and localized at render time.
  if (typeof params.source === "string") values.source = ctx.label("source", params.source);
  if (typeof params.method === "string") values.method = ctx.label("method", params.method);
  if (typeof params.status === "string") values.status = ctx.label("status", params.status);

  const rendered = ctx.t(log.noteKey, values);
  // An admin's free-text reason is appended rather than interpolated blindly,
  // so it survives even if the template forgets the placeholder.
  return rendered;
}
