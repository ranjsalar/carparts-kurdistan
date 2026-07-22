"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { requestPhoneOtp, verifyPhoneOtp } from "../../actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { btnPrimary, btnSecondary, card, inputBase, labelBase } from "@/components/ui";

export default function PhoneLoginPage() {
  const t = useTranslations();
  const te = useTranslations("errors");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sendCode() {
    setError(null);
    startTransition(async () => {
      const result = await requestPhoneOtp(phone);
      if (result.ok) {
        setStep("code");
        setInfo(t("auth.phone.sentInfo"));
      } else {
        const key = result.error ?? "generic";
        setError(te.has(key) ? te(key) : te("generic"));
      }
    });
  }

  function verify() {
    setError(null);
    startTransition(async () => {
      const result = await verifyPhoneOtp(phone, code, name);
      // On success the action redirects and never resolves here.
      if (result && !result.ok) {
        const key = result.error ?? "generic";
        setError(te.has(key) ? te(key) : te("generic"));
      }
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-steel-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className={`${card} p-7`}>
          <h1 className="text-title font-bold text-steel-900">{t("auth.phone.title")}</h1>

          {error && (
            <p className="mt-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
              {error}
            </p>
          )}
          {info && !error && (
            <p className="mt-4 rounded-lg border-s-4 border-brand-500 bg-brand-50 px-4 py-2.5 text-caption text-brand-900">
              {info}
            </p>
          )}

          {step === "phone" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendCode();
              }}
              className="mt-6 space-y-5"
            >
              <div>
                <label htmlFor="phone" className={labelBase}>
                  {t("auth.phone.phoneLabel")}
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+9647501234567"
                  dir="ltr"
                  className={inputBase}
                />
              </div>
              <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
                {pending ? t("auth.phone.sending") : t("auth.phone.send")}
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
              className="mt-6 space-y-5"
            >
              <p className="text-caption text-steel-600">
                {t("auth.phone.codeSentTo", { phone })}
              </p>
              <div>
                <label htmlFor="code" className={labelBase}>
                  {t("auth.phone.code")}
                </label>
                <input
                  id="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  dir="ltr"
                  className={`${inputBase} text-center font-heading text-heading font-bold tracking-[0.4em]`}
                />
              </div>
              <div>
                <label htmlFor="name" className={labelBase}>
                  {t("auth.phone.nameNew")}
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputBase}
                />
              </div>
              <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
                {pending ? t("auth.phone.checking") : t("auth.phone.verify")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={sendCode}
                className={`${btnSecondary} w-full`}
              >
                {t("auth.phone.resend")}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-caption text-steel-500">
          {t("auth.phone.preferEmail")}{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            {t("common.login")}
          </Link>
        </p>
      </div>
    </main>
  );
}
