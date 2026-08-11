"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { SelectorBrand } from "@/app/HeroSelector";

/*
  Brand cards expand in place to list their models (click, not hover — hover
  doesn't work on touch devices). The expanded panel is a sibling grid item
  spanning every column, so CSS grid naturally breaks the row there instead
  of pushing later cards sideways. Picking a model prefills brand+model into
  the request form; the customer still picks the year range there.
*/
export function BrandGrid({ brands }: { brands: SelectorBrand[] }) {
  const t = useTranslations("home");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {brands.map((brand) => {
        const isOpen = expandedId === brand.id;
        return (
          <Fragment key={brand.id}>
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : brand.id)}
              aria-expanded={isOpen}
              className={`group rounded-2xl border px-5 py-6 text-center transition-[color,background-color,border-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                isOpen
                  ? "border-brand-500 bg-brand-50 shadow-lg shadow-steel-900/5"
                  : "border-steel-200 bg-white hover:border-brand-400 hover:shadow-lg hover:shadow-steel-900/5"
              }`}
            >
              <p
                className={`font-heading text-heading font-bold uppercase tracking-wide transition-colors ${
                  isOpen ? "text-brand-700" : "text-steel-800 group-hover:text-brand-700"
                }`}
              >
                {brand.name}
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-caption text-steel-400">
                {t("modelsCount", { count: brand.models.length })}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                  className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  <path d="M6 9 l6 6 6-6" />
                </svg>
              </p>
            </button>

            {isOpen && (
              <div className="animate-rise col-span-2 rounded-2xl border border-brand-200 bg-brand-50/60 p-5 sm:col-span-4">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {brand.models.map((model) => (
                    <Link
                      key={model.id}
                      href={`/request?brandId=${brand.id}&carModelId=${model.id}`}
                      className="rounded-xl bg-white px-3.5 py-2.5 text-start ring-1 ring-steel-200 transition-colors hover:ring-brand-400"
                    >
                      <p className="font-heading text-caption font-semibold text-steel-900">
                        {model.name}
                      </p>
                      {model.yearRanges.length > 0 && (
                        <p className="mt-0.5 text-overline text-steel-400" dir="ltr">
                          {model.yearRanges.map((y) => y.label).join(", ")}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
