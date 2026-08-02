import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { yearLabel } from "@/lib/years";
import { addBrand, addModel, addYearRange, deleteBrand, deleteModel, deleteYearRange } from "./actions";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("admin.taxonomy");
  const te = await getTranslations("errors");
  const { error } = await searchParams;
  const errorKey = error === "in-use" ? "inUse" : error === "bad-years" ? "badYears" : "generic";
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: {
      models: {
        orderBy: { name: "asc" },
        include: { yearRanges: { orderBy: { startYear: "asc" } } },
      },
    },
  });

  return (
    <div>
      <h1 className="mb-2 text-title font-bold text-steel-900">{t("vehiclesTitle")}</h1>
      <p className="mb-6 text-caption text-steel-500">{t("vehiclesSubtitle")}</p>

      {error && (
        <p className="mb-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
          {te(errorKey)}
        </p>
      )}

      <form action={addBrand} className="mb-6 flex max-w-md gap-2">
        <input
          name="name"
          required
          placeholder={t("brandPlaceholder")}
          className="flex-1 rounded-lg border border-steel-300 px-3.5 py-2 text-caption text-steel-900 focus:border-brand-500 focus:outline-none"
        />
        <button className="rounded-lg bg-brand-700 px-4 py-2 font-heading text-caption font-semibold text-white hover:bg-brand-800">
          {t("addBrand")}
        </button>
      </form>

      <div className="space-y-3">
        {brands.map((brand) => (
          <details key={brand.id} className="rounded-2xl border border-steel-200 bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
              <span className="font-heading font-semibold text-steel-900">
                {brand.name}{" "}
                <span className="ms-2 text-caption font-normal text-steel-400">
                  {t("modelsCount", { count: brand.models.length })}
                </span>
              </span>
              <form action={deleteBrand}>
                <input type="hidden" name="id" value={brand.id} />
                <button className="text-caption text-danger-600 hover:underline">
                  {t("delete")}
                </button>
              </form>
            </summary>

            <div className="border-t border-steel-100 px-4 py-3">
              <form action={addModel} className="mb-3 flex max-w-md gap-2">
                <input type="hidden" name="brandId" value={brand.id} />
                <input
                  name="name"
                  required
                  placeholder={t("modelPlaceholder")}
                  className="flex-1 rounded-lg border border-steel-300 px-3.5 py-1.5 text-caption text-steel-900 focus:border-brand-500 focus:outline-none"
                />
                <button className="rounded-lg bg-steel-800 px-3 py-1.5 font-heading text-caption font-semibold text-white hover:bg-steel-700">
                  {t("addModel")}
                </button>
              </form>

              <ul className="space-y-2">
                {brand.models.map((model) => (
                  <li key={model.id} className="rounded-xl bg-steel-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-steel-800">{model.name}</span>
                      <form action={deleteModel}>
                        <input type="hidden" name="id" value={model.id} />
                        <button className="text-caption text-danger-600 hover:underline">
                          {t("delete")}
                        </button>
                      </form>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {model.yearRanges.map((yr) => (
                        <span
                          key={yr.id}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-overline text-steel-700 ring-1 ring-steel-200"
                        >
                          {yearLabel(yr)}
                          <form action={deleteYearRange}>
                            <input type="hidden" name="id" value={yr.id} />
                            <button
                              className="text-danger-600 hover:text-danger-700"
                              aria-label={t("delete")}
                            >
                              ✕
                            </button>
                          </form>
                        </span>
                      ))}
                      <form action={addYearRange} className="flex items-center gap-1">
                        <input type="hidden" name="carModelId" value={model.id} />
                        <input
                          name="startYear"
                          required
                          type="number"
                          placeholder={t("yearFrom")}
                          className="w-20 rounded-lg border border-steel-300 px-2 py-1 text-overline text-steel-900"
                        />
                        <input
                          name="endYear"
                          type="number"
                          placeholder={t("yearTo")}
                          className="w-20 rounded-lg border border-steel-300 px-2 py-1 text-overline text-steel-900"
                        />
                        <button className="rounded-lg border border-steel-300 px-2 py-1 text-overline text-steel-600 hover:bg-steel-100">
                          {t("addYears")}
                        </button>
                        <span className="text-overline text-steel-400">{t("addYearsHint")}</span>
                      </form>
                    </div>
                  </li>
                ))}
                {brand.models.length === 0 && (
                  <li className="text-caption text-steel-400">{t("noModels")}</li>
                )}
              </ul>
            </div>
          </details>
        ))}
        {brands.length === 0 && <p className="text-caption text-steel-400">{t("noBrands")}</p>}
      </div>
    </div>
  );
}
