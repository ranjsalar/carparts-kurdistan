import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { IconBell } from "@/components/icons";
import { btnGhost } from "@/components/ui";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const t = await getTranslations();
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <div className="min-h-screen bg-steel-50">
      <header className="border-b border-steel-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-x-7 gap-y-1">
            <Logo />
            <nav className="flex gap-5 font-heading text-caption font-semibold text-steel-600">
              <Link href="/request" className="transition-colors hover:text-brand-700">
                {t("nav.newRequest")}
              </Link>
              <Link href="/requests" className="transition-colors hover:text-brand-700">
                {t("nav.myRequests")}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              aria-label={t("nav.notifications")}
              className="relative rounded-lg p-2 text-steel-500 transition-colors hover:bg-steel-100 hover:text-steel-900"
            >
              <IconBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 font-heading text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
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
  );
}
