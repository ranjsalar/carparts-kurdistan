import { prisma } from "./db";
import type { SourceCountry } from "@/generated/prisma/enums";

// Itemized quote: part price is required; the other components are optional
// and treated as 0 when blank. priceUsd (the total the customer pays) is
// always computed server-side from the four components — never trusted from
// the client.
export type SendQuoteInput = {
  source: SourceCountry;
  pricePartUsd: string;
  priceShippingUsd?: string;
  priceTaxUsd?: string;
  priceDeliveryUsd?: string;
  quoteNotes?: string;
};

export type SendQuoteResult = { ok: true } | { ok: false; error: string };

const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

/** Parses an optional money field: blank → 0, invalid → null. */
function parseComponent(raw: string | undefined): number | null {
  const value = raw?.trim() ?? "";
  if (value === "") return 0;
  if (!PRICE_PATTERN.test(value)) return null;
  return Number(value);
}

/**
 * Sends (or updates) a quote on a request: stores the itemized breakdown
 * (part / shipping / tax / local delivery), computes the total, stamps who
 * quoted and when, moves status to QUOTED, appends a status-log entry, and
 * creates the customer's in-app notification — all in one transaction.
 */
export async function sendQuote(
  adminId: string,
  requestId: string,
  input: SendQuoteInput,
): Promise<SendQuoteResult> {
  const part = input.pricePartUsd?.trim() ?? "";
  if (!PRICE_PATTERN.test(part) || Number(part) <= 0) {
    return { ok: false, error: "invalidBreakdown" };
  }
  const shipping = parseComponent(input.priceShippingUsd);
  const tax = parseComponent(input.priceTaxUsd);
  const delivery = parseComponent(input.priceDeliveryUsd);
  if (shipping === null || tax === null || delivery === null) {
    return { ok: false, error: "invalidBreakdown" };
  }
  if (input.source !== "CHINA" && input.source !== "DUBAI") {
    return { ok: false, error: "invalidSource" };
  }

  // Work in cents to avoid float drift on the computed total.
  const totalCents =
    Math.round(Number(part) * 100) +
    Math.round(shipping * 100) +
    Math.round(tax * 100) +
    Math.round(delivery * 100);
  const total = (totalCents / 100).toFixed(2);

  const request = await prisma.partRequest.findUnique({
    where: { id: requestId },
    include: { part: true, brand: true, carModel: true },
  });
  if (!request) return { ok: false, error: "requestNotFound" };
  if (request.status !== "PENDING" && request.status !== "QUOTED") {
    return { ok: false, error: "cantQuoteNow" };
  }

  const isUpdate = request.status === "QUOTED";
  const sourceLabel = input.source === "CHINA" ? "China" : "Dubai";
  const quoteNotes = input.quoteNotes?.trim() || null;

  await prisma.$transaction([
    prisma.partRequest.update({
      where: { id: requestId },
      data: {
        status: "QUOTED",
        source: input.source,
        priceUsd: total,
        pricePartUsd: Number(part).toFixed(2),
        priceShippingUsd: shipping.toFixed(2),
        priceTaxUsd: tax.toFixed(2),
        priceDeliveryUsd: delivery.toFixed(2),
        quoteNotes,
        quotedById: adminId,
        quotedAt: new Date(),
      },
    }),
    prisma.statusLog.create({
      data: {
        requestId,
        status: "QUOTED",
        note: `${isUpdate ? "Quote updated" : "Quote sent"}: $${total} (sourced from ${sourceLabel})`,
        createdById: adminId,
      },
    }),
    prisma.notification.create({
      data: {
        userId: request.customerId,
        requestId,
        type: "QUOTE_SENT",
        title: isUpdate ? "Your quote was updated" : "Your quote is ready",
        body: `${request.part.name} for your ${request.brand.name} ${request.carModel.name}: $${total}. Open “My requests” to review and approve.`,
      },
    }),
  ]);

  // TODO: also send this notification to the customer over WhatsApp
  // (WhatsApp Business API via Twilio or Meta) once a provider account exists.
  // The Notification row above is the source of truth; the WhatsApp send
  // should be triggered right here with the same title/body.

  return { ok: true };
}
