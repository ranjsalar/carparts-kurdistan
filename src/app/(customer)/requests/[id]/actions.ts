"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { decideQuote, selectPaymentMethod } from "@/lib/payments";
import { saveUpload } from "@/lib/storage";
import type { PaymentMethod } from "@/generated/prisma/enums";

// IDs are Prisma cuids; anything else (e.g. path-traversal attempts that
// would end up interpolated into redirect URLs) bails out to the list page.
const ID_PATTERN = /^[a-z0-9]{10,40}$/i;

function requestIdFrom(formData: FormData): string {
  const value = formData.get("requestId");
  const id = typeof value === "string" ? value : "";
  if (!ID_PATTERN.test(id)) redirect("/requests");
  return id;
}

async function finish(requestId: string, result: { ok: boolean; error?: string }, flag: string) {
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  revalidatePath("/admin/requests");
  if (!result.ok) {
    redirect(`/requests/${requestId}?error=${encodeURIComponent(result.error ?? "Failed")}`);
  }
  redirect(`/requests/${requestId}?${flag}=1`);
}

export async function approveQuoteAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const requestId = requestIdFrom(formData);
  const result = await decideQuote(user.id, requestId, "approve");
  await finish(requestId, result, "approved");
}

export async function rejectQuoteAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const requestId = requestIdFrom(formData);
  const result = await decideQuote(user.id, requestId, "reject");
  await finish(requestId, result, "rejected");
}

export async function choosePaymentAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const requestId = requestIdFrom(formData);
  const method = formData.get("method");

  let proofUrl: string | undefined;
  const proof = formData.get("proof");
  if (method === "BANK_TRANSFER" && proof instanceof File && proof.size > 0) {
    const saved = await saveUpload(proof);
    if (!saved.ok) {
      redirect(`/requests/${requestId}?error=${encodeURIComponent(saved.error)}`);
    }
    proofUrl = saved.url;
  }

  const result = await selectPaymentMethod(
    user.id,
    requestId,
    (typeof method === "string" ? method : "") as PaymentMethod,
    proofUrl,
  );
  await finish(requestId, result, "method");
}
