"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { inputBase, labelBase } from "@/components/ui";

export type SelectorBrand = {
  id: string;
  name: string;
  models: { id: string; name: string; yearRanges: { id: string; label: string }[] }[];
};

export function HeroSelector({ brands }: { brands: SelectorBrand[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [yearRangeId, setYearRangeId] = useState("");

  const brand = brands.find((b) => b.id === brandId);
  const model = brand?.models.find((m) => m.id === modelId);

  function go() {
    const params = new URLSearchParams();
    if (brandId) params.set("brandId", brandId);
    if (modelId) params.set("carModelId", modelId);
    if (yearRangeId) params.set("yearRangeId", yearRangeId);
    router.push(`/request?${params.toString()}`);
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl shadow-brand-950/30 sm:p-7">
      <h2 className="font-heading text-heading font-bold text-steel-900">
        {t("home.selectorTitle")}
      </h2>
      <p className="mt-1 text-caption text-steel-500">{t("home.selectorHint")}</p>

      <div className="mt-5 space-y-4">
        <div>
          <label className={labelBase}>{t("requestForm.brand")}</label>
          <select
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setModelId("");
              setYearRangeId("");
            }}
            className={inputBase}
          >
            <option value="">{t("requestForm.selectBrand")}</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelBase}>{t("requestForm.model")}</label>
            <select
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value);
                setYearRangeId("");
              }}
              disabled={!brand}
              className={inputBase}
            >
              <option value="">{t("requestForm.selectModel")}</option>
              {brand?.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelBase}>{t("requestForm.years")}</label>
            <select
              value={yearRangeId}
              onChange={(e) => setYearRangeId(e.target.value)}
              disabled={!model}
              className={inputBase}
            >
              <option value="">{t("requestForm.selectYears")}</option>
              {model?.yearRanges.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={go}
          disabled={!brandId}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 font-heading text-body font-bold text-white transition-colors hover:bg-accent-600 active:bg-accent-700 disabled:pointer-events-none disabled:opacity-40"
        >
          {t("home.selectorButton")}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rtl:-scale-x-100">
            <path d="M4 12 h15 M13 5.5 19.5 12 13 18.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
