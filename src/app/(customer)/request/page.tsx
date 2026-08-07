import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { yearLabel } from "@/lib/years";
import { IconBell, IconDrop, IconQuote } from "@/components/icons";
import {
  RequestForm,
  type RequestFormInitial,
  type TaxonomyBrand,
  type TaxonomyCategory,
} from "./RequestForm";

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{
    brandId?: string;
    carModelId?: string;
    yearRangeId?: string;
    categoryId?: string;
    subCategoryId?: string;
  }>;
}) {
  const [locale, t, params, brands, categories] = await Promise.all([
    getLocale(),
    getTranslations("requestForm"),
    searchParams,
    prisma.brand.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        models: {
          orderBy: { name: "asc" },
          include: {
            yearRanges: { orderBy: { startYear: "asc" } },
            trims: { orderBy: { name: "asc" } },
          },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        subCategories: {
          orderBy: { name: "asc" },
          include: { parts: { orderBy: { name: "asc" } } },
        },
      },
    }),
  ]);

  // Taxonomy rows carry optional Kurdish/Arabic names; fall back to English.
  const localized = (row: { name: string; nameKu?: string | null; nameAr?: string | null }) =>
    (locale === "ku" ? row.nameKu : locale === "ar" ? row.nameAr : null) ?? row.name;

  const brandData: TaxonomyBrand[] = brands.map((b) => ({
    id: b.id,
    name: b.name,
    models: b.models.map((m) => ({
      id: m.id,
      name: m.name,
      yearRanges: m.yearRanges.map((y) => ({
        id: y.id,
        label: yearLabel(y),
      })),
      // Only some models have curated trims; the form hides the field when a
      // model has none rather than showing an empty dropdown.
      trims: m.trims.map((tr) => ({ id: tr.id, name: tr.name })),
    })),
  }));

  const categoryData: TaxonomyCategory[] = categories.map((c) => ({
    id: c.id,
    name: localized(c),
    subCategories: c.subCategories.map((s) => ({
      id: s.id,
      name: localized(s),
      parts: s.parts.map((p) => ({
        id: p.id,
        name: localized(p),
        requiresColorCode: p.requiresColorCode,
        conditionApplies: p.conditionApplies,
        priceMin: p.priceMinUsd?.toString() ?? null,
        priceMax: p.priceMaxUsd?.toString() ?? null,
      })),
    })),
  }));

  const initial: RequestFormInitial = {
    brandId: params.brandId,
    carModelId: params.carModelId,
    yearRangeId: params.yearRangeId,
    categoryId: params.categoryId,
    subCategoryId: params.subCategoryId,
  };

  const aside = [
    { icon: IconQuote, title: t("asideQuoteTitle"), body: t("asideQuoteBody") },
    { icon: IconDrop, title: t("asideColorTitle"), body: t("asideColorBody") },
    { icon: IconBell, title: t("asideNotifyTitle"), body: t("asideNotifyBody") },
  ];

  return (
    <div>
      <h1 className="text-title font-bold text-steel-900">{t("title")}</h1>
      <p className="mt-2 mb-8 max-w-xl text-body text-steel-500">{t("subtitle")}</p>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RequestForm brands={brandData} categories={categoryData} initial={initial} />
        </div>

        <aside className="space-y-5">
          {aside.map((item, i) => (
            <div
              key={item.title}
              className={
                i === 0
                  ? "rounded-2xl bg-brand-900 p-5 text-white"
                  : "rounded-2xl bg-steel-100/70 p-5"
              }
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  i === 0 ? "bg-brand-800 text-brand-200" : "bg-white text-brand-600 ring-1 ring-steel-200"
                }`}
              >
                <item.icon size={20} />
              </span>
              <h2
                className={`mt-3.5 font-heading text-body font-bold ${
                  i === 0 ? "text-white" : "text-steel-900"
                }`}
              >
                {item.title}
              </h2>
              <p
                className={`mt-1.5 text-caption leading-relaxed ${
                  i === 0 ? "text-brand-100" : "text-steel-600"
                }`}
              >
                {item.body}
              </p>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
