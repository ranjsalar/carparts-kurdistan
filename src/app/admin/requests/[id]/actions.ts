"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendQuote } from "@/lib/quotes";
import { advanceShipment } from "@/lib/shipments";
import { ADMIN_ACTION, logAdminActivity } from "@/lib/admin-activity";
import { TIMELINE } from "@/lib/timeline";
import { statusLabels } from "@/lib/status";
import type { RequestStatus, SourceCountry } from "@/generated/prisma/enums";

// IDs are Prisma cuids; anything else (e.g. path-traversal attempts that
// would end up interpolated into redirect URLs) bails out to the queue.
const ID_PATTERN = /^[a-z0-9]{10,40}$/i;

function safeRequestId(value: FormDataEntryValue | null): string {
  const id = typeof value === "string" ? value : "";
  if (!ID_PATTERN.test(id)) redirect("/admin/requests");
  return id;
}

export async function sendQuoteAction(formData: FormData) {
  const admin = await requireAdmin();

  const field = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  const requestId = safeRequestId(formData.get("requestId"));
  const result = await sendQuote(admin.id, requestId, {
    source: field("source") as SourceCountry,
    pricePartUsd: field("pricePartUsd"),
    priceShippingUsd: field("priceShippingUsd"),
    priceTaxUsd: field("priceTaxUsd"),
    priceDeliveryUsd: field("priceDeliveryUsd"),
    quoteNotes: field("quoteNotes"),
  });

  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin/requests");
  if (!result.ok) {
    redirect(`/admin/requests/${requestId}?error=${encodeURIComponent(result.error)}`);
  }
  await logAdminActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: result.updated ? ADMIN_ACTION.quoteUpdated : ADMIN_ACTION.quoteSent,
    summary: `${result.updated ? "Updated" : "Sent"} quote of $${field("pricePartUsd")}+ on request ${requestId}`,
    targetType: "request",
    targetId: requestId,
  });
  redirect(`/admin/requests/${requestId}?success=${result.updated ? "quoteUpdated" : "quoteSent"}`);
}

export async function advanceShipmentAction(formData: FormData) {
  const admin = await requireAdmin();

  const requestId = safeRequestId(formData.get("requestId"));
  const noteValue = formData.get("note");
  const note = typeof noteValue === "string" ? noteValue : "";

  const result = await advanceShipment(admin.id, requestId, note);

  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  if (!result.ok) {
    redirect(`/admin/requests/${requestId}?error=${encodeURIComponent(result.error)}`);
  }
  await logAdminActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ADMIN_ACTION.shipmentAdvanced,
    summary: `Advanced shipment stage on request ${requestId}`,
    targetType: "request",
    targetId: requestId,
  });
  redirect(`/admin/requests/${requestId}?success=statusAdvanced`);
}

/**
 * Manual status override for exceptional cases (correcting a mistake).
 *
 * Deliberately separate from advanceShipment: that enforces the one-step-
 * forward chain, while this can move a request anywhere. Because it bypasses
 * the normal rules it is recorded as an explicit override — the timeline entry
 * says so and names the reason, so a manual intervention can never be mistaken
 * for a normal transition. A reason is required.
 */
export async function overrideRequestStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = safeRequestId(formData.get("requestId"));
  const nextStatus = String(formData.get("status") ?? "") as RequestStatus;
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Object.keys(statusLabels).includes(nextStatus)) {
    redirect(`/admin/requests/${requestId}?error=invalidStatus`);
  }
  if (!reason) {
    redirect(`/admin/requests/${requestId}?error=overrideReasonRequired`);
  }

  const request = await prisma.partRequest.findUnique({ where: { id: requestId } });
  if (!request) redirect("/admin/requests");
  const previous = request.status;

  await prisma.$transaction([
    prisma.partRequest.update({ where: { id: requestId }, data: { status: nextStatus } }),
    prisma.statusLog.create({
      data: {
        requestId,
        status: nextStatus,
        note: `Status manually set to ${statusLabels[nextStatus]} by an administrator. Reason: ${reason}`,
        noteKey: TIMELINE.statusOverridden,
        noteParams: { status: nextStatus, reason },
        createdById: admin.id,
      },
    }),
  ]);

  await logAdminActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ADMIN_ACTION.statusOverridden,
    summary: `Overrode request ${requestId}: ${previous} → ${nextStatus}. Reason: ${reason}`,
    targetType: "request",
    targetId: requestId,
  });

  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath(`/requests/${requestId}`);
  redirect(`/admin/requests/${requestId}?success=statusOverridden`);
}
