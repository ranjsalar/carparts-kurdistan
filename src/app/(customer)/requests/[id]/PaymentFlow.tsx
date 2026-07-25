"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { submitPaymentAction } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

type Method = "FIB" | "FASTPAY" | "QICARD" | "CASH_ON_DELIVERY";
type ReceivingAccount = { accountName: string; accountNumberOrPhone: string };

const ONLINE: Method[] = ["FIB", "FASTPAY", "QICARD"];
const METHOD_KEY: Record<Method, string> = {
  FIB: "methodFib",
  FASTPAY: "methodFastpay",
  QICARD: "methodQicard",
  CASH_ON_DELIVERY: "methodCod",
};

export function PaymentFlow({
  requestId,
  isFirstPayment,
  amounts,
  receivingAccounts,
}: {
  requestId: string;
  isFirstPayment: boolean;
  amounts: { total: string; half: string; remaining: string };
  receivingAccounts: Record<string, ReceivingAccount>;
}) {
  const t = useTranslations("payment");

  // First payment starts by choosing a plan; a remainder payment skips
  // straight to method selection (the amount is fixed at the balance).
  const [step, setStep] = useState<"plan" | "method" | "sender" | "confirm">(
    isFirstPayment ? "plan" : "method",
  );
  const [plan, setPlan] = useState<"half" | "full">("full");
  const [method, setMethod] = useState<Method | null>(null);
  const [senderAccountName, setSenderAccountName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");

  // Amount is display-only here; the server recomputes it authoritatively.
  const amount = isFirstPayment ? (plan === "half" ? amounts.half : amounts.total) : amounts.remaining;
  const isOnline = method !== null && ONLINE.includes(method);
  const methodOptions: Method[] = isFirstPayment
    ? ["FIB", "FASTPAY", "QICARD"]
    : ["FIB", "FASTPAY", "QICARD", "CASH_ON_DELIVERY"];

  const stepBadge = "flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 font-heading text-caption font-bold text-brand-800";

  // ── Step 1: plan (first payment only) ──────────────────────────────────────
  if (step === "plan") {
    return (
      <div className="space-y-3">
        <p className="font-heading text-caption font-bold text-steel-900">{t("planTitle")}</p>
        <button
          type="button"
          onClick={() => {
            setPlan("half");
            setStep("method");
          }}
          className="block w-full rounded-xl border-2 border-steel-200 bg-white px-4 py-3 text-start transition-colors hover:border-brand-400"
        >
          <span className="block font-heading text-body font-bold text-steel-900">
            {t("planHalf")} · <span dir="ltr">${amounts.half}</span>
          </span>
          <span className="mt-0.5 block text-caption text-steel-500">{t("planHalfDesc")}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPlan("full");
            setStep("method");
          }}
          className="block w-full rounded-xl border-2 border-brand-500 bg-brand-50 px-4 py-3 text-start transition-colors hover:border-brand-600"
        >
          <span className="block font-heading text-body font-bold text-steel-900">
            {t("planFull")} · <span dir="ltr">${amounts.total}</span>
          </span>
          <span className="mt-0.5 block text-caption text-steel-500">{t("planFullDesc")}</span>
        </button>
      </div>
    );
  }

  // ── Step 2: method ─────────────────────────────────────────────────────────
  if (step === "method") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-heading text-caption font-bold text-steel-900">{t("methodTitle")}</p>
          <span
            className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 font-heading text-caption font-bold text-brand-800"
            dir="ltr"
          >
            ${amount}
          </span>
        </div>
        {!isFirstPayment && (
          <p className="rounded-lg bg-steel-100/70 px-3 py-2 text-caption text-steel-600">
            {t("remainingAmount", { amount })}
          </p>
        )}
        {methodOptions.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMethod(m);
              setStep(ONLINE.includes(m) ? "sender" : "confirm");
            }}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-steel-200 bg-white px-4 py-3 text-start transition-colors hover:border-brand-400"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-900 font-heading text-caption font-bold text-white">
              {m === "CASH_ON_DELIVERY" ? "$" : t(METHOD_KEY[m]).slice(0, 2)}
            </span>
            <span>
              <span className="block font-heading text-caption font-bold text-steel-900">
                {t(METHOD_KEY[m])}
              </span>
              {m === "CASH_ON_DELIVERY" && (
                <span className="mt-0.5 block text-caption text-steel-500">
                  {t("methodCodDesc", { amount })}
                </span>
              )}
            </span>
          </button>
        ))}
        {isFirstPayment && (
          <p className="text-caption text-steel-500">{t("onlineOnlyNote")}</p>
        )}
        {isFirstPayment && (
          <button
            type="button"
            onClick={() => setStep("plan")}
            className="text-caption font-semibold text-brand-700 hover:underline"
          >
            ← {t("back")}
          </button>
        )}
      </div>
    );
  }

  // ── Step 3: sender details (online only) ───────────────────────────────────
  if (step === "sender" && method) {
    const canContinue = senderAccountName.trim() !== "" && senderPhone.trim() !== "";
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={stepBadge}>{t(METHOD_KEY[method]).slice(0, 2)}</span>
          <p className="font-heading text-caption font-bold text-steel-900">{t("senderTitle")}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-caption font-medium text-steel-700">
            {t("senderName")}
          </label>
          <input
            value={senderAccountName}
            onChange={(e) => setSenderAccountName(e.target.value)}
            className="w-full rounded-lg border border-steel-300 bg-white px-3.5 py-2.5 text-body text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-caption font-medium text-steel-700">
            {t("senderPhone")}
          </label>
          <input
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
            dir="ltr"
            inputMode="tel"
            className="w-full rounded-lg border border-steel-300 bg-white px-3.5 py-2.5 text-body text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-caption font-medium text-steel-700">
            {t("amountToSend")}
          </label>
          <input
            value={`$${amount}`}
            readOnly
            dir="ltr"
            className="w-full rounded-lg border border-steel-200 bg-steel-100 px-3.5 py-2.5 font-heading text-body font-bold text-steel-900"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep("method")}
            className="text-caption font-semibold text-brand-700 hover:underline"
          >
            ← {t("back")}
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep("confirm")}
            className="ms-auto rounded-lg bg-brand-700 px-5 py-2 font-heading text-caption font-semibold text-white transition-colors hover:bg-brand-800 disabled:pointer-events-none disabled:bg-steel-200 disabled:text-steel-500"
          >
            {t("continue")}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4: confirmation + submit ──────────────────────────────────────────
  if (step === "confirm" && method) {
    const account = receivingAccounts[method];
    const isPlaceholder = account?.accountName?.startsWith("PLACEHOLDER");
    return (
      <form action={submitPaymentAction} className="space-y-4">
        <input type="hidden" name="requestId" value={requestId} />
        {isFirstPayment && <input type="hidden" name="plan" value={plan} />}
        <input type="hidden" name="method" value={method} />
        <input type="hidden" name="senderAccountName" value={senderAccountName} />
        <input type="hidden" name="senderPhone" value={senderPhone} />

        {isOnline ? (
          <>
            <p className="font-heading text-caption font-bold text-steel-900">{t("confirmTitle")}</p>
            <p className="text-caption text-steel-600">{t("confirmInstructions", { amount })}</p>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="font-heading text-overline font-semibold uppercase text-brand-700">
                {t("receivingAccount")} · {t(METHOD_KEY[method])}
              </p>
              <dl className="mt-2 space-y-1.5 text-caption">
                <div className="flex justify-between gap-4">
                  <dt className="text-steel-500">{t("accountName")}</dt>
                  <dd className="font-semibold text-steel-900">{account?.accountName ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-steel-500">{t("accountNumber")}</dt>
                  <dd className="font-semibold text-steel-900" dir="ltr">
                    {account?.accountNumberOrPhone ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-brand-200 pt-1.5">
                  <dt className="text-steel-500">{t("amountToSend")}</dt>
                  <dd className="font-heading font-bold text-steel-900" dir="ltr">
                    ${amount}
                  </dd>
                </div>
              </dl>
              {isPlaceholder && (
                <p className="mt-3 rounded-lg bg-accent-50 px-3 py-2 text-caption text-accent-800">
                  {t("placeholderWarning")}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-caption font-medium text-steel-700">
                {t("proofLabel")} <span className="font-normal text-steel-500">{t("proofNote")}</span>
              </label>
              <input
                type="file"
                name="proof"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="block w-full text-caption text-steel-600 file:me-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:font-heading file:text-caption file:font-semibold file:text-white hover:file:bg-brand-800"
              />
            </div>
          </>
        ) : (
          <>
            <p className="font-heading text-caption font-bold text-steel-900">{t("codConfirmTitle")}</p>
            <p className="rounded-xl border border-steel-200 bg-steel-50 px-4 py-3 text-caption text-steel-600">
              {t("codConfirmBody", { amount })}
            </p>
          </>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep(isOnline ? "sender" : "method")}
            className="text-caption font-semibold text-brand-700 hover:underline"
          >
            ← {t("back")}
          </button>
          <SubmitButton className="ms-auto rounded-lg bg-accent-600 px-5 py-2.5 font-heading text-sm font-bold text-white transition-colors hover:bg-accent-700">
            {isOnline ? t("sentButton") : t("continue")}
          </SubmitButton>
        </div>
      </form>
    );
  }

  return null;
}
