import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { statusBadgeClasses } from "@/lib/status";
import { btnPrimary, card } from "@/components/ui";

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const t = await getTranslations("myRequests");
  const ts = await getTranslations("statuses");
  const locale = await getLocale();
  const { submitted } = await searchParams;
  const requests = await prisma.partRequest.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      brand: true,
      carModel: true,
      yearRange: true,
      part: true,
    },
  });

  // Part names carry optional Kurdish/Arabic translations; fall back to English.
  const localized = (row: { name: string; nameKu?: string | null; nameAr?: string | null }) =>
    (locale === "ku" ? row.nameKu : locale === "ar" ? row.nameAr : null) ?? row.name;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title font-bold text-steel-900">{t("title")}</h1>
        <Link href="/request" className={btnPrimary}>
          {t("newRequest")}
        </Link>
      </div>

      {submitted && (
        <div className="mb-6 rounded-xl border-s-4 border-success-600 bg-success-50 px-4 py-3">
          <p className="font-heading text-body font-bold text-success-700">
            {t("submittedTitle")}
          </p>
          <p className="mt-0.5 text-caption text-success-700">{t("submittedBody")}</p>
        </div>
      )}

      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-steel-300 bg-white px-4 py-14 text-center text-body text-steel-500">
          {t("empty")}{" "}
          <Link href="/request" className="font-semibold text-brand-700 hover:underline">
            {t("requestFirst")}
          </Link>
        </p>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id} className={`${card} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/requests/${r.id}`}
                    className="font-heading text-heading font-bold text-steel-900 hover:text-brand-700"
                  >
                    {localized(r.part)}
                  </Link>
                  <p className="mt-1 text-caption text-steel-600">
                    {r.brand.name} {r.carModel.name} ({r.yearRange.startYear}–{r.yearRange.endYear})
                    {r.colorCode && (
                      <span className="ms-2 rounded-md bg-steel-100 px-2 py-0.5 font-heading text-overline font-semibold uppercase text-steel-600">
                        {t("colorBadge", { code: r.colorCode })}
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-heading text-overline font-semibold uppercase ${statusBadgeClasses[r.status]}`}
                >
                  {ts(r.status)}
                </span>
              </div>

              {r.status === "QUOTED" && r.priceUsd !== null && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border-s-4 border-accent-500 bg-accent-50 px-4 py-2.5">
                  <p className="text-caption text-accent-800">
                    {t("quotedPrice")}{" "}
                    <span className="font-heading text-body font-bold" dir="ltr">
                      ${r.priceUsd.toString()}
                    </span>
                  </p>
                  <Link
                    href={`/requests/${r.id}`}
                    className="font-heading text-caption font-bold text-accent-700 hover:underline"
                  >
                    {t("reviewApprove")} →
                  </Link>
                </div>
              )}

              {r.notes && <p className="mt-3 text-caption text-steel-500">“{r.notes}”</p>}

              <div className="mt-4 flex items-center justify-between border-t border-steel-100 pt-3">
                {r.photoUrl ? (
                  <a href={r.photoUrl} target="_blank" rel="noreferrer">
                    <Image
                      src={r.photoUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-lg object-cover ring-1 ring-steel-200"
                    />
                  </a>
                ) : (
                  <span />
                )}
                <p className="text-caption text-steel-400">
                  {t("submittedOn", {
                    date: r.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  })}
                  {" · "}
                  <Link
                    href={`/requests/${r.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {t("viewDetails")}
                  </Link>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
