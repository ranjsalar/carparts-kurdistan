"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PART_CONDITIONS, PART_CONDITION_KEY } from "@/lib/request-display";
import {
  OTHER,
  type TaxonomyBrand,
  type TaxonomyCategory,
} from "@/app/(customer)/request/RequestForm";
import { createWalkInAction } from "./actions";
import {
  btnAccent,
  btnSecondary,
  card,
  inputBase,
  labelBase,
  overline,
  selectBase,
} from "@/components/ui";

/*
  The counter form.

  Deliberately NOT the customer wizard. That form walks one step at a time
  because the person filling it in is deciding as they go; here the admin
  already knows every answer and is typing while somebody waits at the desk, so
  every field is on one screen and nothing gates anything else. Same taxonomy,
  same "not listed" fallbacks, same condition rules — different pacing.
*/

const MONEY = /^\d{0,8}(\.\d{0,2})?$/;

function money(value: string): number {
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : 0;
}

export function WalkInForm({
  brands,
  categories,
}: {
  brands: TaxonomyBrand[];
  categories: TaxonomyCategory[];
}) {
  const t = useTranslations("admin.walkIn");
  const tr = useTranslations("requestForm");
  const tp = useTranslations("payment");
  const tc = useTranslations("common");
  const te = useTranslations("errors");

  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");

  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [yearRangeId, setYearRangeId] = useState("");
  const [trimId, setTrimId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [partId, setPartId] = useState("");
  const [rawBrand, setRawBrand] = useState("");
  const [rawModel, setRawModel] = useState("");
  const [rawYear, setRawYear] = useState("");
  const [rawTrim, setRawTrim] = useState("");
  const [rawPart, setRawPart] = useState("");
  const [partCondition, setPartCondition] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  const [pricePart, setPricePart] = useState("");
  const [priceShipping, setPriceShipping] = useState("");
  const [priceTax, setPriceTax] = useState("");
  const [priceDelivery, setPriceDelivery] = useState("");

  const [paymentPlan, setPaymentPlan] = useState<"none" | "half" | "full">("none");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const brandIsOther = brandId === OTHER;
  const modelIsOther = modelId === OTHER || brandIsOther;
  const trimIsOther = trimId === OTHER;
  const partIsOther = partId === OTHER;

  const brand = brandIsOther ? undefined : brands.find((b) => b.id === brandId);
  const model = modelIsOther ? undefined : brand?.models.find((m) => m.id === modelId);
  const category = categories.find((c) => c.id === categoryId);
  const subCategory = category?.subCategories.find((s) => s.id === subCategoryId);
  const part = partIsOther ? undefined : subCategory?.parts.find((p) => p.id === partId);

  // Total in cents, mirroring the server's arithmetic so the figure quoted at
  // the desk is the figure that gets stored.
  const totalCents =
    Math.round(money(pricePart) * 100) +
    Math.round(money(priceShipping) * 100) +
    Math.round(money(priceTax) * 100) +
    Math.round(money(priceDelivery) * 100);
  const total = (totalCents / 100).toFixed(2);
  const payCents =
    paymentPlan === "none" ? 0 : paymentPlan === "half" ? Math.round(totalCents / 2) : totalCents;
  const remainingCents = totalCents - payCents;

  const brandOk = brandIsOther ? rawBrand.trim() !== "" : brandId !== "";
  const modelOk = modelIsOther ? rawModel.trim() !== "" : modelId !== "";
  const yearOk = modelIsOther ? rawYear.trim() !== "" : yearRangeId !== "";
  const trimOk = trimIsOther ? rawTrim.trim() !== "" : true;
  const partOk = partIsOther ? rawPart.trim() !== "" : Boolean(partId);
  const colorOk = part?.requiresColorCode ? colorCode.trim() !== "" : true;
  const conditionOk = part?.conditionApplies ? partCondition !== "" : true;
  const priceOk = money(pricePart) > 0 && totalCents > 0;
  const paymentOk = paymentPlan === "none" || paymentMethod !== "";

  const canSubmit =
    walkInName.trim() !== "" &&
    walkInPhone.trim() !== "" &&
    brandOk &&
    modelOk &&
    yearOk &&
    trimOk &&
    partOk &&
    colorOk &&
    conditionOk &&
    source !== "" &&
    priceOk &&
    paymentOk;

  function setMoneyField(setter: (v: string) => void) {
    return (value: string) => {
      if (value === "" || MONEY.test(value)) setter(value);
    };
  }

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.set("walkInName", walkInName);
    fd.set("walkInPhone", walkInPhone);
    fd.set("walkInEmail", walkInEmail);
    // Catalog id OR typed text, never both — the sentinel stays in the browser.
    fd.set("brandId", brandIsOther ? "" : brandId);
    fd.set("carModelId", modelIsOther ? "" : modelId);
    fd.set("yearRangeId", modelIsOther ? "" : yearRangeId);
    fd.set("trimId", trimIsOther ? "" : trimId);
    fd.set("partId", partIsOther ? "" : partId);
    fd.set("rawBrandText", brandIsOther ? rawBrand : "");
    fd.set("rawModelText", modelIsOther ? rawModel : "");
    fd.set("rawYearText", modelIsOther ? rawYear : "");
    fd.set("rawTrimText", trimIsOther ? rawTrim : "");
    fd.set("rawPartText", partIsOther ? rawPart : "");
    fd.set("partCondition", part?.conditionApplies ? partCondition : "");
    fd.set("colorCode", part?.requiresColorCode ? colorCode : "");
    fd.set("source", source);
    fd.set("notes", notes);
    fd.set("pricePartUsd", pricePart);
    fd.set("priceShippingUsd", priceShipping);
    fd.set("priceTaxUsd", priceTax);
    fd.set("priceDeliveryUsd", priceDelivery);
    fd.set("paymentPlan", paymentPlan);
    fd.set("paymentMethod", paymentPlan === "none" ? "" : paymentMethod);

    startTransition(async () => {
      const result = await createWalkInAction(fd);
      // Success redirects to the new request and never resolves here.
      if (result && !result.ok) {
        setError(te.has(result.error) ? te(result.error) : te("generic"));
      }
    });
  }

  const sectionTitle = "font-heading text-heading font-bold text-steel-900";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {error && (
          <p className="rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
            {error}
          </p>
        )}

        {/* 1 — Who is at the counter. No account is created; these three
            fields are the entire customer record for this order. */}
        <section className={`${card} p-5 sm:p-6`}>
          <h2 className={sectionTitle}>{t("customerTitle")}</h2>
          <p className="mt-1 mb-4 text-caption text-steel-500">{t("customerHint")}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="wiName" className={labelBase}>
                {t("name")} <span className="font-normal text-danger-600">({tc("required")})</span>
              </label>
              <input
                id="wiName"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className={inputBase}
              />
            </div>
            <div>
              <label htmlFor="wiPhone" className={labelBase}>
                {t("phone")} <span className="font-normal text-danger-600">({tc("required")})</span>
              </label>
              <input
                id="wiPhone"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                inputMode="tel"
                dir="ltr"
                className={inputBase}
              />
            </div>
            <div>
              <label htmlFor="wiEmail" className={labelBase}>
                {t("email")}{" "}
                <span className="font-normal text-steel-400">({tc("optional")})</span>
              </label>
              <input
                id="wiEmail"
                value={walkInEmail}
                onChange={(e) => setWalkInEmail(e.target.value)}
                inputMode="email"
                dir="ltr"
                className={inputBase}
              />
            </div>
          </div>
        </section>

        {/* 2 — Vehicle. Identical cascade and fallbacks to the customer form. */}
        <section className={`${card} p-5 sm:p-6`}>
          <h2 className={`${sectionTitle} mb-4`}>{t("vehicleTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="wiBrand" className={labelBase}>
                {tr("brand")}
              </label>
              <select
                id="wiBrand"
                value={brandId}
                onChange={(e) => {
                  setBrandId(e.target.value);
                  setModelId("");
                  setYearRangeId("");
                  setTrimId("");
                  setRawModel("");
                  setRawYear("");
                  setRawTrim("");
                }}
                className={selectBase}
              >
                <option value="">{tr("selectBrand")}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
                <option value={OTHER}>{tr("otherOption")}</option>
              </select>
              {brandIsOther && (
                <input
                  value={rawBrand}
                  onChange={(e) => setRawBrand(e.target.value)}
                  placeholder={tr("otherBrandPlaceholder")}
                  aria-label={tr("otherBrandPlaceholder")}
                  className={`${inputBase} mt-2`}
                />
              )}
            </div>

            <div>
              <label htmlFor="wiModel" className={labelBase}>
                {tr("model")}
              </label>
              {brandIsOther ? (
                <input
                  id="wiModel"
                  value={rawModel}
                  onChange={(e) => setRawModel(e.target.value)}
                  placeholder={tr("otherModelPlaceholder")}
                  className={inputBase}
                />
              ) : (
                <>
                  <select
                    id="wiModel"
                    value={modelId}
                    onChange={(e) => {
                      setModelId(e.target.value);
                      setYearRangeId("");
                      setTrimId("");
                      setRawYear("");
                      setRawTrim("");
                    }}
                    disabled={!brand}
                    className={selectBase}
                  >
                    <option value="">{tr("selectModel")}</option>
                    {brand?.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                    {brand && <option value={OTHER}>{tr("otherOption")}</option>}
                  </select>
                  {modelId === OTHER && (
                    <input
                      value={rawModel}
                      onChange={(e) => setRawModel(e.target.value)}
                      placeholder={tr("otherModelPlaceholder")}
                      aria-label={tr("otherModelPlaceholder")}
                      className={`${inputBase} mt-2`}
                    />
                  )}
                </>
              )}
            </div>

            <div>
              <label htmlFor="wiYear" className={labelBase}>
                {tr("years")}
              </label>
              {modelIsOther ? (
                <input
                  id="wiYear"
                  value={rawYear}
                  onChange={(e) => setRawYear(e.target.value)}
                  inputMode="numeric"
                  dir="ltr"
                  placeholder={tr("otherYearPlaceholder")}
                  className={inputBase}
                />
              ) : (
                <select
                  id="wiYear"
                  value={yearRangeId}
                  onChange={(e) => setYearRangeId(e.target.value)}
                  disabled={!model}
                  className={selectBase}
                >
                  <option value="">{tr("selectYears")}</option>
                  {model?.yearRanges.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="wiTrim" className={labelBase}>
                {tr("trim")}{" "}
                <span className="font-normal text-steel-400">({tr("optionalLabel")})</span>
              </label>
              {modelIsOther ? (
                <input
                  id="wiTrim"
                  value={rawTrim}
                  onChange={(e) => setRawTrim(e.target.value)}
                  placeholder={tr("otherTrimPlaceholder")}
                  className={inputBase}
                />
              ) : (
                <>
                  <select
                    id="wiTrim"
                    value={trimId}
                    onChange={(e) => setTrimId(e.target.value)}
                    disabled={!model}
                    className={selectBase}
                  >
                    <option value="">{tr("selectTrim")}</option>
                    {model?.trims.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name}
                      </option>
                    ))}
                    {model && <option value={OTHER}>{tr("otherOption")}</option>}
                  </select>
                  {trimIsOther && (
                    <input
                      value={rawTrim}
                      onChange={(e) => setRawTrim(e.target.value)}
                      placeholder={tr("otherTrimPlaceholder")}
                      aria-label={tr("otherTrimPlaceholder")}
                      className={`${inputBase} mt-2`}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* 3 — Part, with the same colour-code and condition rules. */}
        <section className={`${card} p-5 sm:p-6`}>
          <h2 className={`${sectionTitle} mb-4`}>{t("partTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="wiCategory" className={labelBase}>
                {tr("category")}
              </label>
              <select
                id="wiCategory"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubCategoryId("");
                  setPartId("");
                  setPartCondition("");
                }}
                className={selectBase}
              >
                <option value="">{tr("selectCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wiType" className={labelBase}>
                {tr("type")}
              </label>
              <select
                id="wiType"
                value={subCategoryId}
                onChange={(e) => {
                  setSubCategoryId(e.target.value);
                  setPartId("");
                  setPartCondition("");
                }}
                disabled={!category}
                className={selectBase}
              >
                <option value="">{tr("selectType")}</option>
                {category?.subCategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wiPart" className={labelBase}>
                {tr("part")}
              </label>
              <select
                id="wiPart"
                value={partId}
                onChange={(e) => {
                  setPartId(e.target.value);
                  setPartCondition("");
                }}
                disabled={!subCategory}
                className={selectBase}
              >
                <option value="">{tr("selectPart")}</option>
                {subCategory?.parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {subCategory && <option value={OTHER}>{tr("otherOption")}</option>}
              </select>
            </div>
          </div>

          {partIsOther && (
            <input
              value={rawPart}
              onChange={(e) => setRawPart(e.target.value)}
              placeholder={tr("otherPartPlaceholder")}
              aria-label={tr("otherPartPlaceholder")}
              className={`${inputBase} mt-4`}
            />
          )}

          {part?.requiresColorCode && (
            <div className="mt-4">
              <label htmlFor="wiColor" className={labelBase}>
                {tr("colorLabel", { brand: brand?.name ?? "" })}{" "}
                <span className="font-normal text-danger-600">({tc("required")})</span>
              </label>
              <input
                id="wiColor"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                placeholder={tr("colorPlaceholder")}
                dir="ltr"
                className={`${inputBase} max-w-xs font-heading font-semibold tracking-wide`}
              />
            </div>
          )}

          {part?.conditionApplies && (
            <div className="mt-5">
              <p className="font-heading text-body font-bold text-steel-900">
                {tr("condition.title", { part: part.name })}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PART_CONDITIONS.map((value) => {
                  const key = PART_CONDITION_KEY[value];
                  return (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
                        partCondition === value
                          ? "border-brand-500 bg-brand-50"
                          : "border-steel-200 bg-white hover:border-steel-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="wiCondition"
                        value={value}
                        checked={partCondition === value}
                        onChange={() => setPartCondition(value)}
                        className="mt-1 accent-brand-600"
                      />
                      <span className="font-heading text-caption font-bold text-steel-900">
                        {tr(`condition.${key}`)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* 4 — Source. Same two options and the same delivery-time wording the
            customer sees, pulled from the one place it is written. */}
        <section className={`${card} p-5 sm:p-6`}>
          <h2 className={`${sectionTitle} mb-4`}>{tr("sourceTitle")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: "CHINA", label: tr("sourceChina"), hint: tr("sourceChinaHint") },
              { value: "DUBAI", label: tr("sourceDubai"), hint: tr("sourceDubaiHint") },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
                  source === option.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-steel-200 bg-white hover:border-steel-300"
                }`}
              >
                <input
                  type="radio"
                  name="wiSource"
                  value={option.value}
                  checked={source === option.value}
                  onChange={() => setSource(option.value)}
                  className="mt-1 accent-brand-600"
                />
                <span>
                  <span className="block font-heading text-caption font-bold text-steel-900">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-caption text-steel-500">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* 5 — Price. Same four components as a web quote, because the record
            this produces is a quote; it just skips the waiting. */}
        <section className={`${card} p-5 sm:p-6`}>
          <h2 className={sectionTitle}>{t("priceTitle")}</h2>
          <p className="mt-1 mb-4 text-caption text-steel-500">{t("priceHint")}</p>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { id: "pricePart", label: t("pricePart"), value: pricePart, set: setPricePart, required: true },
              { id: "priceShipping", label: t("priceShipping"), value: priceShipping, set: setPriceShipping, required: false },
              { id: "priceTax", label: t("priceTax"), value: priceTax, set: setPriceTax, required: false },
              { id: "priceDelivery", label: t("priceDelivery"), value: priceDelivery, set: setPriceDelivery, required: false },
            ].map((f) => (
              <div key={f.id}>
                <label htmlFor={f.id} className={labelBase}>
                  {f.label}
                  {f.required && (
                    <span className="font-normal text-danger-600"> ({tc("required")})</span>
                  )}
                </label>
                <input
                  id={f.id}
                  value={f.value}
                  onChange={(e) => setMoneyField(f.set)(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  dir="ltr"
                  className={inputBase}
                />
              </div>
            ))}
          </div>
        </section>

        {/* 6 — Payment taken now, if any. Confirmed on the spot: the admin
            filling this in is the person who took the money. */}
        <section className={`${card} p-5 sm:p-6`}>
          <h2 className={sectionTitle}>{t("paymentTitle")}</h2>
          <p className="mt-1 mb-4 text-caption text-steel-500">{t("paymentHint")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { value: "none" as const, label: t("planNone"), desc: t("planNoneDesc") },
              { value: "half" as const, label: tp("planHalf"), desc: t("planHalfDesc") },
              { value: "full" as const, label: tp("planFull"), desc: t("planFullDesc") },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
                  paymentPlan === option.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-steel-200 bg-white hover:border-steel-300"
                }`}
              >
                <input
                  type="radio"
                  name="wiPlan"
                  value={option.value}
                  checked={paymentPlan === option.value}
                  onChange={() => {
                    setPaymentPlan(option.value);
                    if (option.value === "none") setPaymentMethod("");
                  }}
                  className="mt-1 accent-brand-600"
                />
                <span>
                  <span className="block font-heading text-caption font-bold text-steel-900">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-caption text-steel-500">{option.desc}</span>
                </span>
              </label>
            ))}
          </div>

          {paymentPlan !== "none" && (
            <div className="mt-4">
              <label htmlFor="wiMethod" className={labelBase}>
                {tp("methodTitle")}
              </label>
              <select
                id="wiMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={`${selectBase} max-w-sm`}
              >
                <option value="">{t("selectMethod")}</option>
                <option value="FIB">{tp("methodFib")}</option>
                <option value="FASTPAY">{tp("methodFastpay")}</option>
                <option value="QICARD">{tp("methodQicard")}</option>
              </select>
              {/* Cash on delivery is absent by design, not omission: it is a
                  promise to pay later, and the same server rule that blocks it
                  as a first payment on the website applies here. */}
              <p className="mt-1.5 text-caption text-steel-500">{t("methodHint")}</p>
            </div>
          )}
        </section>

        <section className={`${card} p-5 sm:p-6`}>
          <label htmlFor="wiNotes" className={labelBase}>
            {t("notes")} <span className="font-normal text-steel-400">({tc("optional")})</span>
          </label>
          <textarea
            id="wiNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("notesPlaceholder")}
            className={inputBase}
          />
        </section>
      </div>

      {/* Running summary. Sticky because the admin scrolls this form while a
          customer is asking "so how much is it?" — the total should never be
          off-screen. */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl bg-brand-900 p-5 text-white">
          <p className={`${overline} text-brand-200`}>{t("summaryTitle")}</p>

          <p className="mt-3 font-heading text-title font-bold" dir="ltr">
            ${total}
          </p>
          <p className="text-caption text-brand-200">{t("summaryTotal")}</p>

          <dl className="mt-4 space-y-1.5 border-t border-white/15 pt-4 text-caption">
            <div className="flex justify-between gap-3">
              <dt className="text-brand-200">{t("summaryCustomer")}</dt>
              <dd className="text-end font-semibold">{walkInName.trim() || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-brand-200">{t("summaryVehicle")}</dt>
              <dd className="text-end font-semibold">
                {[
                  brandIsOther ? rawBrand : brand?.name,
                  modelIsOther ? rawModel : model?.name,
                  modelIsOther
                    ? rawYear
                    : model?.yearRanges.find((y) => y.id === yearRangeId)?.label,
                ]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-brand-200">{t("summaryPart")}</dt>
              <dd className="text-end font-semibold">
                {(partIsOther ? rawPart : part?.name) || "—"}
              </dd>
            </div>
            {paymentPlan !== "none" && (
              <>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-200">{t("summaryPaidNow")}</dt>
                  <dd className="text-end font-semibold" dir="ltr">
                    ${(payCents / 100).toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-200">{t("summaryRemaining")}</dt>
                  <dd className="text-end font-semibold" dir="ltr">
                    ${(remainingCents / 100).toFixed(2)}
                  </dd>
                </div>
              </>
            )}
          </dl>

          {/* What the order will look like the moment it is saved — no payment
              means it lands approved and awaiting money, not pending. */}
          <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-caption text-brand-100">
            {paymentPlan === "none" ? t("outcomeApproved") : t("outcomeSourcing")}
          </p>

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || pending}
            className={`${btnAccent} mt-4 w-full`}
          >
            {pending ? t("creating") : t("create")}
          </button>
          <Link href="/admin/requests" className={`${btnSecondary} mt-2 w-full`}>
            {tc("cancel")}
          </Link>
        </div>
      </aside>
    </div>
  );
}
