"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { choosePaymentAction } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary } from "@/components/ui";

export function PaymentForm({
  requestId,
  currentMethod,
  hasProof,
}: {
  requestId: string;
  currentMethod: string | null;
  hasProof: boolean;
}) {
  const t = useTranslations("payment");
  const [method, setMethod] = useState(currentMethod ?? "");

  const methods = [
    { value: "CASH_ON_DELIVERY", label: t("cod"), hint: t("codHint") },
    { value: "ONLINE_GATEWAY", label: t("gateway"), hint: t("gatewayHint") },
    { value: "BANK_TRANSFER", label: t("bank"), hint: t("bankHint") },
  ];

  return (
    <form action={choosePaymentAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      {methods.map((m) => (
        <label
          key={m.value}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
            method === m.value
              ? "border-brand-500 bg-brand-50"
              : "border-steel-200 bg-white hover:border-steel-300"
          }`}
        >
          <input
            type="radio"
            name="method"
            value={m.value}
            checked={method === m.value}
            onChange={() => setMethod(m.value)}
            required
            className="mt-1 accent-brand-600"
          />
          <span>
            <span className="block font-heading text-caption font-bold text-steel-900">
              {m.label}
            </span>
            <span className="mt-0.5 block text-caption text-steel-500">{m.hint}</span>
          </span>
        </label>
      ))}

      {method === "BANK_TRANSFER" && (
        <div className="rounded-xl bg-steel-100/70 px-4 py-3">
          <label className="mb-1.5 block text-caption font-medium text-steel-700">
            {t("proofLabel")}{" "}
            <span className="font-normal text-steel-400">{t("proofNote")}</span>
          </label>
          {hasProof && <p className="mb-1.5 text-caption text-success-700">{t("proofReplace")}</p>}
          <input
            type="file"
            name="proof"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="block w-full text-caption text-steel-600 file:me-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:font-heading file:text-caption file:font-semibold file:text-white hover:file:bg-brand-800"
          />
        </div>
      )}

      {method ? (
        <SubmitButton className={`${btnPrimary} w-full`}>
          {currentMethod ? t("update") : t("confirm")}
        </SubmitButton>
      ) : (
        <button disabled className={`${btnPrimary} w-full`}>
          {currentMethod ? t("update") : t("confirm")}
        </button>
      )}
    </form>
  );
}
