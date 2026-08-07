import { prisma } from "./db";
import { partLabel } from "./request-display";
import { computePaymentState } from "./payments";
import type { RequestStatus } from "@/generated/prisma/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Shipment stages in order, shown on the customer tracking stepper. */
export const SHIPMENT_STAGES: RequestStatus[] = [
  "SOURCING",
  "SHIPPED",
  "ARRIVED",
  "READY",
  "COMPLETED",
];

// Strict one-step-forward chain. COMPLETED has no entry → terminal.
const NEXT_STATUS: Partial<Record<RequestStatus, RequestStatus>> = {
  PAID: "SOURCING",
  SOURCING: "SHIPPED",
  SHIPPED: "ARRIVED",
  ARRIVED: "READY",
  READY: "COMPLETED",
};

export function nextShipmentStatus(current: RequestStatus): RequestStatus | null {
  return NEXT_STATUS[current] ?? null;
}

const notificationCopy: Partial<
  Record<RequestStatus, { templateKey: string; title: string; body: (part: string) => string }>
> = {
  SOURCING: {
    templateKey: "shipmentSourcing",
    title: "Your part is being ordered",
    body: (part) => `We've ordered your ${part} from the supplier.`,
  },
  SHIPPED: {
    templateKey: "shipmentShipped",
    title: "Your part has shipped",
    body: (part) => `Your ${part} is on its way to Kurdistan.`,
  },
  ARRIVED: {
    templateKey: "shipmentArrived",
    title: "Your part has arrived in Kurdistan",
    body: (part) => `Your ${part} has arrived in the country and is being prepared.`,
  },
  READY: {
    templateKey: "shipmentReady",
    title: "Ready for pickup / delivery",
    body: (part) => `Your ${part} is ready! We'll be in touch to arrange pickup or delivery.`,
  },
  COMPLETED: {
    templateKey: "shipmentCompleted",
    title: "Order completed",
    body: (part) => `Your ${part} order is complete. Thanks for using KalaryCarPart!`,
  },
};

/**
 * Advances a request one step along the shipment chain. Skipping stages or
 * moving backward is impossible by construction — the only reachable status
 * is the single next one for the request's current status.
 */
export async function advanceShipment(
  adminId: string,
  requestId: string,
  note?: string,
): Promise<ActionResult> {
  const request = await prisma.partRequest.findUnique({
    where: { id: requestId },
    include: { part: true, payments: true },
  });
  if (!request) return { ok: false, error: "requestNotFound" };

  const next = nextShipmentStatus(request.status);
  if (!next) {
    return {
      ok: false,
      error: request.status === "COMPLETED" ? "orderCompleted" : "shipmentAfterPayment",
    };
  }

  // The balance must be cleared before the order can be completed/handed over.
  if (next === "COMPLETED") {
    const { remainingCents } = computePaymentState(request.priceUsd, request.payments);
    if (remainingCents > 0) return { ok: false, error: "settleBeforeComplete" };
  }

  const copy = notificationCopy[next]!;
  await prisma.$transaction([
    prisma.partRequest.update({ where: { id: requestId }, data: { status: next } }),
    prisma.statusLog.create({
      data: {
        requestId,
        status: next,
        note: note?.trim() || null,
        createdById: adminId,
      },
    }),
    prisma.notification.create({
      data: {
        userId: request.customerId,
        requestId,
        type: "STATUS_UPDATE",
        templateKey: copy.templateKey,
        params: { part: partLabel(request), note: note?.trim() || null },
        title: copy.title,
        body: copy.body(partLabel(request)) + (note?.trim() ? ` Note: ${note.trim()}` : ""),
      },
    }),
  ]);

  // TODO: send this status update over WhatsApp too (same pattern as
  // quotes.ts / payments.ts — the Notification row is the message content).

  return { ok: true };
}
