import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import {
  addCategory,
  addPart,
  addSubCategory,
  deleteCategory,
  deletePart,
  deleteSubCategory,
  setPartPriceRange,
  togglePartColorCode,
} from "./actions";

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("admin.taxonomy");
  const te = await getTranslations("errors");
  const { error } = await searchParams;
  const errorKey = error === "in-use" ? "inUse" : error === "bad-range" ? "badRange" : "generic";
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      subCategories: {
        orderBy: { name: "asc" },
        include: { parts: { orderBy: { name: "asc" } } },
      },
    },
  });

  return (
    <div>
      <h1 className="mb-2 text-title font-bold text-steel-900">{t("partsTitle")}</h1>
      <p className="mb-6 text-caption text-steel-500">{t("partsSubtitle")}</p>

      {error && (
        <p className="mb-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
          {te(errorKey)}
        </p>
      )}

      <form action={addCategory} className="mb-6 flex max-w-md gap-2">
        <input
          name="name"
          required
          placeholder={t("categoryPlaceholder")}
          className="flex-1 rounded-lg border border-steel-300 px-3.5 py-2 text-caption text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
        />
        <button className="rounded-lg bg-brand-700 px-4 py-2 font-heading text-caption font-semibold text-white hover:bg-brand-800">
          {t("addCategory")}
        </button>
      </form>

      <div className="space-y-3">
        {categories.map((category) => (
          <details key={category.id} className="rounded-2xl border border-steel-200 bg-white" open>
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
              <span className="font-heading font-semibold text-steel-900">
                {category.name}{" "}
                <span className="ms-2 text-caption font-normal text-steel-400">
                  {t("subsCount", { count: category.subCategories.length })}
                </span>
              </span>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={category.id} />
                <button className="text-caption text-danger-600 hover:underline">
                  {t("delete")}
                </button>
              </form>
            </summary>

            <div className="border-t border-steel-100 px-4 py-3">
              <form action={addSubCategory} className="mb-3 flex max-w-md gap-2">
                <input type="hidden" name="categoryId" value={category.id} />
                <input
                  name="name"
                  required
                  placeholder={t("subPlaceholder")}
                  className="flex-1 rounded-lg border border-steel-300 px-3.5 py-1.5 text-caption text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                />
                <button className="rounded-lg bg-steel-800 px-3 py-1.5 font-heading text-caption font-semibold text-white hover:bg-steel-700">
                  {t("addSub")}
                </button>
              </form>

              <ul className="space-y-2">
                {category.subCategories.map((sub) => (
                  <li key={sub.id} className="rounded-xl bg-steel-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-steel-800">{sub.name}</span>
                      <form action={deleteSubCategory}>
                        <input type="hidden" name="id" value={sub.id} />
                        <button className="text-caption text-danger-600 hover:underline">
                          {t("delete")}
                        </button>
                      </form>
                    </div>

                    <ul className="mt-2 space-y-1.5">
                      {sub.parts.map((part) => (
                        <li
                          key={part.id}
                          className="rounded-lg bg-white px-3 py-2 ring-1 ring-steel-200"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-caption text-steel-800">
                              {part.name}
                              {part.requiresColorCode && (
                                <span className="ms-2 rounded-full bg-accent-100 px-2 py-0.5 text-overline text-accent-800">
                                  {t("colorChip")}
                                </span>
                              )}
                              {part.priceMinUsd !== null && part.priceMaxUsd !== null && (
                                <span
                                  className="ms-2 rounded-full bg-brand-50 px-2 py-0.5 font-heading text-overline font-semibold text-brand-700 ring-1 ring-brand-200"
                                  dir="ltr"
                                >
                                  ${part.priceMinUsd.toString()}–${part.priceMaxUsd.toString()}
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-3">
                              <form action={togglePartColorCode}>
                                <input type="hidden" name="id" value={part.id} />
                                <button className="text-overline text-steel-500 hover:underline">
                                  {part.requiresColorCode ? t("unsetColor") : t("setColor")}
                                </button>
                              </form>
                              <form action={deletePart}>
                                <input type="hidden" name="id" value={part.id} />
                                <button className="text-overline text-danger-600 hover:underline">
                                  {t("delete")}
                                </button>
                              </form>
                            </span>
                          </div>
                          <form
                            action={setPartPriceRange}
                            className="mt-1.5 flex flex-wrap items-center gap-1.5"
                          >
                            <input type="hidden" name="id" value={part.id} />
                            <span className="text-overline text-steel-400">{t("priceRange")}</span>
                            <input
                              name="priceMin"
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={part.priceMinUsd?.toString() ?? ""}
                              placeholder={t("priceMin")}
                              dir="ltr"
                              className="w-20 rounded-lg border border-steel-300 px-2 py-1 text-overline text-steel-900"
                            />
                            <span className="text-steel-400">–</span>
                            <input
                              name="priceMax"
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={part.priceMaxUsd?.toString() ?? ""}
                              placeholder={t("priceMax")}
                              dir="ltr"
                              className="w-20 rounded-lg border border-steel-300 px-2 py-1 text-overline text-steel-900"
                            />
                            <button className="rounded-lg border border-steel-300 px-2 py-1 text-overline text-steel-600 hover:bg-steel-100">
                              {t("priceRangeSet")}
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>

                    <form action={addPart} className="mt-2 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="subCategoryId" value={sub.id} />
                      <input
                        name="name"
                        required
                        placeholder={t("partPlaceholder")}
                        className="w-56 rounded-lg border border-steel-300 px-2 py-1 text-overline text-steel-900"
                      />
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 py-2 text-overline text-steel-600">
                        <input
                          type="checkbox"
                          name="requiresColorCode"
                          className="h-5 w-5 accent-brand-600"
                        />
                        {t("needsColor")}
                      </label>
                      <button className="rounded-lg border border-steel-300 px-2 py-1 text-overline text-steel-600 hover:bg-steel-100">
                        {t("addPart")}
                      </button>
                    </form>
                  </li>
                ))}
                {category.subCategories.length === 0 && (
                  <li className="text-caption text-steel-400">{t("noSubs")}</li>
                )}
              </ul>
            </div>
          </details>
        ))}
        {categories.length === 0 && (
          <p className="text-caption text-steel-400">{t("noCategories")}</p>
        )}
      </div>
    </div>
  );
}
