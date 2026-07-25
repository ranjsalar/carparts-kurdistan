import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { statusBadgeClasses } from "@/lib/status";
import { SHIPMENT_STAGES } from "@/lib/shipments";
import { formatUsd } from "@/lib/format";
import type { RequestStatus } from "@/generated/prisma/enums";

export default async function AdminDashboard() {
  const t = await getTranslations("admin.dashboard");
  const ts = await getTranslations("statuses");
  const tn = await getTranslations("admin.dashboard.auditNotes");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [requestsToday, pendingQuotes, revenue, customers, parts, byStatus, recentLogins] =
    await Promise.all([
      prisma.partRequest.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.partRequest.count({ where: { status: "PENDING" } }),
      prisma.partRequest.aggregate({
        _sum: { priceUsd: true },
        where: { paidAt: { gte: startOfMonth } },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.part.count(),
      prisma.partRequest.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.adminLoginLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    ]);

  const stageCounts = new Map(byStatus.map((g) => [g.status, g._count._all]));
  const revenueMonth = formatUsd(revenue._sum.priceUsd);

  const stats = [
    { label: t("requestsToday"), value: String(requestsToday) },
    { label: t("pendingQuotes"), value: String(pendingQuotes) },
    { label: t("revenueMonth"), value: `$${revenueMonth}` },
    { label: t("customers"), value: String(customers) },
    { label: t("catalogParts"), value: String(parts) },
  ];

  // PAID is included so orders waiting for their first shipment step are visible.
  const stages: RequestStatus[] = ["PAID", ...SHIPMENT_STAGES];

  return (
    <div>
      <h1 className="mb-7 text-title font-bold text-steel-900">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
              // "password OK, awaiting 2FA" is an intermediate step, not a
              // failure — it's logged success=false only because no session was
              // issued yet, so show it as neutral rather than red.
              const pending = log.note === "password_ok_awaiting_totp";
              const badge = pending
                ? { cls: "bg-accent-50 text-accent-700 ring-1 ring-accent-200", label: t("loginPending") }
                : log.success
                  ? { cls: "bg-success-50 text-success-700 ring-1 ring-success-100", label: t("loginOk") }
                  : { cls: "bg-danger-50 text-danger-700 ring-1 ring-danger-100", label: t("loginFail") };
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
                    {tn.has(log.note) ? tn(log.note) : log.note}
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
