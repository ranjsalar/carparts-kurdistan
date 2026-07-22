import { prisma } from "./db";
import type { PaymentMethod } from "@/generated/prisma/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "Cash on delivery",
  ONLINE_GATEWAY: "Online payment",
  BANK_TRANSFER: "Bank transfer",
};

/** Customer approves or rejects a quote. Rejecting ends the flow. */
export async function decideQuote(
  customerId: string,
  requestId: string,
  decision: "approve" | "reject",
): Promise<ActionResult> {
  const request = await prisma.partRequest.findUnique({ where: { id: requestId } });
  if (!request || request.customerId !== customerId) {
    return { ok: false, error: "requestNotFound" };
  }
  if (request.status !== "QUOTED") {
    return { ok: false, error: "noOpenQuote" };
  }

  if (decision === "approve") {
    await prisma.$transaction([
      prisma.partRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", approvedAt: new Date() },
      }),
      prisma.statusLog.create({
        data: {
          requestId,
          status: "APPROVED",
          note: "Customer approved the quote",
          createdById: customerId,
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.partRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED" },
      }),
      prisma.statusLog.create({
        data: {
          requestId,
          status: "REJECTED",
          note: "Customer rejected the quote",
          createdById: customerId,
        },
      }),
    ]);
  }
  return { ok: true };
}

/**
 * Customer declares how they'll pay. No money moves here: cash is settled at
 * delivery, bank transfers are verified by admin (optionally with an uploaded
 * receipt), and the online gateway is not integrated yet. Status stays
 * APPROVED until admin confirms receipt of payment.
 */
export async function selectPaymentMethod(
  customerId: string,
  requestId: string,
  method: PaymentMethod,
  proofUrl?: string,
): Promise<ActionResult> {
  const request = await prisma.partRequest.findUnique({ where: { id: requestId } });
  if (!request || request.customerId !== customerId) {
    return { ok: false, error: "requestNotFound" };
  }
  if (request.status !== "APPROVED") {
    return { ok: false, error: "methodAfterApproval" };
  }
  if (!(method in paymentMethodLabels)) {
    return { ok: false, error: "invalidMethod" };
  }

  // TODO: when a real gateway account exists (FastPay / Zaincash / Qi Card),
  // ONLINE_GATEWAY should start a checkout session here and the gateway's
  // webhook should call confirmPayment instead of the admin doing it manually.

  await prisma.$transaction([
    prisma.partRequest.update({
      where: { id: requestId },
      data: {
        paymentMethod: method,
        // A new proof replaces the old one; switching away from bank transfer clears it.
        paymentProofUrl: method === "BANK_TRANSFER" ? (proofUrl ?? request.paymentProofUrl) : null,
      },
    }),
    prisma.statusLog.create({
      data: {
        requestId,
        status: "APPROVED",
        note: `Payment method selected: ${paymentMethodLabels[method]}${
          method === "BANK_TRANSFER" && proofUrl ? " (receipt uploaded)" : ""
        }`,
        createdById: customerId,
      },
    }),
  ]);
  return { ok: true };
}

/** Admin confirms the money actually arrived → status PAID + customer notification. */
export async function confirmPayment(adminId: string, requestId: string): Promise<ActionResult> {
  const request = await prisma.partRequest.findUnique({
    where: { id: requestId },
    include: { part: true, brand: true, carModel: true },
  });
  if (!request) return { ok: false, error: "requestNotFound" };
  if (request.status !== "APPROVED") {
    return { ok: false, error: "onlyApprovedPaid" };
  }
  if (!request.paymentMethod) {
    return { ok: false, error: "noMethodYet" };
  }

  await prisma.$transaction([
    prisma.partRequest.update({
      where: { id: requestId },
      data: { status: "PAID", paidAt: new Date() },
    }),
    prisma.statusLog.create({
      data: {
        requestId,
        status: "PAID",
        note: `Payment received (${paymentMethodLabels[request.paymentMethod]})`,
        createdById: adminId,
      },
    }),
    prisma.notification.create({
      data: {
        userId: request.customerId,
        requestId,
        type: "PAYMENT_CONFIRMED",
        title: "Payment confirmed",
        body: `We received your payment for the ${request.part.name} (${request.brand.name} ${request.carModel.name}). We're ordering your part now.`,
      },
    }),
  ]);

  // TODO: send the payment confirmation over WhatsApp too (same pattern as
  // the quote notification in quotes.ts).

  return { ok: true };
}
