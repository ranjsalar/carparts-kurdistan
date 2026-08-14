import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { yearLabel } from "@/lib/years";
import type { TaxonomyBrand, TaxonomyCategory } from "@/app/(customer)/request/RequestForm";
import { WalkInForm } from "./WalkInForm";

/*
  Taxonomy is loaded exactly as the customer request page loads it — same
  queries, same localisation rule, same shapes — so a brand or part that
  appears on the website appears at the counter too, without a second copy of
  the mapping to keep in step.
*/
export default async function WalkInPage() {
  const [locale, t, brands, categories] = await Promise.all([
    getLocale(),
    getTranslations("admin.walkIn"),
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

  const localized = (row: { name: string; nameKu?: string | null; nameAr?: string | null }) =>
    (locale === "ku" ? row.nameKu : locale === "ar" ? row.nameAr : null) ?? row.name;

  const brandData: TaxonomyBrand[] = brands.map((b) => ({
    id: b.id,
    name: b.name,
    models: b.models.map((m) => ({
      id: m.id,
      name: m.name,
      yearRanges: m.yearRanges.map((y) => ({ id: y.id, label: yearLabel(y) })),
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

  return (
    <div>
      <h1 className="text-title font-bold text-steel-900">{t("title")}</h1>
      <p className="mt-2 mb-7 max-w-2xl text-body text-steel-500">{t("subtitle")}</p>
      <WalkInForm brands={brandData} categories={categoryData} />
    </div>
  );
}
