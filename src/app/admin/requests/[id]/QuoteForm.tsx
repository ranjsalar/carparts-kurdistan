"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/SubmitButton";
import { inputBase, labelBase, selectBase } from "@/components/ui";
import { sendQuoteAction } from "./actions";

/*
  Itemized admin quote form. The live total shown here is a convenience —
  the authoritative total is recomputed server-side in sendQuote() from the
  four components.
*/
export function QuoteForm({
  requestId,
  isUpdate,
  defaults,
  suggestions,
}: {
  requestId: string;
  isUpdate: boolean;
  defaults: {
    source: string;
    part: string;
    shipping: string;
    tax: string;
    delivery: string;
    notes: string;
  };
  /** Recently used shipping/tax figures — offered, never applied. */
  suggestions: { shipping: string[]; tax: string[] };
}) {
  const t = useTranslations("admin.detail");
  const [part, setPart] = useState(defaults.part);
  const [shipping, setShipping] = useState(defaults.shipping);
  const [tax, setTax] = useState(defaults.tax);
  const [delivery, setDelivery] = useState(defaults.delivery);

  const cents = (v: string) => {
    const n = Number(v.trim() === "" ? 0 : v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
  };
  const totalCents = cents(part) + cents(shipping) + cents(tax) + cents(delivery);
  const total = Number.isNaN(totalCents) ? null : (totalCents / 100).toFixed(2);

  const money = [
    { name: "pricePartUsd", label: t("partPrice"), value: part, set: setPart, required: true, chips: [] as string[] },
    {
      name: "priceShippingUsd",
      label: t("shippingCost"),
      value: shipping,
      set: setShipping,
      chips: suggestions.shipping,
    },
    { name: "priceTaxUsd", label: t("taxCost"), value: tax, set: setTax, chips: suggestions.tax },
    { name: "priceDeliveryUsd", label: t("deliveryCost"), value: delivery, set: setDelivery, chips: [] as string[] },
  ];

  return (
    <form action={sendQuoteAction} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      <div>
        <label htmlFor="source" className={labelBase}>
          {t("source")}
        </label>
        <select
          id="source"
          name="source"
          required
          defaultValue={defaults.source}
          className={selectBase}
        >
          <option value="CHINA">{t("china")}</option>
          <option value="DUBAI">{t("dubai")}</option>
        </select>
      </div>

      {money.map((fieldDef) => (
        <div key={fieldDef.name}>
          <label htmlFor={fieldDef.name} className={labelBase}>
            {fieldDef.label}
            {!fieldDef.required && (
              <span className="ms-1 font-normal text-steel-400">({t("optionalZero")})</span>
            )}
          </label>
          <input
            id={fieldDef.name}
            name={fieldDef.name}
            type="number"
            step="0.01"
            min={fieldDef.required ? "0.01" : "0"}
            required={fieldDef.required}
            value={fieldDef.value}
            onChange={(e) => fieldDef.set(e.target.value)}
            placeholder="0"
            dir="ltr"
            className={inputBase}
          />
          {/* Recent values, offered rather than applied — see
              src/lib/quote-suggestions.ts for why these are not defaults. */}
          {fieldDef.chips.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-overline text-steel-400">{t("recentValues")}</span>
              {fieldDef.chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => fieldDef.set(c)}
                  className={`rounded-full px-2.5 py-1 font-heading text-overline font-semibold transition-colors ${
                    fieldDef.value === c
                      ? "bg-brand-700 text-white"
                      : "bg-steel-100 text-steel-700 hover:bg-brand-100 hover:text-brand-800"
                  }`}
                  dir="ltr"
                >
                  ${c}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between rounded-xl bg-steel-100/70 px-4 py-3">
        <span className="font-heading text-caption font-semibold uppercase text-steel-500">
          {t("totalLabel")}
        </span>
        <span className="font-heading text-heading font-bold text-steel-900" dir="ltr">
          {total !== null ? `$${total}` : "—"}
        </span>
      </div>

      <div>
        <label htmlFor="quoteNotes" className={labelBase}>
          {t("notesToCustomer")}
        </label>
        <textarea
          id="quoteNotes"
          name="quoteNotes"
          rows={3}
          defaultValue={defaults.notes}
          className={inputBase}
        />
      </div>

      <SubmitButton className="w-full rounded-lg bg-brand-700 py-2.5 font-heading text-sm font-semibold text-white transition-colors hover:bg-brand-800">
        {isUpdate ? t("updateQuote") : t("sendQuote")}
      </SubmitButton>
    </form>
  );
}
