import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { IconBell } from "@/components/icons";
import { SubmitButton } from "@/components/SubmitButton";
import { btnSecondary } from "@/components/ui";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const t = await getTranslations("notifications");
  const tt = await getTranslations("notifications.templates");
  const locale = await getLocale();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { request: { include: { part: true, brand: true, carModel: true } } },
  });
  const hasUnread = notifications.some((n) => n.readAt === null);

  type NotificationRow = (typeof notifications)[number];

  // Notifications store an English title/body snapshot plus a templateKey +
  // params, so the list re-renders in whatever language the reader is viewing
  // now — not the language the notification was created in. The part noun is
  // re-localized from the live request; old rows without a templateKey fall
  // back to the stored English text.
  function render(n: NotificationRow): { title: string; body: string } {
    const key = n.templateKey;
    if (!key || !tt.has(`${key}.title`)) return { title: n.title, body: n.body };

    const p = (n.params ?? {}) as Record<string, unknown>;
    const localizedPart =
      (n.request &&
        (locale === "ku"
          ? n.request.part.nameKu
          : locale === "ar"
            ? n.request.part.nameAr
            : null)) ||
      n.request?.part.name ||
      String(p.part ?? "");
    // Every stored param must be available to the ICU message (amount,
    // remaining, reason, total, …). Spread them all as strings, then override
    // part/brand/model with the live-localized values.
    const values: Record<string, string> = {};
    for (const [k, v] of Object.entries(p)) values[k] = String(v ?? "");
    values.part = localizedPart;
    values.brand = n.request?.brand.name ?? String(p.brand ?? "");
    values.model = n.request?.carModel.name ?? String(p.model ?? "");
    let body = tt(`${key}.body`, values);
    if (p.note) body += " " + tt("noteSuffix", { note: String(p.note) });
    return { title: tt(`${key}.title`), body };
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title font-bold text-steel-900">{t("title")}</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <SubmitButton className={btnSecondary}>{t("markAllRead")}</SubmitButton>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-steel-300 bg-white px-4 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-steel-100 text-steel-400">
            <IconBell size={26} />
          </span>
          <p className="mt-4 font-heading text-body font-bold text-steel-700">{t("empty")}</p>
          <p className="mx-auto mt-1 max-w-sm text-caption text-steel-500">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => {
            const { title, body } = render(n);
            return (
            <li
              key={n.id}
              className={
                n.readAt === null
                  ? "rounded-xl border-s-4 border-accent-500 bg-white p-4 ring-1 ring-steel-200"
                  : "rounded-xl bg-steel-100/70 p-4"
              }
            >
              <p className="font-heading text-body font-bold text-steel-900">
                {title}
                {n.readAt === null && (
                  <span className="ms-2 rounded-full bg-accent-600 px-2 py-0.5 font-heading text-overline font-semibold uppercase text-white">
                    {t("unread")}
                  </span>
                )}
              </p>
              <p className="mt-1 text-caption text-steel-600">{body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-caption">
                <span className="text-steel-400" dir="ltr">
                  {n.createdAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {n.requestId && (
                  <Link
                    href={`/requests/${n.requestId}`}
                    className="-my-2 inline-flex min-h-11 items-center font-semibold text-brand-700 hover:underline"
                  >
                    {t("viewRequest")}
                  </Link>
                )}
                {n.readAt === null && (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <button className="-my-2 inline-flex min-h-11 items-center font-semibold text-steel-500 hover:text-steel-900 hover:underline">
                      {t("markRead")}
                    </button>
                  </form>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
