import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { statusBadgeClasses, statusLabels } from "@/lib/status";
import { formatUsd } from "@/lib/format";
import { computePaymentState } from "@/lib/payments";
import { partLabel, vehicleLabel } from "@/lib/request-display";
import { partyName, partyPhone } from "@/lib/request-customer";
import { ChannelBadge } from "@/components/ChannelBadge";
import { IconRequest } from "@/components/icons";
import { btnPrimary, inputBase, labelBase, selectBase } from "@/components/ui";
import type { RequestStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const ALL_STATUSES = Object.keys(statusLabels) as RequestStatus[];

export default async function RequestsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; channel?: string }>;
}) {
  const t = await getTranslations("admin.queue");
  const ts = await getTranslations("statuses");
  const tch = await getTranslations("admin.channel");
  const { status, q, channel } = await searchParams;
  const activeStatus = ALL_STATUSES.includes(status as RequestStatus)
    ? (status as RequestStatus)
    : null;
  const query = (q ?? "").trim();
  const activeChannel = channel === "WEB" || channel === "WALK_IN" ? channel : null;

  /*
    Search has to reach both kinds of customer. A web order's name and phone
    live on the related User; a walk-in order's live on the request itself, so
    the same query string is matched against both sets of columns.
  */
  const searchWhere: Prisma.PartRequestWhereInput = query
    ? {
        OR: [
          { customer: { name: { contains: query, mode: "insensitive" as const } } },
          { customer: { phone: { contains: query } } },
          { customer: { email: { contains: query, mode: "insensitive" as const } } },
          { walkInName: { contains: query, mode: "insensitive" as const } },
          { walkInPhone: { contains: query } },
          { walkInEmail: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const where: Prisma.PartRequestWhereInput = {
    ...(activeStatus ? { status: activeStatus } : {}),
    ...(activeChannel ? { channel: activeChannel } : {}),
    ...searchWhere,
  };

  const [requests, grouped, perCustomer, converted] = await Promise.all([
    prisma.partRequest.findMany({
      where,
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
    // Both groupBys exclude walk-ins: they share a null customerId, so they
    // would collapse into a single bucket and every counter order would be
    // badged "low conversion" once three of them existed.
    prisma.partRequest.groupBy({
      by: ["customerId"],
      _count: { _all: true },
      where: { customerId: { not: null } },
    }),
    prisma.partRequest.groupBy({
      by: ["customerId"],
      _count: { _all: true },
      where: {
        customerId: { not: null },
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

      {/* Plain GET form so a filtered queue is a shareable, bookmarkable URL —
          same approach as the payments queue. Status stays in the URL while
          searching so the two filters compose. */}
      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className={labelBase}>
            {t("searchLabel")}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder={t("searchPlaceholder")}
            className={inputBase}
          />
        </div>
        <div>
          <label htmlFor="channel" className={labelBase}>
            {t("channelLabel")}
          </label>
          <select id="channel" name="channel" defaultValue={activeChannel ?? ""} className={selectBase}>
            <option value="">{t("channelAll")}</option>
            <option value="WEB">{tch("web")}</option>
            <option value="WALK_IN">{tch("walkIn")}</option>
          </select>
        </div>
        <button className={btnPrimary}>{t("applyFilters")}</button>
        {(query || activeChannel) && (
          <Link
            href={activeStatus ? `/admin/requests?status=${activeStatus}` : "/admin/requests"}
            className="flex min-h-11 items-center text-caption font-semibold text-brand-700 hover:underline"
          >
            {t("clearFilters")}
          </Link>
        )}
      </form>

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
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-steel-900">
                        {partyName(r)}
                        <ChannelBadge request={r} />
                        {r.customerId !== null && lowConversionIds.has(r.customerId) && (
                          <span
                            className="rounded-full bg-steel-100 px-2 py-0.5 font-heading text-overline font-semibold uppercase text-steel-500 ring-1 ring-steel-300"
                            title={t("lowConversionHint")}
                          >
                            {t("lowConversion")}
                          </span>
                        )}
                      </p>
                      <p className="text-overline text-steel-500" dir="ltr">
                        {partyPhone(r) ?? r.customer?.email ?? r.walkInEmail ?? ""}
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
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-steel-900">
                      {partyName(r)}
                      <ChannelBadge request={r} />
                      {r.customerId !== null && lowConversionIds.has(r.customerId) && (
                        <span
                          className="rounded-full bg-steel-100 px-2 py-0.5 font-heading text-overline font-semibold uppercase text-steel-500 ring-1 ring-steel-300"
                          title={t("lowConversionHint")}
                        >
                          {t("lowConversion")}
                        </span>
                      )}
                    </p>
                    <p className="text-overline text-steel-400" dir="ltr">
                      {partyPhone(r) ?? r.customer?.email ?? r.walkInEmail ?? ""}
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
