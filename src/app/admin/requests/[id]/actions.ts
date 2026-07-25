"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sendQuote } from "@/lib/quotes";
import { advanceShipment } from "@/lib/shipments";
import type { SourceCountry } from "@/generated/prisma/enums";

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
  redirect(`/admin/requests/${requestId}?sent=1`);
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
  redirect(`/admin/requests/${requestId}?advanced=1`);
}
