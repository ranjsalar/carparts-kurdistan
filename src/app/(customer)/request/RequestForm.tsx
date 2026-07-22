"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createRequest } from "./actions";
import { btnAccent, btnPrimary, btnSecondary, card, inputBase, labelBase, overline, panel } from "@/components/ui";

export type TaxonomyBrand = {
  id: string;
  name: string;
  models: {
    id: string;
    name: string;
    yearRanges: { id: string; label: string }[];
  }[];
};

export type TaxonomyCategory = {
  id: string;
  name: string;
  subCategories: {
    id: string;
    name: string;
    parts: {
      id: string;
      name: string;
      requiresColorCode: boolean;
      priceMin: string | null;
      priceMax: string | null;
    }[];
  }[];
};

type StepId = "car" | "part" | "color" | "source" | "details";

export type RequestFormInitial = {
  brandId?: string;
  carModelId?: string;
  yearRangeId?: string;
  categoryId?: string;
  subCategoryId?: string;
};

export function RequestForm({
  brands,
  categories,
  initial,
}: {
  brands: TaxonomyBrand[];
  categories: TaxonomyCategory[];
  initial?: RequestFormInitial;
}) {
  const t = useTranslations("requestForm");
  const tc = useTranslations("common");
  const te = useTranslations("errors");

  // Validate URL-provided prefills against the actual taxonomy — unknown or
  // mismatched ids are silently dropped.
  const initBrand = brands.find((b) => b.id === initial?.brandId);
  const initModel = initBrand?.models.find((m) => m.id === initial?.carModelId);
  const initYear = initModel?.yearRanges.find((y) => y.id === initial?.yearRangeId);
  const initCategory = categories.find((c) => c.id === initial?.categoryId);
  const initSub = initCategory?.subCategories.find((s) => s.id === initial?.subCategoryId);

  const [brandId, setBrandId] = useState(initBrand?.id ?? "");
  const [modelId, setModelId] = useState(initModel?.id ?? "");
  const [yearRangeId, setYearRangeId] = useState(initYear?.id ?? "");
  const [categoryId, setCategoryId] = useState(initCategory?.id ?? "");
  const [subCategoryId, setSubCategoryId] = useState(initSub?.id ?? "");
  const [partId, setPartId] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [preferredSource, setPreferredSource] = useState("");
  const [notes, setNotes] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  // A fully prefilled vehicle (from the homepage selector) skips to the part step.
  const [stepIndex, setStepIndex] = useState(initBrand && initModel && initYear ? 1 : 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const brand = brands.find((b) => b.id === brandId);
  const model = brand?.models.find((m) => m.id === modelId);
  const category = categories.find((c) => c.id === categoryId);
  const subCategory = category?.subCategories.find((s) => s.id === subCategoryId);
  const part = subCategory?.parts.find((p) => p.id === partId);

  const steps: StepId[] = ["car", "part"];
  if (part?.requiresColorCode) steps.push("color");
  steps.push("source", "details");

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  const canContinue =
    currentStep === "car"
      ? Boolean(brandId && modelId && yearRangeId)
      : currentStep === "part"
        ? Boolean(categoryId && subCategoryId && partId)
        : currentStep === "color"
          ? colorCode.trim().length > 0
          : currentStep === "source"
            ? preferredSource !== ""
            : true;

  function submit() {
    setError(null);
    const formData = new FormData();
    formData.set("brandId", brandId);
    formData.set("carModelId", modelId);
    formData.set("yearRangeId", yearRangeId);
    formData.set("partId", partId);
    formData.set("preferredSource", preferredSource);
    formData.set("colorCode", colorCode);
    formData.set("notes", notes);
    const photo = photoRef.current?.files?.[0];
    if (photo) formData.set("photo", photo);

    startTransition(async () => {
      const result = await createRequest(formData);
      // On success the action redirects to /requests and never resolves here.
      if (result && !result.ok) {
        setError(te.has(result.error) ? te(result.error) : te("generic"));
      }
    });
  }

  return (
    <div className={`${card} p-6 sm:p-8`}>
      {/* Stepper — route-style dashed connectors, signal-amber current step */}
      <ol className="mb-9 flex items-start">
        {steps.map((stepId, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "upcoming";
          return (
            <li key={stepId} className="flex flex-1 flex-col items-center gap-2 text-center">
              <div className="flex w-full items-center">
                <span
                  className={`h-0 flex-1 border-t-2 ${
                    i === 0
                      ? "border-transparent"
                      : i <= stepIndex
                        ? "border-brand-400"
                        : "border-dashed border-steel-300"
                  }`}
                  aria-hidden
                />
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold transition-colors ${
                    state === "done"
                      ? "bg-brand-600 text-white"
                      : state === "current"
                        ? "bg-accent-500 text-white ring-4 ring-accent-100"
                        : "border-2 border-steel-300 bg-white text-steel-400"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span
                  className={`h-0 flex-1 border-t-2 ${
                    i === steps.length - 1
                      ? "border-transparent"
                      : i < stepIndex
                        ? "border-brand-400"
                        : "border-dashed border-steel-300"
                  }`}
                  aria-hidden
                />
              </div>
              <span
                className={`px-1 text-[11px] leading-tight sm:text-caption ${
                  state === "current"
                    ? "font-semibold text-steel-900"
                    : state === "done"
                      ? "text-brand-700"
                      : "text-steel-400"
                }`}
              >
                {t(`steps.${stepId}`)}
              </span>
            </li>
          );
        })}
      </ol>

      {error && (
        <p className="mb-5 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
          {error}
        </p>
      )}

      {currentStep === "car" && (
        <div className="space-y-5">
          <div>
            <label className={labelBase}>{t("brand")}</label>
            <select
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setModelId("");
                setYearRangeId("");
              }}
              className={inputBase}
            >
              <option value="">{t("selectBrand")}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelBase}>{t("model")}</label>
            <select
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value);
                setYearRangeId("");
              }}
              disabled={!brand}
              className={inputBase}
            >
              <option value="">{t("selectModel")}</option>
              {brand?.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelBase}>{t("years")}</label>
            <select
              value={yearRangeId}
              onChange={(e) => setYearRangeId(e.target.value)}
              disabled={!model}
              className={inputBase}
            >
              <option value="">{t("selectYears")}</option>
              {model?.yearRanges.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-caption text-steel-400">{t("yearsHint")}</p>
          </div>
        </div>
      )}

      {currentStep === "part" && (
        <div className="space-y-5">
          <div>
            <label className={labelBase}>{t("category")}</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubCategoryId("");
                setPartId("");
              }}
              className={inputBase}
            >
              <option value="">{t("selectCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelBase}>{t("type")}</label>
            <select
              value={subCategoryId}
              onChange={(e) => {
                setSubCategoryId(e.target.value);
                setPartId("");
              }}
              disabled={!category}
              className={inputBase}
            >
              <option value="">{t("selectType")}</option>
              {category?.subCategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelBase}>{t("part")}</label>
            <select
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
              disabled={!subCategory}
              className={inputBase}
            >
              <option value="">{t("selectPart")}</option>
              {subCategory?.parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Indicative price range — instant answer for price-checkers,
              without consuming admin sourcing time. */}
          {part?.priceMin && part?.priceMax && (
            <div className="rounded-xl border-s-4 border-brand-500 bg-brand-50 px-4 py-3">
              <p className="font-heading text-body font-bold text-brand-900" dir="ltr">
                {t("typicalRange", { min: part.priceMin, max: part.priceMax })}
              </p>
              <p className="mt-0.5 text-caption text-brand-800">{t("typicalRangeHint")}</p>
            </div>
          )}
        </div>
      )}

      {currentStep === "color" && (
        <div className="space-y-4">
          <div>
            <label className={labelBase}>{t("colorLabel", { brand: brand?.name ?? "" })}</label>
            <input
              value={colorCode}
              onChange={(e) => setColorCode(e.target.value)}
              placeholder={t("colorPlaceholder")}
              className={`${inputBase} max-w-xs font-heading text-heading font-semibold tracking-wide`}
            />
          </div>
          <div className="rounded-xl border-s-4 border-brand-500 bg-brand-50 px-4 py-3 text-caption leading-relaxed text-brand-900">
            {t("colorHelper")}
          </div>
        </div>
      )}

      {currentStep === "source" && (
        <div className="space-y-4">
          <div>
            <p className="font-heading text-body font-bold text-steel-900">{t("sourceTitle")}</p>
            <p className="mt-1 text-caption text-steel-500">{t("sourceHint")}</p>
          </div>
          {[
            { value: "CHINA", label: t("sourceChina"), hint: t("sourceChinaHint") },
            { value: "DUBAI", label: t("sourceDubai"), hint: t("sourceDubaiHint") },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3.5 transition-colors ${
                preferredSource === option.value
                  ? "border-brand-500 bg-brand-50"
                  : "border-steel-200 bg-white hover:border-steel-300"
              }`}
            >
              <input
                type="radio"
                name="preferredSourceRadio"
                value={option.value}
                checked={preferredSource === option.value}
                onChange={() => setPreferredSource(option.value)}
                className="mt-1.5 accent-brand-600"
              />
              <span>
                <span className="block font-heading text-body font-bold text-steel-900">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-caption text-steel-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {currentStep === "details" && (
        <div className="space-y-5">
          <div className={`${panel} px-5 py-4`}>
            <p className={overline}>{t("summary")}</p>
            <p className="mt-1.5 font-heading text-body font-semibold text-steel-900">
              {brand?.name} {model?.name} (
              {model?.yearRanges.find((y) => y.id === yearRangeId)?.label}) — {part?.name}
              {part?.requiresColorCode && colorCode
                ? `, ${t("colorSummary", { code: colorCode })}`
                : ""}
            </p>
          </div>
          <div>
            <label className={labelBase}>
              {t("notes")} <span className="font-normal text-steel-400">({tc("optional")})</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("notesPlaceholder")}
              className={inputBase}
            />
          </div>
          <div>
            <label className={labelBase}>
              {t("photo")} <span className="font-normal text-steel-400">{t("photoMax")}</span>
            </label>
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="block w-full text-caption text-steel-600 file:me-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:font-heading file:text-caption file:font-semibold file:text-white hover:file:bg-brand-800"
            />
            <p className="mt-1.5 text-caption text-steel-400">{t("photoHint")}</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between border-t border-steel-100 pt-6">
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0 || pending}
          className={btnSecondary}
        >
          {tc("back")}
        </button>
        {stepIndex < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStepIndex((i) => i + 1)}
            disabled={!canContinue}
            className={btnPrimary}
          >
            {tc("continue")}
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={pending} className={btnAccent}>
            {pending ? t("submitting") : t("submit")}
          </button>
        )}
      </div>
    </div>
  );
}
