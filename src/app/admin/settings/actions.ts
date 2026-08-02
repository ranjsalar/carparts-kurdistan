"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { updateReceivingAccount } from "@/lib/payments";
import type { PaymentMethod } from "@/generated/prisma/enums";

const ONLINE = ["FIB", "FASTPAY", "QICARD"];

export async function updateReceivingAccountAction(formData: FormData) {
  await requireAdmin();

  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  const method = str("method");
  if (!ONLINE.includes(method)) redirect("/admin/settings");

  const result = await updateReceivingAccount(
    method as PaymentMethod,
    str("accountName"),
    str("accountNumberOrPhone"),
    str("accountNumberOrPhone2"),
  );

  revalidatePath("/admin/settings");
  if (!result.ok) {
    redirect(`/admin/settings?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin/settings?saved=1");
}
