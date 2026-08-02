import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { HEADERS } from "@/lib/taxonomy-io";
import { SubmitButton } from "@/components/SubmitButton";
import { SuccessDialog } from "@/components/SuccessDialog";
import { importTaxonomyAction } from "./actions";

export default async function AdminTaxonomyPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
    created?: string;
    updated?: string;
    skipped?: string;
  }>;
}) {
  const { success, error, created, updated, skipped } = await searchParams;
  const t = await getTranslations("admin.taxonomyIo");
  const te = await getTranslations("errors");

  const [brands, models, years, categories, subCategories, parts] = await Promise.all([
    prisma.brand.count(),
    prisma.carModel.count(),
    prisma.yearRange.count(),
    prisma.category.count(),
    prisma.subCategory.count(),
    prisma.part.count(),
  ]);

  const counts: Record<"vehicles" | "parts", string> = {
    vehicles: t("vehiclesCount", { brands, models, years }),
    parts: t("partsCount", { categories, subCategories, parts }),
  };

  return (
    <div className="max-w-3xl">
      {success && <SuccessDialog messageKey={success} redirectTo="/admin/taxonomy" />}
      <h1 className="mb-2 text-title font-bold text-steel-900">{t("title")}</h1>
      <p className="mb-6 text-caption text-steel-500">{t("intro")}</p>

      {error && (
        <p className="mb-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
          {te.has(error) ? te(error) : te("generic")}
        </p>
      )}
      {success === "taxonomyImported" && (
        <p className="mb-4 rounded-lg border-s-4 border-success-600 bg-success-50 px-4 py-2.5 text-caption text-success-700">
          {t("importSummary", {
            created: created ?? "0",
            updated: updated ?? "0",
            skipped: skipped ?? "0",
          })}
        </p>
      )}

      <div className="space-y-5">
        {(["vehicles", "parts"] as const).map((type) => (
          <section key={type} className="rounded-2xl border border-steel-200 bg-white p-5">
            <h2 className="font-heading text-body font-bold text-steel-900">{t(type)}</h2>
            <p className="mt-0.5 text-caption text-steel-500">{counts[type]}</p>

            <div className="mt-4">
              <p className="mb-2 font-heading text-overline font-semibold uppercase text-steel-500">
                {t("export")}
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/admin/taxonomy/export?type=${type}&format=csv`}
                  className="rounded-lg border border-steel-300 bg-white px-4 py-2 font-heading text-caption font-semibold text-steel-700 hover:border-brand-500"
                >
                  {t("downloadCsv")}
                </a>
                <a
                  href={`/api/admin/taxonomy/export?type=${type}&format=json`}
                  className="rounded-lg border border-steel-300 bg-white px-4 py-2 font-heading text-caption font-semibold text-steel-700 hover:border-brand-500"
                >
                  {t("downloadJson")}
                </a>
              </div>
            </div>

            <form action={importTaxonomyAction} className="mt-5 border-t border-steel-100 pt-4">
              <input type="hidden" name="type" value={type} />
              <p className="mb-2 font-heading text-overline font-semibold uppercase text-steel-500">
                {t("import")}
              </p>
              <input
                type="file"
                name="file"
                required
                accept=".csv,.json,text/csv,application/json"
                className="block w-full text-caption text-steel-600 file:me-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:font-heading file:text-caption file:font-semibold file:text-white hover:file:bg-brand-800"
              />
              <p className="mt-2 text-overline text-steel-500">
                {t("columns")}: <span dir="ltr">{HEADERS[type].join(", ")}</span>
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-overline text-steel-500">{t("upsertOnly")}</p>
                <SubmitButton className="rounded-lg bg-brand-700 px-5 py-2.5 font-heading text-sm font-semibold text-white hover:bg-brand-800">
                  {t("runImport")}
                </SubmitButton>
              </div>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
