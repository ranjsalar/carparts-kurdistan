"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { enableAdminTotp, verifyAdminTotp } from "../../actions";
import { inputBase, labelBase } from "@/components/ui";

export function TwofaForm({ mode }: { mode: "verify" | "setup" }) {
  const t = useTranslations();
  const te = useTranslations("errors");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const action = mode === "setup" ? enableAdminTotp : verifyAdminTotp;
      const result = await action(code);
      // On success the action redirects to /admin and never resolves here.
      if (result && !result.ok) {
        const key = result.error ?? "generic";
        setError(te.has(key) ? te(key) : te("generic"));
        setCode("");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      {error && (
        <p className="rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="totp" className={labelBase}>
          {t("auth.twofa.codeLabel")}
        </label>
        <input
          id="totp"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
          dir="ltr"
          className={`${inputBase} text-center font-heading text-heading font-bold tracking-[0.4em]`}
        />
      </div>
      <button
        type="submit"
        disabled={pending || code.length !== 6}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 font-heading text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:pointer-events-none disabled:opacity-50"
      >
        {pending && (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden className="animate-spin">
            <path d="M12 3 a9 9 0 1 1-6.36 2.64" />
          </svg>
        )}
        {mode === "setup" ? t("auth.twofa.activate") : t("auth.twofa.verify")}
      </button>
    </form>
  );
}
