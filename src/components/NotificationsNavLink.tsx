"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useUnreadCount } from "./UnreadCount";

/*
  Notifications as a first-class nav destination, sitting alongside "New
  request" and "My requests" with the same weight — not only an icon someone
  has to notice. The unread badge is live (see UnreadCountProvider).
*/
export function NotificationsNavLink({
  label,
  initialCount,
  className,
}: {
  label: string;
  initialCount: number;
  className: string;
}) {
  const t = useTranslations("nav");
  const count = useUnreadCount(initialCount);

  return (
    <Link href="/notifications" className={className}>
      {label}
      {count > 0 && (
        <span
          aria-live="polite"
          // aria-label rather than bare digits: "3" alone is meaningless to a
          // screen reader landing on it out of context. Translated like any
          // other user-facing string — a screen reader in Kurdish or Arabic
          // should not suddenly announce an English word.
          aria-label={t("unreadBadge", { count })}
          className="ms-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 font-heading text-[10px] font-bold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
