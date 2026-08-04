"use client";

import { useEffect, useRef } from "react";
import { useSetUnreadCount } from "@/components/UnreadCount";
import { markNotificationsViewed } from "./actions";

/**
 * Marks notifications read because the customer is actually looking at them.
 *
 * This is what makes the post-login redirect fire once per batch of news rather
 * than on every sign-in: landing here is what clears the unread state, so the
 * next login lands on the home page instead.
 *
 * Renders nothing. Runs on mount only — see markNotificationsViewed() for why
 * this is a browser effect and not part of the server render.
 */
export function MarkViewedOnMount({ hasUnread }: { hasUnread: boolean }) {
  const setUnreadCount = useSetUnreadCount();
  const done = useRef(false);

  useEffect(() => {
    if (!hasUnread || done.current) return;
    done.current = true;

    // Clear the badges first: the write has already been decided, and waiting
    // on the round trip would leave a count sitting there that the customer
    // can plainly see is stale.
    setUnreadCount(0);
    void markNotificationsViewed();
  }, [hasUnread, setUnreadCount]);

  return null;
}
