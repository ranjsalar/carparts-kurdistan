import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { readPending2fa } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { card } from "@/components/ui";
import { TwofaForm } from "./TwofaForm";

export const metadata = { robots: { index: false, follow: false } };

export default async function TwofaPage() {
  const userId = await readPending2fa();
  if (!userId) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN") redirect("/login");
  // Not enrolled yet → the setup flow is the only way forward.
  if (!user.totpEnabled) redirect("/login/2fa/setup");

  const t = await getTranslations("auth.twofa");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-steel-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className={`${card} p-7`}>
          <h1 className="text-title font-bold text-steel-900">{t("title")}</h1>
          <p className="mt-2 mb-6 text-caption text-steel-500">{t("intro")}</p>
          <TwofaForm mode="verify" />
        </div>
        <p className="mt-5 text-center text-caption text-steel-500">
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
