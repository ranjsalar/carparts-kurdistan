import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { readPending2fa } from "@/lib/auth";
import { generateTotpSecret, totpUri } from "@/lib/totp";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { card } from "@/components/ui";
import { TwofaForm } from "../TwofaForm";

export const metadata = { robots: { index: false, follow: false } };

export default async function TwofaSetupPage() {
  const userId = await readPending2fa();
  if (!userId) redirect("/login");
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN") redirect("/login");
  if (user.totpEnabled) redirect("/login/2fa");

  // Issue the secret on first visit. Storing it pre-verification is safe:
  // it's inert until the password-authenticated owner confirms a code, and
  // this page is only reachable with a valid pending-2FA token.
  if (!user.totpSecret) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: generateTotpSecret() },
    });
  }

  const t = await getTranslations("auth.twofa");
  const uri = totpUri(user.totpSecret!, user.email ?? "admin");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-steel-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className={`${card} p-7`}>
          <h1 className="text-title font-bold text-steel-900">{t("setupTitle")}</h1>
          <p className="mt-2 text-caption text-steel-600">{t("setupIntro")}</p>

          <div className="mt-5 rounded-xl bg-steel-100/70 p-4">
            <p className="font-heading text-overline font-semibold uppercase text-steel-500">
              {t("secretLabel")}
            </p>
            <p
              className="mt-1.5 break-all font-mono text-body font-semibold tracking-wider text-steel-900 select-all"
              dir="ltr"
            >
              {user.totpSecret}
            </p>
            <p className="mt-3 font-heading text-overline font-semibold uppercase text-steel-500">
              {t("uriLabel")}
            </p>
            <p className="mt-1.5 break-all font-mono text-overline text-steel-600 select-all" dir="ltr">
              {uri}
            </p>
          </div>

          <p className="mt-4 mb-5 text-caption text-steel-500">{t("setupHelp")}</p>
          <TwofaForm mode="setup" />
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
