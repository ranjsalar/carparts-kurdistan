"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createWalkInOrder } from "@/lib/walk-in";
import { ADMIN_ACTION, logAdminActivity } from "@/lib/admin-activity";

export type WalkInActionResult = { ok: false; error: string };

/**
 * Creates a counter order. On success this redirects to the new request, so it
 * only ever returns when something failed — the form reads the error key and
 * renders it from the shared `errors` namespace, exactly like createRequest.
 */
export async function createWalkInAction(formData: FormData): Promise<WalkInActionResult | void> {
  const admin = await requireAdmin();

  const field = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  const result = await createWalkInOrder(admin.id, {
    walkInName: field("walkInName"),
    walkInPhone: field("walkInPhone"),
    walkInEmail: field("walkInEmail"),
    brandId: field("brandId"),
    carModelId: field("carModelId"),
    yearRangeId: field("yearRangeId"),
    trimId: field("trimId"),
    partId: field("partId"),
    rawBrandText: field("rawBrandText"),
    rawModelText: field("rawModelText"),
    rawYearText: field("rawYearText"),
    rawTrimText: field("rawTrimText"),
    rawPartText: field("rawPartText"),
    partCondition: field("partCondition"),
    colorCode: field("colorCode"),
    notes: field("notes"),
    source: field("source"),
    pricePartUsd: field("pricePartUsd"),
    priceShippingUsd: field("priceShippingUsd"),
    priceTaxUsd: field("priceTaxUsd"),
    priceDeliveryUsd: field("priceDeliveryUsd"),
    paymentPlan: field("paymentPlan") as "none" | "half" | "full",
    paymentMethod: field("paymentMethod"),
  });

  if (!result.ok) return { ok: false, error: result.error };

  await logAdminActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ADMIN_ACTION.walkInOrderCreated,
    summary: `Created walk-in order ${result.id} for ${field("walkInName")} (${field("walkInPhone")})`,
    targetType: "request",
    targetId: result.id,
  });

  revalidatePath("/admin/requests");
  revalidatePath("/admin");
  redirect(`/admin/requests/${result.id}?success=walkInCreated`);
}
