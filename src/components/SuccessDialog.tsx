"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Confirmation shown after an action succeeds.
 *
 * The server action redirects with `?success=<key>`; the destination page
 * renders this. Navigation to the next screen happens only when the user
 * dismisses it, so the confirmation cannot be missed by a redirect flashing
 * past. Dismissing uses router.replace so the dialog doesn't reappear when the
 * user presses Back.
 */
export function SuccessDialog({
  messageKey,
  redirectTo,
}: {
  messageKey: string;
  redirectTo: string;
}) {
  const t = useTranslations("success");
  const router = useRouter();
  const okRef = useRef<HTMLButtonElement>(null);

  const known = t.has(`${messageKey}.title`);

  useEffect(() => {
    if (!known) return;
    okRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        router.replace(redirectTo);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [known, redirectTo, router]);

  if (!known) return null;

  function dismiss() {
    router.replace(redirectTo);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-steel-950/50 px-4"
      onClick={dismiss}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="success-title"
        aria-describedby="success-body"
        className="animate-rise w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-600">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h2 id="success-title" className="mt-4 font-heading text-heading font-bold text-steel-900">
          {t(`${messageKey}.title`)}
        </h2>
        <p id="success-body" className="mt-2 text-caption text-steel-600">
          {t(`${messageKey}.body`)}
        </p>
        <button
          ref={okRef}
          type="button"
          onClick={dismiss}
          className="mt-6 w-full rounded-lg bg-brand-700 px-5 py-2.5 font-heading text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        >
          {t("ok")}
        </button>
      </div>
    </div>
  );
}
