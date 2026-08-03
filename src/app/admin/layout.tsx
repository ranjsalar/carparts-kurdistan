import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logout } from "@/app/(auth)/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { countOpenSecurityEvents } from "@/lib/threat-detection";

// Belt-and-braces with the X-Robots-Tag header set in next.config.ts.
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const [pendingPayments, securityAlerts] = await Promise.all([
    prisma.payment.count({ where: { status: "PENDING_CONFIRMATION" } }),
    countOpenSecurityEvents(),
  ]);

  return (
    <div className="min-h-screen bg-steel-50">
      <header className="bg-brand-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-7 gap-y-1">
            <div className="flex items-center gap-2.5">
              <Logo href="/admin" tone="light" size="sm" priority />
              <span className="font-heading text-overline font-semibold uppercase text-accent-400">
                {t("badge")}
              </span>
            </div>
            <nav className="-my-2 flex flex-wrap items-center gap-x-1 gap-y-0 font-heading text-caption font-semibold text-brand-200">
              <Link href="/admin" className="flex min-h-11 items-center rounded-lg px-2 transition-colors hover:bg-white/10 hover:text-white">
                {t("nav.dashboard")}
              </Link>
              <Link href="/admin/requests" className="flex min-h-11 items-center rounded-lg px-2 transition-colors hover:bg-white/10 hover:text-white">
                {t("nav.requests")}
              </Link>
              <Link
                href="/admin/payments"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t("payments.navTitle")}
                {pendingPayments > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 font-heading text-[10px] font-bold text-white">
                    {pendingPayments}
                  </span>
                )}
              </Link>
              <Link href="/admin/customers" className="flex min-h-11 items-center rounded-lg px-2 transition-colors hover:bg-white/10 hover:text-white">
                {t("customers.navTitle")}
              </Link>
              <Link href="/admin/vehicles" className="flex min-h-11 items-center rounded-lg px-2 transition-colors hover:bg-white/10 hover:text-white">
                {t("nav.vehicles")}
              </Link>
              <Link href="/admin/parts" className="flex min-h-11 items-center rounded-lg px-2 transition-colors hover:bg-white/10 hover:text-white">
                {t("nav.parts")}
              </Link>
              <Link href="/admin/taxonomy" className="flex min-h-11 items-center rounded-lg px-2 transition-colors hover:bg-white/10 hover:text-white">
                {t("taxonomyIo.navTitle")}
              </Link>
              <Link href="/admin/activity" className="flex min-h-11 items-center rounded-lg px-2 transition-colors hover:bg-white/10 hover:text-white">
                {t("activity.navTitle")}
              </Link>
              <Link href="/admin/settings" className="flex min-h-11 items-center rounded-lg px-2 transition-colors hover:bg-white/10 hover:text-white">
                {t("settings.navTitle")}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-caption text-brand-300 sm:inline">{user.name}</span>
            <form action={logout}>
              <button className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-3 font-heading text-caption font-semibold text-white transition-colors hover:bg-white/10">
                {tc("logout")}
              </button>
            </form>
            <LanguageSwitcher tone="light" />
          </div>
        </div>
      </header>
      {/* Above the payments bar and in red, not amber: this is the one thing
          on the screen that means something may be actively going wrong. */}
      {securityAlerts > 0 && (
        <Link
          href="/admin/activity#security"
          className="block bg-danger-600 transition-colors hover:bg-danger-700"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-5 py-2 text-center font-heading text-caption font-semibold text-white">
            {t("security.alert", { count: securityAlerts })}
            <span aria-hidden>→</span>
          </div>
        </Link>
      )}
      {pendingPayments > 0 && (
        <Link href="/admin/payments" className="block bg-accent-600 transition-colors hover:bg-accent-700">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-5 py-2 text-center font-heading text-caption font-semibold text-white">
            {t("payments.alert", { count: pendingPayments })}
            <span aria-hidden>→</span>
          </div>
        </Link>
      )}
      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
