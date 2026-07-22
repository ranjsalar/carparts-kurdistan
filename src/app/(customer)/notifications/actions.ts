"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function markNotificationRead(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const value = formData.get("id");
  const id = typeof value === "string" ? value : "";
  // updateMany so a forged id belonging to another user is a silent no-op
  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}
