"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/*
  Two-tap confirm that happens in place.

  Used for the payments queue, where confirming is the common case and should
  not cost a page navigation — but where a stray click still moves real money,
  so it should not be a single unguarded tap either. The first tap arms the
  button and shows exactly what is about to happen; the second submits.

  Deliberately not the ConfirmSubmit modal: that is for destructive, rare
  actions. This runs dozens of times a day, and a modal every time would be
  slower than the page navigation it replaces.
*/
export function InlineConfirm({
  label,
  armedLabel,
  cancelLabel,
  className,
}: {
  label: string;
  /** Shown once armed — should name the specific consequence. */
  armedLabel: string;
  cancelLabel: string;
  className: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  const wrapRef = useRef<HTMLSpanElement>(null);

  // Disarm on outside click or Escape, so a half-pressed button never sits
  // armed while the admin moves on to a different row.
  useEffect(() => {
    if (!armed) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setArmed(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setArmed(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [armed]);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={className} disabled={pending}>
        {label}
      </button>
    );
  }

  return (
    <span ref={wrapRef} className="inline-flex items-center gap-2">
      <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
        <span className="inline-flex items-center gap-2">
          {pending && (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              aria-hidden
              className="animate-spin"
            >
              <path d="M12 3 a9 9 0 1 1-6.36 2.64" />
            </svg>
          )}
          {armedLabel}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        disabled={pending}
        className="text-caption font-semibold text-steel-500 hover:text-steel-800 hover:underline"
      >
        {cancelLabel}
      </button>
    </span>
  );
}
