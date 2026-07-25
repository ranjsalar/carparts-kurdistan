"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { confirmPayment, rejectPayment } from "@/lib/payments";

const ID_PATTERN = /^[a-z0-9]{10,40}$/i;

function safeId(value: FormDataEntryValue | null, fallback: string): string {
  const id = typeof value === "string" ? value : "";
  if (!ID_PATTERN.test(id)) redirect(fallback);
  return id;
}

/** Revalidate every surface a payment change is visible on. */
function revalidateAll(requestId: string) {
  revalidatePath("/admin/payments");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin");
  revalidatePath("/requests");
  revalidatePath(`/requests/${requestId}`);
}

/**
 * Confirm/reject can be triggered from the global payments queue or from a
 * request's detail page; `source` decides where the admin lands afterward so
 * they're never left on a stale screen.
 */
function destination(source: string, requestId: string, query: string): string {
  return source === "detail"
    ? `/admin/requests/${requestId}?${query}`
    : `/admin/payments?${query}`;
}

export async function confirmPaymentAction(formData: FormData) {
  const admin = await requireAdmin();
  const paymentId = safeId(formData.get("paymentId"), "/admin/payments");
  const requestId = safeId(formData.get("requestId"), "/admin/payments");
  const source = typeof formData.get("source") === "string" ? String(formData.get("source")) : "";

  const result = await confirmPayment(admin.id, paymentId);
  revalidateAll(requestId);

  if (!result.ok) {
    redirect(destination(source, requestId, `error=${encodeURIComponent(result.error)}`));
  }
  redirect(destination(source, requestId, source === "detail" ? "paid=1" : "confirmed=1"));
}

export async function rejectPaymentAction(formData: FormData) {
  const admin = await requireAdmin();
  const paymentId = safeId(formData.get("paymentId"), "/admin/payments");
  const requestId = safeId(formData.get("requestId"), "/admin/payments");
  const source = typeof formData.get("source") === "string" ? String(formData.get("source")) : "";
  const noteValue = formData.get("note");
  const note = typeof noteValue === "string" ? noteValue : "";

  const result = await rejectPayment(admin.id, paymentId, note);
  revalidateAll(requestId);

  if (!result.ok) {
    redirect(destination(source, requestId, `error=${encodeURIComponent(result.error)}`));
  }
  redirect(destination(source, requestId, "rejected=1"));
}
