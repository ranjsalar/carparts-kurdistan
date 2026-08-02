import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * Unread-notification count for the signed-in user. Polled by the header bell
 * so a badge appears without the user navigating. Deliberately tiny: one
 * indexed COUNT, no caching.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ count: 0 }, { status: 401 });

  const count = await prisma.notification.count({
    where: { userId: session.userId, readAt: null },
  });

  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
