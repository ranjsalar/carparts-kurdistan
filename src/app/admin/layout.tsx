import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoMark } from "@/components/Logo";

// Belt-and-braces with the X-Robots-Tag header set in next.config.ts.
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const t = await getTranslations("admin");
  const tc = await getTranslations("common");

  return (
    <div className="min-h-screen bg-steel-50">
      <header className="bg-brand-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-7 gap-y-1">
            <Link href="/admin" className="inline-flex items-center gap-2.5 text-white">
              <span className="text-brand-300">
                <LogoMark size={26} />
              </span>
              <span className="leading-none">
                <span className="block font-heading text-body font-bold tracking-tight">
                  {tc("brand")}
                </span>
                <span className="block font-heading text-overline font-semibold uppercase text-accent-400">
                  {t("badge")}
                </span>
              </span>
            </Link>
            <nav className="flex flex-wrap gap-5 font-heading text-caption font-semibold text-brand-200">
              <Link href="/admin" className="transition-colors hover:text-white">
                {t("nav.dashboard")}
              </Link>
              <Link href="/admin/requests" className="transition-colors hover:text-white">
                {t("nav.requests")}
              </Link>
              <Link href="/admin/vehicles" className="transition-colors hover:text-white">
                {t("nav.vehicles")}
              </Link>
              <Link href="/admin/parts" className="transition-colors hover:text-white">
                {t("nav.parts")}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-caption text-brand-300 sm:inline">{user.name}</span>
            <form action={logout}>
              <button className="rounded-lg border border-white/20 px-3 py-1.5 font-heading text-caption font-semibold text-white transition-colors hover:bg-white/10">
                {tc("logout")}
              </button>
            </form>
            <LanguageSwitcher tone="light" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
