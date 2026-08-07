import { prisma } from "./db";
import { partLabel } from "./request-display";
import { TIMELINE } from "./timeline";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SubmitResult = { ok: true; paymentId: string } | { ok: false; error: string };

// The three online channels. Cash on delivery is deliberately excluded: the
// FIRST payment must go through one of these, since requiring money upfront is
// what confirms the customer is serious. COD is only ever a remainder option.
export const ONLINE_METHODS: PaymentMethod[] = ["FIB", "FASTPAY", "QICARD"];
export const ALL_METHODS: PaymentMethod[] = ["FIB", "FASTPAY", "QICARD", "CASH_ON_DELIVERY"];

// Statuses in which an outstanding balance can still be paid. Sourcing begins
// on the first confirmed payment, so a request can be mid-pipeline (SOURCING…
// READY) and still carry a remaining balance to settle before delivery.
const PAYABLE_STATUSES = ["APPROVED", "PAID", "SOURCING", "SHIPPED", "ARRIVED", "READY"];

// All money math is done in integer cents to avoid floating-point drift, then
// formatted to a 2-dp string for storage in the Decimal column.
function toCents(v: Prisma.Decimal | number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return Math.round(Number(v) * 100);
}
export function centsToUsd(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Thrown inside a transaction when a concurrent action already resolved the
 *  payment, so the outer call can translate it to a friendly error. */
class PaymentConflict extends Error {}

// ── Quote decision (unchanged from the original flow) ────────────────────────

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
          noteKey: TIMELINE.quoteApproved,
          createdById: customerId,
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.partRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } }),
      prisma.statusLog.create({
        data: {
          requestId,
          status: "REJECTED",
          note: "Customer rejected the quote",
          noteKey: TIMELINE.quoteRejected,
          createdById: customerId,
        },
      }),
    ]);
  }
  return { ok: true };
}

// ── Balance calculation ──────────────────────────────────────────────────────

export type PaymentLite = {
  amountUsd: Prisma.Decimal | string | number;
  status: PaymentStatus;
};

export type PaymentState = {
  totalCents: number;
  confirmedCents: number;
  pendingCents: number;
  remainingCents: number;
  halfCents: number;
  /** True until at least one payment has been CONFIRMED. */
  isFirstPayment: boolean;
  /** Convenience 2-dp strings for display. */
  total: string;
  confirmed: string;
  pending: string;
  remaining: string;
  half: string;
};

/**
 * A request's paid amount is the sum of its CONFIRMED payments; the remaining
 * balance is the quote total minus that sum. This is the single source of
 * truth for balances — pure so it can also run in server components/UI.
 */
export function computePaymentState(
  totalUsd: Prisma.Decimal | string | number | null,
  payments: PaymentLite[],
): PaymentState {
  const totalCents = toCents(totalUsd);
  let confirmedCents = 0;
  let pendingCents = 0;
  for (const p of payments) {
    if (p.status === "CONFIRMED") confirmedCents += toCents(p.amountUsd);
    else if (p.status === "PENDING_CONFIRMATION") pendingCents += toCents(p.amountUsd);
  }
  const remainingCents = Math.max(0, totalCents - confirmedCents);
  const halfCents = Math.round(totalCents / 2);
  return {
    totalCents,
    confirmedCents,
    pendingCents,
    remainingCents,
    halfCents,
    isFirstPayment: confirmedCents === 0,
    total: centsToUsd(totalCents),
    confirmed: centsToUsd(confirmedCents),
    pending: centsToUsd(pendingCents),
    remaining: centsToUsd(remainingCents),
    half: centsToUsd(halfCents),
  };
}

// ── Customer: submit a payment ───────────────────────────────────────────────

export type SubmitPaymentInput = {
  /** Required for the first payment only: pay half of the total, or all of it. */
  plan?: "half" | "full";
  method: PaymentMethod;
  senderAccountName?: string;
  senderPhone?: string;
  proofUrl?: string;
};

/**
 * Records a customer's declared payment as PENDING_CONFIRMATION. The amount is
 * always computed server-side from the quote total and the outstanding balance
 * — the client's amount is never trusted. Rules enforced here:
 *   • request must be APPROVED and have a quote total
 *   • no new payment while another is awaiting confirmation
 *   • the first payment must be online (FIB/FastPay/Qi Card) and half-or-full
 *   • a remainder payment settles the whole outstanding balance, online or COD
 */
export async function submitPayment(
  customerId: string,
  requestId: string,
  input: SubmitPaymentInput,
): Promise<SubmitResult> {
  const request = await prisma.partRequest.findUnique({
    where: { id: requestId },
    include: { payments: true },
  });
  if (!request || request.customerId !== customerId) return { ok: false, error: "requestNotFound" };
  if (!PAYABLE_STATUSES.includes(request.status) || request.priceUsd === null) {
    return { ok: false, error: "notPayable" };
  }

  const method = input.method;
  if (!ALL_METHODS.includes(method)) return { ok: false, error: "invalidMethod" };

  const state = computePaymentState(request.priceUsd, request.payments);
  if (state.pendingCents > 0) return { ok: false, error: "paymentPending" };
  if (state.remainingCents <= 0) return { ok: false, error: "alreadyPaid" };

  // Amount is derived, never taken from the client.
  let amountCents: number;
  if (state.isFirstPayment) {
    if (method === "CASH_ON_DELIVERY") return { ok: false, error: "firstMustBeOnline" };
    if (input.plan !== "half" && input.plan !== "full") return { ok: false, error: "invalidPlan" };
    amountCents = input.plan === "half" ? state.halfCents : state.totalCents;
  } else {
    // Remainder is always paid in one go.
    amountCents = state.remainingCents;
  }
  // Never exceed the outstanding balance; always positive.
  if (amountCents <= 0 || amountCents > state.remainingCents) amountCents = state.remainingCents;

  const isOnline = ONLINE_METHODS.includes(method);
  const senderAccountName = input.senderAccountName?.trim() || null;
  const senderPhone = input.senderPhone?.trim() || null;
  if (isOnline && (!senderAccountName || !senderPhone)) {
    return { ok: false, error: "senderRequired" };
  }

  const amountStr = centsToUsd(amountCents);
  try {
    const payment = await prisma.$transaction(async (tx) => {
      // Re-check under the transaction so a double-submit can't create two
      // pending payments.
      const pending = await tx.payment.count({
        where: { requestId, status: "PENDING_CONFIRMATION" },
      });
      if (pending > 0) throw new PaymentConflict();

      const created = await tx.payment.create({
        data: {
          requestId,
          amountUsd: amountStr,
          method,
          senderAccountName: isOnline ? senderAccountName : null,
          senderPhone: isOnline ? senderPhone : null,
          proofUrl: input.proofUrl ?? null,
          status: "PENDING_CONFIRMATION",
        },
      });
      await tx.statusLog.create({
        data: {
          requestId,
          status: request.status,
          note: `Payment submitted: $${amountStr} via ${method} (pending confirmation)`,
          noteKey: TIMELINE.paymentSubmitted,
          noteParams: { amount: amountStr, method },
          createdById: customerId,
        },
      });
      return created;
    });
    return { ok: true, paymentId: payment.id };
  } catch (e) {
    if (e instanceof PaymentConflict) return { ok: false, error: "paymentPending" };
    throw e;
  }
}

// ── Admin: confirm / reject a payment ────────────────────────────────────────

/**
 * Confirms a payment (money verified as received).
 *
 * Sourcing begins on the FIRST confirmed payment — whether it covers the whole
 * total or just a deposit — so the first confirmation advances the request into
 * the shipment pipeline (status SOURCING). A later payment that settles the
 * outstanding balance does NOT re-trigger sourcing; it only clears the balance.
 * `paidAt` is stamped only once the balance actually reaches zero.
 */
export async function confirmPayment(adminId: string, paymentId: string): Promise<ActionResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      request: { include: { part: true, brand: true, carModel: true, payments: true } },
    },
  });
  if (!payment) return { ok: false, error: "paymentNotFound" };
  if (payment.status !== "PENDING_CONFIRMATION") return { ok: false, error: "paymentNotPending" };
  const request = payment.request;

  // computePaymentState only sums CONFIRMED rows, so `before` reflects the
  // request BEFORE this (still-pending) payment counts.
  const before = computePaymentState(
    request.priceUsd,
    request.payments.filter((p) => p.id !== paymentId),
  );
  const paymentCents = toCents(payment.amountUsd);
  const isFirstConfirmed = before.confirmedCents === 0;
  const remainingAfter = Math.max(0, before.totalCents - (before.confirmedCents + paymentCents));
  const fullyPaid = remainingAfter <= 0;
  const amountStr = centsToUsd(paymentCents);
  const remainingStr = centsToUsd(remainingAfter);

  try {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!fresh || fresh.status !== "PENDING_CONFIRMATION") throw new PaymentConflict();

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: "CONFIRMED", confirmedAt: new Date(), confirmedByAdminId: adminId },
      });

      if (isFirstConfirmed) {
        // First money in the door → start sourcing immediately. paidAt is set
        // only if this payment also clears the whole balance.
        await tx.partRequest.update({
          where: { id: request.id },
          data: { status: "SOURCING", paidAt: fullyPaid ? new Date() : null },
        });
        if (fullyPaid) {
          await tx.statusLog.create({
            data: {
              requestId: request.id,
              status: "SOURCING",
              note: `Payment confirmed — paid in full ($${before.total}). Sourcing has begun.`,
              noteKey: TIMELINE.paymentPaidInFull,
              noteParams: { total: before.total },
              createdById: adminId,
            },
          });
          await tx.notification.create({
            data: {
              userId: request.customerId,
              requestId: request.id,
              type: "PAYMENT_CONFIRMED",
              templateKey: "paymentConfirmed",
              params: {
                part: partLabel(request),
                brand: request.brand?.name ?? request.rawBrandText ?? "",
                model: request.carModel?.name ?? request.rawModelText ?? "",
              },
              title: "Payment confirmed",
              body: `We received your payment for the ${partLabel(request)} (${request.brand?.name ?? request.rawBrandText ?? ""} ${request.carModel?.name ?? request.rawModelText ?? ""}). We're sourcing your part now.`,
            },
          });
        } else {
          await tx.statusLog.create({
            data: {
              requestId: request.id,
              status: "SOURCING",
              note: `First payment confirmed ($${amountStr}) — sourcing has begun. $${remainingStr} remaining.`,
              noteKey: TIMELINE.paymentFirstConfirmed,
              noteParams: { amount: amountStr, remaining: remainingStr },
              createdById: adminId,
            },
          });
          await tx.notification.create({
            data: {
              userId: request.customerId,
              requestId: request.id,
              type: "PAYMENT_CONFIRMED",
              templateKey: "paymentSourcingStarted",
              params: {
                part: partLabel(request),
                brand: request.brand?.name ?? request.rawBrandText ?? "",
                model: request.carModel?.name ?? request.rawModelText ?? "",
                amount: amountStr,
                remaining: remainingStr,
              },
              title: "Payment confirmed — sourcing started",
              body: `Your payment of $${amountStr} is confirmed — we've started sourcing your ${partLabel(request)}. $${remainingStr} remaining, to be settled before delivery.`,
            },
          });
        }
      } else if (fullyPaid) {
        // A later payment that clears the balance — sourcing already started, so
        // status is left untouched; we just settle and stamp paidAt.
        await tx.partRequest.update({
          where: { id: request.id },
          data: { paidAt: new Date() },
        });
        await tx.statusLog.create({
          data: {
            requestId: request.id,
            status: request.status,
            note: `Remaining balance settled ($${amountStr}).`,
            noteKey: TIMELINE.paymentSettled,
            noteParams: { amount: amountStr },
            createdById: adminId,
          },
        });
        await tx.notification.create({
          data: {
            userId: request.customerId,
            requestId: request.id,
            type: "PAYMENT_CONFIRMED",
            templateKey: "paymentSettled",
            params: {
              part: partLabel(request),
              brand: request.brand?.name ?? request.rawBrandText ?? "",
              model: request.carModel?.name ?? request.rawModelText ?? "",
              amount: amountStr,
            },
            title: "Balance settled",
            body: `Your remaining balance of $${amountStr} for the ${partLabel(request)} is settled. Thank you!`,
          },
        });
      } else {
        // Defensive: an additional partial payment while a balance still stands.
        // Sourcing already underway, so no status change.
        await tx.statusLog.create({
          data: {
            requestId: request.id,
            status: request.status,
            note: `Payment confirmed ($${amountStr}) — $${remainingStr} remaining.`,
            noteKey: TIMELINE.paymentPartialConfirmed,
            noteParams: { amount: amountStr, remaining: remainingStr },
            createdById: adminId,
          },
        });
        await tx.notification.create({
          data: {
            userId: request.customerId,
            requestId: request.id,
            type: "PAYMENT_CONFIRMED",
            templateKey: "paymentConfirmedPartial",
            params: {
              part: partLabel(request),
              brand: request.brand?.name ?? request.rawBrandText ?? "",
              model: request.carModel?.name ?? request.rawModelText ?? "",
              amount: amountStr,
              remaining: remainingStr,
            },
            title: "Payment confirmed",
            body: `We confirmed your payment of $${amountStr} for the ${partLabel(request)}. $${remainingStr} remaining.`,
          },
        });
      }
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof PaymentConflict) return { ok: false, error: "paymentNotPending" };
    throw e;
  }
}

/** Rejects a payment with a required, customer-visible reason. */
export async function rejectPayment(
  adminId: string,
  paymentId: string,
  note: string,
): Promise<ActionResult> {
  const reason = note?.trim();
  if (!reason) return { ok: false, error: "rejectReasonRequired" };

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { request: { include: { part: true, brand: true, carModel: true } } },
  });
  if (!payment) return { ok: false, error: "paymentNotFound" };
  if (payment.status !== "PENDING_CONFIRMATION") return { ok: false, error: "paymentNotPending" };
  const request = payment.request;
  const amountStr = centsToUsd(toCents(payment.amountUsd));

  try {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!fresh || fresh.status !== "PENDING_CONFIRMATION") throw new PaymentConflict();

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "REJECTED",
          adminNote: reason,
          confirmedByAdminId: adminId,
          confirmedAt: new Date(),
        },
      });
      await tx.statusLog.create({
        data: {
          requestId: request.id,
          status: "APPROVED",
          note: `Payment rejected ($${amountStr}): ${reason}`,
          noteKey: TIMELINE.paymentRejected,
          noteParams: { amount: amountStr, reason },
          createdById: adminId,
        },
      });
      await tx.notification.create({
        data: {
          userId: request.customerId,
          requestId: request.id,
          type: "PAYMENT_REJECTED",
          templateKey: "paymentRejected",
          params: {
            part: partLabel(request),
            brand: request.brand?.name ?? request.rawBrandText ?? "",
            model: request.carModel?.name ?? request.rawModelText ?? "",
            amount: amountStr,
            reason,
          },
          title: "Payment needs attention",
          body: `Your payment of $${amountStr} for the ${partLabel(request)} couldn't be confirmed: ${reason}. Please submit a new payment.`,
        },
      });
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof PaymentConflict) return { ok: false, error: "paymentNotPending" };
    throw e;
  }
}

// ── Receiving accounts (admin-configurable business details) ─────────────────

export async function getReceivingAccounts() {
  return prisma.paymentReceivingAccount.findMany();
}

/**
 * Qi Card is identified by a card number AND the registered phone; customers
 * need both. Other methods use a single identifier.
 */
export function methodNeedsSecondField(method: PaymentMethod): boolean {
  return method === "QICARD";
}

/**
 * True when an account still holds seeded placeholder text rather than real
 * business details. Checked on both the admin settings page (badge) and the
 * customer payment screen (warning), so it lives here rather than being
 * re-implemented per page. A missing row counts as a placeholder.
 */
export function isPlaceholderAccount(
  account?: {
    accountName: string;
    accountNumberOrPhone: string;
    accountNumberOrPhone2?: string | null;
  } | null,
): boolean {
  if (!account) return true;
  return [account.accountName, account.accountNumberOrPhone, account.accountNumberOrPhone2].some(
    (v) => typeof v === "string" && v.trim().toUpperCase().startsWith("PLACEHOLDER"),
  );
}

export async function updateReceivingAccount(
  method: PaymentMethod,
  accountName: string,
  accountNumberOrPhone: string,
  accountNumberOrPhone2?: string,
): Promise<ActionResult> {
  if (!ONLINE_METHODS.includes(method)) return { ok: false, error: "invalidMethod" };
  const name = accountName.trim();
  const num = accountNumberOrPhone.trim();
  if (!name || !num) return { ok: false, error: "accountFieldsRequired" };

  // The second field is only meaningful for methods that use it; blank clears it.
  const num2 = methodNeedsSecondField(method) ? accountNumberOrPhone2?.trim() || null : null;
  if (methodNeedsSecondField(method) && !num2) {
    return { ok: false, error: "accountFieldsRequired" };
  }

  await prisma.paymentReceivingAccount.upsert({
    where: { method },
    update: { accountName: name, accountNumberOrPhone: num, accountNumberOrPhone2: num2 },
    create: {
      method,
      accountName: name,
      accountNumberOrPhone: num,
      accountNumberOrPhone2: num2,
    },
  });
  return { ok: true };
}
