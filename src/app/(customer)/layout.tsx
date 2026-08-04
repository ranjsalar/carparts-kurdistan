import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { NotificationsNavLink } from "@/components/NotificationsNavLink";
import { UnreadCountProvider } from "@/components/UnreadCount";
import { btnGhost } from "@/components/ui";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const t = await getTranslations();
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  const navLink =
    "flex min-h-11 items-center rounded-lg px-2 transition-colors hover:bg-steel-100 hover:text-brand-700";

  return (
    <UnreadCountProvider initialCount={unreadCount}>
      <div className="min-h-screen bg-steel-50">
        <header className="border-b border-steel-200 bg-white">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-x-7 gap-y-1">
              <Logo />
              <nav className="-my-2 flex gap-1 font-heading text-caption font-semibold text-steel-600 sm:gap-3">
                <Link href="/request" className={navLink}>
                  {t("nav.newRequest")}
                </Link>
                <Link href="/requests" className={navLink}>
                  {t("nav.myRequests")}
                </Link>
                {/* Third primary destination, same weight as the other two —
                    a quote or status update should not depend on someone
                    noticing an icon. */}
                <NotificationsNavLink
                  label={t("nav.notifications")}
                  initialCount={unreadCount}
                  className={navLink}
                />
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell initialCount={unreadCount} label={t("nav.notifications")} />
              <span className="hidden text-caption text-steel-500 sm:inline">{user.name}</span>
              <form action={logout}>
                <button className={btnGhost}>{t("common.logout")}</button>
              </form>
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl px-5 py-10">{children}</main>
      </div>
    </UnreadCountProvider>
  );
}
