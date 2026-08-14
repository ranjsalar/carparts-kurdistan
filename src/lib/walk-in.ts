import { prisma } from "./db";
import { TIMELINE } from "./timeline";
import { isPartCondition } from "./request-display";
import { centsToUsd, toCents } from "./payments";
import type { PartCondition, PaymentMethod, SourceCountry } from "@/generated/prisma/enums";

/*
  Creating an order at the counter.

  On the web this is three separate acts spread over days: the customer submits
  a request, an admin quotes it, the customer approves and pays, and an admin
  confirms the payment. In person all four happen in one conversation — the
  price is known, the customer is standing there, and the admin is the one
  taking the money, so there is nobody left to wait for.

  So this collapses that sequence into a single transaction while producing the
  SAME shape of record: the same statuses, the same itemised price, the same
  Payment rows, the same status-log entries. Downstream, a walk-in order is
  indistinguishable from a web order — advanceShipment, the payments queue and
  the customer-management screens all treat it identically. The only difference
  is `channel`, and the absence of a User to notify.
*/

const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

function parseComponent(raw: string | undefined): number | null {
  const value = raw?.trim() ?? "";
  if (value === "") return 0;
  if (!PRICE_PATTERN.test(value)) return null;
  return Number(value);
}

export type WalkInInput = {
  // Who is standing at the counter. Name and phone are the minimum needed to
  // call them back when the part lands; email is genuinely optional here.
  walkInName: string;
  walkInPhone: string;
  walkInEmail?: string;

  // Vehicle + part: identical shape to the web request, including the
  // "Other — not listed" free-text fallbacks.
  brandId?: string;
  carModelId?: string;
  yearRangeId?: string;
  trimId?: string;
  partId?: string;
  rawBrandText?: string;
  rawModelText?: string;
  rawYearText?: string;
  rawTrimText?: string;
  rawPartText?: string;
  partCondition?: string;
  colorCode?: string;
  notes?: string;

  source: string;

  // The price, known on the spot.
  pricePartUsd: string;
  priceShippingUsd?: string;
  priceTaxUsd?: string;
  priceDeliveryUsd?: string;

  // Payment taken now, if any. "none" records the order without payment — the
  // customer agreed the price but is paying later.
  paymentPlan: "none" | "half" | "full";
  paymentMethod?: string;
};

export type WalkInResult = { ok: true; id: string } | { ok: false; error: string };

const ONLINE: PaymentMethod[] = ["FIB", "FASTPAY", "QICARD"];

export async function createWalkInOrder(
  adminId: string,
  input: WalkInInput,
): Promise<WalkInResult> {
  const text = (v: string | undefined) => v?.trim() || null;

  const walkInName = text(input.walkInName);
  const walkInPhone = text(input.walkInPhone);
  if (!walkInName) return { ok: false, error: "walkInNameRequired" };
  if (!walkInPhone) return { ok: false, error: "walkInPhoneRequired" };

  const rawBrandText = text(input.rawBrandText);
  const rawModelText = text(input.rawModelText);
  const rawYearText = text(input.rawYearText);
  const rawTrimText = text(input.rawTrimText);
  const rawPartText = text(input.rawPartText);

  const [model, yearRange, trim, part] = await Promise.all([
    input.carModelId ? prisma.carModel.findUnique({ where: { id: input.carModelId } }) : null,
    input.yearRangeId ? prisma.yearRange.findUnique({ where: { id: input.yearRangeId } }) : null,
    input.trimId ? prisma.trim.findUnique({ where: { id: input.trimId } }) : null,
    input.partId ? prisma.part.findUnique({ where: { id: input.partId } }) : null,
  ]);

  // Same either-or rule as the web form: a catalog id, or typed text.
  if (!input.brandId && !rawBrandText) return { ok: false, error: "brandRequired" };
  if (!input.carModelId && !rawModelText) return { ok: false, error: "modelRequired" };
  if (!input.yearRangeId && !rawYearText) return { ok: false, error: "yearRequired" };
  if (!input.partId && !rawPartText) return { ok: false, error: "partRequired" };

  if (input.carModelId && (!model || model.brandId !== input.brandId)) {
    return { ok: false, error: "vehicleMismatch" };
  }
  if (input.yearRangeId && (!yearRange || !model || yearRange.carModelId !== model.id)) {
    return { ok: false, error: "vehicleMismatch" };
  }
  if (input.trimId && (!trim || !model || trim.carModelId !== model.id)) {
    return { ok: false, error: "vehicleMismatch" };
  }
  if (input.partId && !part) return { ok: false, error: "partNotFound" };

  const colorCode = text(input.colorCode);
  if (part?.requiresColorCode && !colorCode) return { ok: false, error: "colorRequired" };

  let partCondition: PartCondition | null = null;
  if (part?.conditionApplies) {
    if (!isPartCondition(input.partCondition)) return { ok: false, error: "conditionRequired" };
    partCondition = input.partCondition;
  } else if (input.partCondition) {
    return { ok: false, error: "conditionNotApplicable" };
  }

  if (input.source !== "CHINA" && input.source !== "DUBAI") {
    return { ok: false, error: "invalidSource" };
  }
  const source = input.source as SourceCountry;

  // Price, recomputed here from the components — the browser's arithmetic is
  // never trusted, exactly as in sendQuote().
  const partPrice = input.pricePartUsd?.trim() ?? "";
  if (!PRICE_PATTERN.test(partPrice) || Number(partPrice) <= 0) {
    return { ok: false, error: "invalidBreakdown" };
  }
  const shipping = parseComponent(input.priceShippingUsd);
  const tax = parseComponent(input.priceTaxUsd);
  const delivery = parseComponent(input.priceDeliveryUsd);
  if (shipping === null || tax === null || delivery === null) {
    return { ok: false, error: "invalidBreakdown" };
  }
  const totalCents =
    Math.round(Number(partPrice) * 100) +
    Math.round(shipping * 100) +
    Math.round(tax * 100) +
    Math.round(delivery * 100);
  const total = centsToUsd(totalCents);

  // Payment, if the customer is settling now.
  const plan = input.paymentPlan;
  if (plan !== "none" && plan !== "half" && plan !== "full") {
    return { ok: false, error: "invalidPaymentPlan" };
  }
  let method: PaymentMethod | null = null;
  let payCents = 0;
  if (plan !== "none") {
    const m = input.paymentMethod as PaymentMethod | undefined;
    if (!m || !["FIB", "FASTPAY", "QICARD", "CASH_ON_DELIVERY"].includes(m)) {
      return { ok: false, error: "invalidPaymentMethod" };
    }
    // Same rule as the web flow: the first payment cannot be cash on delivery,
    // because "collect on delivery" is not a payment that has happened yet.
    if (!ONLINE.includes(m)) {
      return { ok: false, error: "firstMustBeOnline" };
    }
    method = m;
    payCents = plan === "half" ? Math.round(totalCents / 2) : totalCents;
  }

  const fullyPaid = payCents >= totalCents && payCents > 0;
  const notes = text(input.notes);

  /*
    Status reflects how far the counter conversation actually got:
      no payment  → APPROVED. The price was agreed in person, so it is past
                    QUOTED; it is simply awaiting money.
      part paid   → SOURCING, matching confirmPayment(): first money in the
                    door starts sourcing.
      paid in full→ SOURCING with paidAt stamped.
    Nothing here can land on PENDING or QUOTED, because both describe waiting
    on a customer who is standing in front of you.
  */
  const status = payCents > 0 ? "SOURCING" : "APPROVED";
  const now = new Date();

  const created = await prisma.$transaction(async (tx) => {
    const request = await tx.partRequest.create({
      data: {
        channel: "WALK_IN",
        walkInName,
        walkInPhone,
        walkInEmail: text(input.walkInEmail),
        brandId: input.brandId || null,
        carModelId: model?.id ?? null,
        yearRangeId: yearRange?.id ?? null,
        trimId: trim?.id ?? null,
        partId: part?.id ?? null,
        rawBrandText,
        rawModelText,
        rawYearText,
        rawTrimText,
        rawPartText,
        partCondition,
        colorCode,
        notes,
        preferredSource: source,
        source,
        status,
        priceUsd: total,
        pricePartUsd: Number(partPrice).toFixed(2),
        priceShippingUsd: shipping.toFixed(2),
        priceTaxUsd: tax.toFixed(2),
        priceDeliveryUsd: delivery.toFixed(2),
        quotedById: adminId,
        quotedAt: now,
        approvedAt: now,
        paidAt: fullyPaid ? now : null,
      },
    });

    // The timeline reads the same as a web order's, so the history is
    // comparable: submitted, quoted, approved — then payment if taken.
    await tx.statusLog.createMany({
      data: [
        {
          requestId: request.id,
          status: "PENDING",
          note: "Walk-in order created at the counter",
          noteKey: TIMELINE.requestSubmitted,
          noteParams: {},
          createdById: adminId,
        },
        {
          requestId: request.id,
          status: "QUOTED",
          note: `Quote set: $${total} (sourced from ${source === "CHINA" ? "China" : "Dubai"})`,
          noteKey: TIMELINE.quoteSent,
          noteParams: { total, source },
          createdById: adminId,
        },
        {
          requestId: request.id,
          status: "APPROVED",
          note: "Accepted in person",
          noteKey: TIMELINE.quoteApproved,
          noteParams: {},
          createdById: adminId,
        },
      ],
    });

    if (method && payCents > 0) {
      // Confirmed immediately: the admin took the money and is recording it,
      // so there is no second party left to verify it.
      await tx.payment.create({
        data: {
          requestId: request.id,
          amountUsd: centsToUsd(payCents),
          method,
          status: "CONFIRMED",
          senderAccountName: walkInName,
          senderPhone: walkInPhone,
          confirmedAt: now,
          confirmedByAdminId: adminId,
        },
      });
      await tx.statusLog.create({
        data: {
          requestId: request.id,
          status: "SOURCING",
          note: fullyPaid
            ? `Payment taken in person — paid in full ($${total}). Sourcing has begun.`
            : `Payment taken in person ($${centsToUsd(payCents)}) — sourcing has begun. $${centsToUsd(totalCents - payCents)} remaining.`,
          noteKey: fullyPaid ? TIMELINE.paymentPaidInFull : TIMELINE.paymentFirstConfirmed,
          noteParams: fullyPaid
            ? { total }
            : { amount: centsToUsd(payCents), remaining: centsToUsd(totalCents - payCents) },
          createdById: adminId,
        },
      });
    }

    return request;
  });

  return { ok: true, id: created.id };
}

/** Web vs walk-in counts and value, for the dashboard split. */
export async function getChannelBreakdown() {
  const [rows, settled] = await Promise.all([
    prisma.partRequest.groupBy({ by: ["channel"], _count: { _all: true } }),
    prisma.partRequest.findMany({
      where: { priceUsd: { not: null } },
      select: { channel: true, priceUsd: true },
    }),
  ]);

  const count = (c: string) => rows.find((r) => r.channel === c)?._count._all ?? 0;
  const valueCents = (c: string) =>
    settled.filter((r) => r.channel === c).reduce((sum, r) => sum + toCents(r.priceUsd), 0);

  return {
    web: { count: count("WEB"), value: centsToUsd(valueCents("WEB")) },
    walkIn: { count: count("WALK_IN"), value: centsToUsd(valueCents("WALK_IN")) },
  };
}
