"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ID_PATTERN = /^[a-z0-9]{10,40}$/i;

/**
 * Acknowledges a security alert. Acknowledging clears it from the alert bar
 * but never deletes it — the event stays on the activity screen as a permanent
 * record of what was seen and who signed it off.
 */
export async function acknowledgeSecurityEvent(formData: FormData) {
  const admin = await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !ID_PATTERN.test(id)) redirect("/admin/activity");

  await prisma.securityEvent.updateMany({
    where: { id, acknowledgedAt: null },
    data: { acknowledgedAt: new Date(), acknowledgedBy: admin.email ?? admin.id },
  });

  revalidatePath("/admin/activity");
  revalidatePath("/admin");
  redirect("/admin/activity");
}
