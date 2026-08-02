import { prisma } from "./db";

/*
  System-wide admin activity trail. AdminLoginLog stays focused on
  authentication attempts; this records what an admin *did* once inside, so
  there is always a record of who changed money, status or accounts.

  Summaries are stored in English: this is an internal audit record read by
  staff, and an audit trail that changes wording with the reader's locale is
  harder to reason about than one that doesn't.
*/
export const ADMIN_ACTION = {
  quoteSent: "QUOTE_SENT",
  quoteUpdated: "QUOTE_UPDATED",
  paymentConfirmed: "PAYMENT_CONFIRMED",
  paymentRejected: "PAYMENT_REJECTED",
  shipmentAdvanced: "SHIPMENT_ADVANCED",
  statusOverridden: "STATUS_OVERRIDDEN",
  customerUpdated: "CUSTOMER_UPDATED",
  customerSuspended: "CUSTOMER_SUSPENDED",
  customerRestored: "CUSTOMER_RESTORED",
  customerDeleted: "CUSTOMER_DELETED",
  taxonomyImported: "TAXONOMY_IMPORTED",
} as const;

export type AdminAction = (typeof ADMIN_ACTION)[keyof typeof ADMIN_ACTION];

/**
 * Human-readable labels for the audit trail. Kept in code as plain English
 * rather than in the translation files: the audit log is a technical record
 * and must read the same for every admin, whatever interface language they
 * use. Customer-facing text (notifications, request timelines) is translated.
 */
export const ADMIN_ACTION_LABEL: Record<string, string> = {
  QUOTE_SENT: "Quote sent",
  QUOTE_UPDATED: "Quote updated",
  PAYMENT_CONFIRMED: "Payment confirmed",
  PAYMENT_REJECTED: "Payment rejected",
  SHIPMENT_ADVANCED: "Shipment advanced",
  STATUS_OVERRIDDEN: "Status overridden",
  CUSTOMER_UPDATED: "Customer updated",
  CUSTOMER_SUSPENDED: "Customer suspended",
  CUSTOMER_RESTORED: "Customer restored",
  CUSTOMER_DELETED: "Customer deleted",
  TAXONOMY_IMPORTED: "Taxonomy imported",
};

/** Sign-in audit notes, English for the same reason as the labels above. */
export const LOGIN_NOTE_LABEL: Record<string, string> = {
  password_ok: "Signed in",
  password_fail: "Wrong password",
  locked: "Account locked",
  phone_otp_blocked: "Phone login blocked for admin",
};

/**
 * Never throws: an audit write must not be able to fail the business action it
 * is describing. A dropped log line is logged to the server console instead.
 */
export async function logAdminActivity(input: {
  actorId: string;
  actorEmail: string | null;
  action: AdminAction;
  summary: string;
  targetType?: "request" | "customer" | "taxonomy";
  targetId?: string;
}): Promise<void> {
  try {
    await prisma.adminActivityLog.create({
      data: {
        actorId: input.actorId,
        actorEmail: input.actorEmail ?? "unknown",
        action: input.action,
        summary: input.summary,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
      },
    });
  } catch (e) {
    console.error("admin activity log write failed", e);
  }
}
