"use client";

import { createContext, useContext, useEffect, useState } from "react";

const POLL_MS = 45_000;

/*
  One live unread count, shared by everything that displays it.

  Both the primary "Notifications" nav item and the secondary bell show this
  number. They used to be a single component that owned its own polling; now
  that two places need it, the poll lives here instead so the app still makes
  exactly one count request per interval rather than one per indicator.
*/
type UnreadValue = { count: number; setCount: (n: number) => void };

const UnreadContext = createContext<UnreadValue | null>(null);

export function UnreadCountProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(initialCount);

  // A server re-render (navigation) is authoritative — adopt its value. This
  // is React's "adjust state during render" pattern rather than an effect, so
  // the new value is used on this render instead of causing a second pass.
  // It matters here: reading notifications marks them read server-side, and
  // the badge must drop on that navigation, not a frame later.
  const [lastFromServer, setLastFromServer] = useState(initialCount);
  if (lastFromServer !== initialCount) {
    setLastFromServer(initialCount);
    setCount(initialCount);
  }

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (!res.ok) return;
        const data: unknown = await res.json();
        const next = (data as { count?: unknown })?.count;
        if (!cancelled && typeof next === "number") setCount(next);
      } catch {
        // Offline or navigating away — keep the last known count.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }

    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <UnreadContext.Provider value={{ count, setCount }}>{children}</UnreadContext.Provider>
  );
}

/** Live unread count. Falls back to the server value outside a provider. */
export function useUnreadCount(fallback = 0): number {
  return useContext(UnreadContext)?.count ?? fallback;
}

/**
 * Sets the shared count directly. Used when the client already knows the count
 * changed — reading the notifications page zeroes it — so both badges update
 * immediately instead of waiting out the poll interval.
 */
export function useSetUnreadCount(): (n: number) => void {
  const ctx = useContext(UnreadContext);
  return ctx?.setCount ?? (() => {});
}
