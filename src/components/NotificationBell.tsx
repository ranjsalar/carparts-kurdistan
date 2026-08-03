"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconBell } from "@/components/icons";

const POLL_MS = 45_000;

/**
 * Header bell with a live unread badge.
 *
 * The count is server-rendered for the first paint, then kept fresh by a light
 * poll plus a refetch whenever the tab regains focus — so someone who leaves a
 * page open still sees a new notification arrive. Deliberately not websockets:
 * one small count query on a slow interval is enough here.
 */
export function NotificationBell({
  initialCount,
  label,
}: {
  initialCount: number;
  label: string;
}) {
  const [count, setCount] = useState(initialCount);

  // A server re-render (navigation) is authoritative — adopt its value. This is
  // React's "adjust state during render" pattern rather than an effect, so the
  // new value is used on this render instead of causing a second pass.
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
    <Link
      href="/notifications"
      aria-label={label}
      className="relative flex h-11 w-11 items-center justify-center rounded-lg text-steel-500 transition-colors hover:bg-steel-100 hover:text-steel-900"
    >
      <IconBell size={20} />
      {count > 0 && (
        <span
          aria-live="polite"
          className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 font-heading text-[10px] font-bold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
