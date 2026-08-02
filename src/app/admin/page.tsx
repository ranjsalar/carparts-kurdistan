import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { statusBadgeClasses } from "@/lib/status";
import { SHIPMENT_STAGES } from "@/lib/shipments";
import { formatUsd } from "@/lib/format";
import { centsToUsd, computePaymentState } from "@/lib/payments";
import { LOGIN_NOTE_LABEL } from "@/lib/admin-activity";
import type { RequestStatus } from "@/generated/prisma/enums";

export default async function AdminDashboard() {
  const t = await getTranslations("admin.dashboard");
  const ts = await getTranslations("statuses");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    requestsToday,
    pendingQuotes,
    revenue,
    openRequests,
    customers,
    parts,
    byStatus,
    recentLogins,
  ] = await Promise.all([
    prisma.partRequest.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.partRequest.count({ where: { status: "PENDING" } }),
    prisma.partRequest.aggregate({
      _sum: { priceUsd: true },
      where: { paidAt: { gte: startOfMonth } },
    }),
    // Everything quoted but not yet fully settled, for the pipeline figure.
    prisma.partRequest.findMany({
      where: {
        status: { in: ["QUOTED", "APPROVED", "SOURCING", "SHIPPED", "ARRIVED", "READY"] },
        priceUsd: { not: null },
      },
      select: {
        status: true,
        priceUsd: true,
        payments: { select: { amountUsd: true, status: true } },
      },
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.part.count(),
    prisma.partRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.adminLoginLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const stageCounts = new Map(byStatus.map((g) => [g.status, g._count._all]));

  // Two deliberately separate money figures:
  //  • revenueMonth  — money actually received: orders fully settled this month.
  //  • pipelineValue — money still expected: the quoted total of every request
  //    that has been quoted but not yet fully paid off. Mid-pipeline orders
  //    (sourcing/shipped/…) only count while they still owe a balance.
  const revenueMonth = formatUsd(revenue._sum.priceUsd);
  const pipelineCents = openRequests.reduce((sum, r) => {
    const state = computePaymentState(r.priceUsd, r.payments);
    const awaitingPayment = r.status === "QUOTED" || r.status === "APPROVED";
    return awaitingPayment || state.remainingCents > 0 ? sum + state.totalCents : sum;
  }, 0);
  const pipelineValue = centsToUsd(pipelineCents);

  const stats = [
    { label: t("requestsToday"), hint: null, value: String(requestsToday) },
    { label: t("pendingQuotes"), hint: null, value: String(pendingQuotes) },
    { label: t("revenueMonth"), hint: t("revenueMonthHint"), value: `$${revenueMonth}` },
    { label: t("pipelineValue"), hint: t("pipelineValueHint"), value: `$${pipelineValue}` },
    { label: t("customers"), hint: null, value: String(customers) },
    { label: t("catalogParts"), hint: null, value: String(parts) },
  ];

  // PAID is included so orders waiting for their first shipment step are visible.
  const stages: RequestStatus[] = ["PAID", ...SHIPMENT_STAGES];

  return (
    <div>
      <h1 className="mb-7 text-title font-bold text-steel-900">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={
              i === 0
                ? "rounded-2xl bg-brand-900 p-5 text-white"
                : "rounded-2xl border border-steel-200 bg-white p-5"
            }
          >
            <p
              className={`font-heading text-title font-bold ${i === 0 ? "text-white" : "text-steel-900"}`}
              dir="ltr"
            >
              {s.value}
            </p>
            <p className={`mt-1 text-caption ${i === 0 ? "text-brand-200" : "text-steel-500"}`}>
              {s.label}
            </p>
            {s.hint && <p className="mt-0.5 text-overline text-steel-400">{s.hint}</p>}
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-4 font-heading text-overline font-semibold uppercase text-steel-500">
        {t("byStage")}
      </h2>
      <div className="flex flex-wrap gap-2.5">
        {stages.map((stage) => (
          <Link
            key={stage}
            href={`/admin/requests?status=${stage}`}
            className="flex items-center gap-2.5 rounded-xl border border-steel-200 bg-white px-4 py-2.5 transition-colors hover:border-brand-400"
          >
            <span
              className={`rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${statusBadgeClasses[stage]}`}
            >
              {ts(stage)}
            </span>
            <span className="font-heading text-heading font-bold text-steel-900">
              {stageCounts.get(stage) ?? 0}
            </span>
          </Link>
        ))}
      </div>

      {/* Admin login audit — success/failure of every admin sign-in attempt */}
      <h2 className="mt-10 mb-4 font-heading text-overline font-semibold uppercase text-steel-500">
        {t("recentLogins")}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-steel-200 bg-white">
        {recentLogins.length === 0 ? (
          <p className="px-5 py-6 text-caption text-steel-400">{t("noLogins")}</p>
        ) : (
          <ul className="divide-y divide-steel-100">
            {recentLogins.map((log) => {
              const badge = log.success
                ? { cls: "bg-success-50 text-success-700 ring-1 ring-success-100", label: "Success" }
                : { cls: "bg-danger-50 text-danger-700 ring-1 ring-danger-100", label: "Failed" };
              return (
              <li key={log.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${badge.cls}`}
                >
                  {badge.label}
                </span>
                <span className="text-caption text-steel-700" dir="ltr">
                  {log.email}
                </span>
                {log.note && (
                  <span className="text-caption text-steel-500">
                    {LOGIN_NOTE_LABEL[log.note] ?? log.note}
                  </span>
                )}
                <span className="ms-auto text-overline text-steel-400" dir="ltr">
                  {log.ip} ·{" "}
                  {log.createdAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-10 text-caption text-steel-500">
        <Link href="/admin/requests" className="font-semibold text-brand-700 hover:underline">
          {t("queueLink")}
        </Link>{" "}
        {t("queueHint")}
      </p>
    </div>
  );
}
