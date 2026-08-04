"use client";

import Link from "next/link";
import { IconBell } from "@/components/icons";
import { useUnreadCount } from "./UnreadCount";

/**
 * Secondary unread indicator.
 *
 * The primary surface is now the labelled "Notifications" nav item; this stays
 * as the at-a-glance badge for someone already working inside the app. It no
 * longer owns the polling — the count comes from UnreadCountProvider, so both
 * indicators move together and only one request goes out per interval.
 */
export function NotificationBell({
  initialCount,
  label,
}: {
  initialCount: number;
  label: string;
}) {
  const count = useUnreadCount(initialCount);

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `${label} (${count} unread)` : label}
      className="relative flex h-11 w-11 items-center justify-center rounded-lg text-steel-500 transition-colors hover:bg-steel-100 hover:text-steel-900"
    >
      <IconBell size={20} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 font-heading text-[10px] font-bold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
