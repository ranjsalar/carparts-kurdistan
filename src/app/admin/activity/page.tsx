import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { ADMIN_ACTION_LABEL, LOGIN_NOTE_LABEL } from "@/lib/admin-activity";
import { SECURITY_EVENT_LABEL } from "@/lib/threat-detection";
import { acknowledgeSecurityEvent } from "./actions";

const actionStyle: Record<string, string> = {
  STATUS_OVERRIDDEN: "bg-accent-50 text-accent-700 ring-1 ring-accent-200",
  CUSTOMER_DELETED: "bg-danger-50 text-danger-700 ring-1 ring-danger-100",
  CUSTOMER_SUSPENDED: "bg-danger-50 text-danger-700 ring-1 ring-danger-100",
  PAYMENT_REJECTED: "bg-danger-50 text-danger-700 ring-1 ring-danger-100",
  PAYMENT_CONFIRMED: "bg-success-50 text-success-700 ring-1 ring-success-100",
};

export default async function AdminActivityPage() {
  // Page chrome follows the reader's language; the log entries themselves do
  // not — see ADMIN_ACTION_LABEL for why.
  const t = await getTranslations("admin.activity");

  const [activity, logins, security] = await Promise.all([
    prisma.adminActivityLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.adminLoginLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    // Open alerts first, then recently acknowledged ones for context.
    prisma.securityEvent.findMany({
      orderBy: [{ acknowledgedAt: { sort: "asc", nulls: "first" } }, { lastSeenAt: "desc" }],
      take: 30,
    }),
  ]);

  const stamp = (d: Date) =>
    d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      <h1 className="mb-2 text-title font-bold text-steel-900">{t("title")}</h1>
      <p className="mb-6 text-caption text-steel-500">{t("intro")}</p>

      {/* Security alerts sit above the ordinary trail and carry their own red
          treatment, so hostile traffic is never something you have to notice
          among normal staff activity. */}
      <h2
        id="security"
        className="mb-3 scroll-mt-6 font-heading text-overline font-semibold uppercase text-steel-500"
      >
        {t("security")}
      </h2>
      <div className="mb-10 overflow-hidden rounded-2xl border border-steel-200 bg-white">
        {security.length === 0 ? (
          <p className="px-5 py-6 text-caption text-steel-500">{t("noSecurity")}</p>
        ) : (
          <ul className="divide-y divide-steel-100">
            {security.map((e) => {
              const open = e.acknowledgedAt === null;
              return (
                <li
                  key={e.id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 ${
                    open ? "bg-danger-50/60" : ""
                  }`}
                >
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${
                      open
                        ? "bg-danger-600 text-white"
                        : "bg-steel-100 text-steel-600 ring-1 ring-steel-200"
                    }`}
                  >
                    {SECURITY_EVENT_LABEL[e.kind] ?? e.kind}
                  </span>
                  {/* English technical detail inside an RTL page: without an
                      explicit direction the trailing full stop and the IP
                      digits reorder (same fix as the timestamps below). */}
                  <span className="text-caption text-steel-800" dir="ltr">
                    {e.detail}
                  </span>
                  {e.hitCount > 1 && (
                    <span className="text-overline text-steel-500">×{e.hitCount}</span>
                  )}
                  {open ? (
                    <form action={acknowledgeSecurityEvent} className="ms-auto">
                      <input type="hidden" name="id" value={e.id} />
                      <button className="inline-flex min-h-11 items-center rounded-lg border border-danger-100 bg-white px-3 font-heading text-overline font-semibold text-danger-700 transition-colors hover:bg-danger-50">
                        {t("acknowledge")}
                      </button>
                    </form>
                  ) : (
                    <span className="ms-auto text-overline text-steel-500" dir="ltr">
                      {t("acknowledgedBy", { who: e.acknowledgedBy ?? "—" })}
                    </span>
                  )}
                  <span
                    className="w-full whitespace-nowrap text-overline text-steel-500 sm:w-auto"
                    dir="ltr"
                  >
                    {stamp(e.lastSeenAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">
        {t("actions")}
      </h2>
      <div className="mb-10 overflow-hidden rounded-2xl border border-steel-200 bg-white">
        {activity.length === 0 ? (
          <p className="px-5 py-6 text-caption text-steel-500">{t("noActions")}</p>
        ) : (
          <ul className="divide-y divide-steel-100">
            {activity.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${
                    actionStyle[a.action] ?? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                  }`}
                >
                  {ADMIN_ACTION_LABEL[a.action] ?? a.action}
                </span>
                {/* Audit summaries are stored in English (see
                    ADMIN_ACTION_LABEL) and routinely contain amounts, IDs and
                    punctuation. Inside an RTL page those reorder without an
                    explicit direction — "$220.50" and trailing full stops jump
                    to the wrong end. Same fix as the timestamps below. */}
                <span className="text-caption text-steel-800" dir="ltr">
                  {a.summary}
                </span>
                {a.targetType === "request" && a.targetId && (
                  <Link
                    href={`/admin/requests/${a.targetId}`}
                    className="text-overline font-semibold text-brand-700 hover:underline"
                  >
                    {t("openTarget")}
                  </Link>
                )}
                <span className="ms-auto whitespace-nowrap text-overline text-steel-500" dir="ltr">
                  {a.actorEmail} · {stamp(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">
        {t("logins")}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-steel-200 bg-white">
        {logins.length === 0 ? (
          <p className="px-5 py-6 text-caption text-steel-500">{t("noLogins")}</p>
        ) : (
          <ul className="divide-y divide-steel-100">
            {logins.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${
                    log.success
                      ? "bg-success-50 text-success-700 ring-1 ring-success-100"
                      : "bg-danger-50 text-danger-700 ring-1 ring-danger-100"
                  }`}
                >
                  {log.success ? "Success" : "Failed"}
                </span>
                <span className="text-caption text-steel-700" dir="ltr">
                  {log.email}
                </span>
                {log.note && (
                  <span className="text-caption text-steel-500">
                    {LOGIN_NOTE_LABEL[log.note] ?? log.note}
                  </span>
                )}
                <span className="ms-auto text-overline text-steel-500" dir="ltr">
                  {log.ip} · {stamp(log.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
