"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Submit button that opens a confirmation dialog first. Used for destructive
 * admin actions (deleting a customer, overriding a status) so none of them are
 * one click. Optionally requires the admin to type a phrase — reserved for the
 * genuinely irreversible ones.
 */
export function ConfirmSubmit({
  label,
  title,
  body,
  confirmLabel,
  className,
  danger = false,
  requireTypedText,
}: {
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  className?: string;
  danger?: boolean;
  /** When set, the confirm button stays disabled until this exact text is typed. */
  requireTypedText?: string;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const anchorRef = useRef<HTMLButtonElement>(null);

  const canConfirm = !requireTypedText || typed.trim() === requireTypedText;

  function confirm() {
    // Submit the form this button lives in.
    anchorRef.current?.form?.requestSubmit();
    setOpen(false);
  }

  return (
    <>
      <button ref={anchorRef} type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-steel-950/50 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="animate-rise w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-heading font-bold text-steel-900">{title}</h2>
            <p className="mt-2 text-caption text-steel-600">{body}</p>

            {requireTypedText && (
              <div className="mt-4">
                <label className="mb-1.5 block text-caption font-medium text-steel-700">
                  {requireTypedText}
                </label>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-steel-300 px-3 py-2 text-body text-steel-900 focus:border-danger-600 focus:outline-none focus:ring-2 focus:ring-danger-600/15"
                />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-steel-300 bg-white px-4 py-2.5 font-heading text-sm font-semibold text-steel-700 hover:border-steel-400"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!canConfirm}
                className={`flex-1 rounded-lg px-4 py-2.5 font-heading text-sm font-semibold text-white transition-colors disabled:pointer-events-none disabled:bg-steel-200 disabled:text-steel-500 ${
                  danger ? "bg-danger-600 hover:bg-danger-700" : "bg-brand-700 hover:bg-brand-800"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
