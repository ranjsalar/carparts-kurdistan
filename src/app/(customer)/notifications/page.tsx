import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const hasUnread = notifications.some((n) => n.readAt === null);

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
          {notifications.map((n) => (
            <li
              key={n.id}
              className={
                n.readAt === null
                  ? "rounded-xl border-s-4 border-accent-500 bg-white p-4 ring-1 ring-steel-200"
                  : "rounded-xl bg-steel-100/70 p-4"
              }
            >
              <p className="font-heading text-body font-bold text-steel-900">
                {n.title}
                {n.readAt === null && (
                  <span className="ms-2 rounded-full bg-accent-500 px-2 py-0.5 font-heading text-overline font-semibold uppercase text-white">
                    {t("unread")}
                  </span>
                )}
              </p>
              <p className="mt-1 text-caption text-steel-600">{n.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-caption">
                <span className="text-steel-400">
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
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {t("viewRequest")}
                  </Link>
                )}
                {n.readAt === null && (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <button className="font-semibold text-steel-500 hover:text-steel-900 hover:underline">
                      {t("markRead")}
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
