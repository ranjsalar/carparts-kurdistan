import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { statusBadgeClasses, statusLabels } from "@/lib/status";
import { formatUsd } from "@/lib/format";
import { computePaymentState } from "@/lib/payments";
import { partLabel, vehicleLabel } from "@/lib/request-display";
import { IconRequest } from "@/components/icons";
import type { RequestStatus } from "@/generated/prisma/enums";

const ALL_STATUSES = Object.keys(statusLabels) as RequestStatus[];

export default async function RequestsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const t = await getTranslations("admin.queue");
  const ts = await getTranslations("statuses");
  const { status } = await searchParams;
  const activeStatus = ALL_STATUSES.includes(status as RequestStatus)
    ? (status as RequestStatus)
    : null;

  const [requests, grouped, perCustomer, converted] = await Promise.all([
    prisma.partRequest.findMany({
      where: activeStatus ? { status: activeStatus } : {},
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        brand: true,
        carModel: true,
        yearRange: true,
        trim: true,
        part: true,
        payments: true,
      },
    }),
    prisma.partRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.partRequest.groupBy({ by: ["customerId"], _count: { _all: true } }),
    prisma.partRequest.groupBy({
      by: ["customerId"],
      _count: { _all: true },
      where: {
        status: {
          in: ["APPROVED", "PAID", "SOURCING", "SHIPPED", "ARRIVED", "READY", "COMPLETED"],
        },
      },
    }),
  ]);

  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

  // Customers with several requests and not a single approval — likely price
  // browsers. Informational only; nothing is blocked.
  const convertedIds = new Set(converted.map((g) => g.customerId));
  const lowConversionIds = new Set(
    perCustomer
      .filter((g) => g._count._all >= 3 && !convertedIds.has(g.customerId))
      .map((g) => g.customerId),
  );

  return (
    <div>
      <h1 className="mb-6 text-title font-bold text-steel-900">{t("title")}</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/requests"
          className={`inline-flex min-h-11 items-center rounded-full px-4 font-heading text-caption font-semibold ${
            !activeStatus
              ? "bg-brand-800 text-white"
              : "bg-white text-steel-600 ring-1 ring-steel-200 hover:ring-brand-400"
          }`}
        >
          {t("all")} ({total})
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/requests?status=${s}`}
            className={`inline-flex min-h-11 items-center rounded-full px-4 font-heading text-caption font-semibold ${
              activeStatus === s
                ? "bg-brand-800 text-white"
                : "bg-white text-steel-600 ring-1 ring-steel-200 hover:ring-brand-400"
            }`}
          >
            {ts(s)} ({counts.get(s) ?? 0})
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-steel-300 bg-white px-4 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-steel-100 text-steel-400">
            <IconRequest size={26} />
          </span>
          <p className="mt-4 font-heading text-body font-bold text-steel-700">{t("empty")}</p>
          <p className="mx-auto mt-1 max-w-sm text-caption text-steel-500">{t("emptyHint")}</p>
        </div>
      ) : (
        <>
          {/* Below lg the table's action column falls off the right edge, so the
              same rows render as cards — no horizontal scrolling to reach the
              only interactive element in the row. */}
          <ul className="space-y-3 lg:hidden">
            {requests.map((r) => {
              const pay = computePaymentState(r.priceUsd, r.payments);
              const owesBalance = pay.confirmedCents > 0 && pay.remainingCents > 0;
              return (
                <li key={r.id} className="rounded-2xl border border-steel-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-steel-900">
                        {r.customer.name}
                        {lowConversionIds.has(r.customerId) && (
                          <span
                            className="ms-2 rounded-full bg-steel-100 px-2 py-0.5 font-heading text-overline font-semibold uppercase text-steel-500 ring-1 ring-steel-300"
                            title={t("lowConversionHint")}
                          >
                            {t("lowConversion")}
                          </span>
                        )}
                      </p>
                      <p className="text-overline text-steel-500" dir="ltr">
                        {r.customer.phone ?? r.customer.email}
                      </p>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 font-heading text-overline font-semibold uppercase ${statusBadgeClasses[r.status]}`}
                    >
                      {ts(r.status)}
                    </span>
                  </div>

                  <p className="mt-2 text-caption text-steel-700">
                    {vehicleLabel(r)}
                    <span className="text-steel-500"> · {partLabel(r)}</span>
                    {r.colorCode && <span className="text-steel-500"> · {r.colorCode}</span>}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-steel-100 pt-3">
                    <span className="font-heading font-semibold text-steel-900" dir="ltr">
                      {r.priceUsd !== null ? `$${formatUsd(r.priceUsd)}` : "—"}
                    </span>
                    {owesBalance && (
                      <span className="font-heading text-overline font-semibold text-accent-700" dir="ltr">
                        ${pay.remaining} {t("remaining")}
                      </span>
                    )}
                    <span className="text-overline text-steel-500">
                      {r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                    <Link
                      href={`/admin/requests/${r.id}`}
                      className="ms-auto inline-flex min-h-11 items-center rounded-lg px-3 font-heading text-caption font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      {t("open")}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

        <div className="hidden overflow-x-auto rounded-2xl border border-steel-200 bg-white lg:block">
          <table className="w-full text-start text-caption">
            <thead className="bg-steel-100/70">
              <tr>
                <th className="px-4 py-3 text-start font-heading text-overline font-semibold uppercase text-steel-500">
                  {t("date")}
                </th>
                <th className="px-4 py-3 text-start font-heading text-overline font-semibold uppercase text-steel-500">
                  {t("customer")}
                </th>
                <th className="px-4 py-3 text-start font-heading text-overline font-semibold uppercase text-steel-500">
                  {t("vehicle")}
                </th>
                <th className="px-4 py-3 text-start font-heading text-overline font-semibold uppercase text-steel-500">
                  {t("part")}
                </th>
                <th className="px-4 py-3 text-start font-heading text-overline font-semibold uppercase text-steel-500">
                  {t("price")}
                </th>
                <th className="px-4 py-3 text-start font-heading text-overline font-semibold uppercase text-steel-500">
                  {t("status")}
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {requests.map((r) => {
                const pay = computePaymentState(r.priceUsd, r.payments);
                const owesBalance = pay.confirmedCents > 0 && pay.remainingCents > 0;
                return (
                <tr key={r.id} className="transition-colors hover:bg-brand-50/50">
                  <td className="whitespace-nowrap px-4 py-3.5 text-steel-500">
                    {r.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-steel-900">
                      {r.customer.name}
                      {lowConversionIds.has(r.customerId) && (
                        <span
                          className="ms-2 rounded-full bg-steel-100 px-2 py-0.5 font-heading text-overline font-semibold uppercase text-steel-500 ring-1 ring-steel-300"
                          title={t("lowConversionHint")}
                        >
                          {t("lowConversion")}
                        </span>
                      )}
                    </p>
                    <p className="text-overline text-steel-400" dir="ltr">
                      {r.customer.phone ?? r.customer.email}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-steel-700">
                    {vehicleLabel(r)}
                  </td>
                  <td className="px-4 py-3.5 text-steel-700">
                    {partLabel(r)}
                    {r.colorCode && (
                      <span className="ms-1 text-overline text-steel-400">· {r.colorCode}</span>
                    )}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3.5 font-heading font-semibold text-steel-900"
                    dir="ltr"
                  >
                    {r.priceUsd !== null ? `$${formatUsd(r.priceUsd)}` : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 font-heading text-overline font-semibold uppercase ${statusBadgeClasses[r.status]}`}
                    >
                      {ts(r.status)}
                    </span>
                    {owesBalance && (
                      <span
                        className="mt-1 block whitespace-nowrap font-heading text-overline font-semibold text-accent-700"
                        dir="ltr"
                      >
                        ${pay.remaining} {t("remaining")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/admin/requests/${r.id}`}
                      className="font-heading font-semibold text-brand-700 hover:underline"
                    >
                      {t("open")}
                    </Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
