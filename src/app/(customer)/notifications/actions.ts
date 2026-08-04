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

/**
 * Marks everything read because the customer is looking at the page right now.
 *
 * Called from a mount effect rather than during the page render: Next prefetches
 * <Link> targets, so rendering the page is not proof anyone saw it — a hover
 * over the notifications nav item or the bell would silently clear the badge.
 * Mounting in the browser is.
 *
 * Deliberately does NOT revalidate. The list keeps its unread highlighting for
 * this visit, so the customer can still see which items are new; revalidating
 * would repaint them as read under their eyes a moment after arriving.
 */
export async function markNotificationsViewed() {
  const user = await getSessionUser();
  if (!user) return;

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
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
