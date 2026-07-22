import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { login } from "../actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary, card, inputBase, labelBase } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const t = await getTranslations();
  const errorKeys: Record<string, string> = {
    invalid: "invalid",
    credentials: "credentials",
    rate: "rate",
    locked: "locked",
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-steel-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className={`${card} p-7`}>
          <h1 className="text-title font-bold text-steel-900">{t("auth.login.title")}</h1>

          {error && (
            <p className="mt-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
              {t(`auth.errors.${errorKeys[error] ?? "generic"}`)}
            </p>
          )}

          <form action={login} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className={labelBase}>
                {t("auth.login.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                dir="ltr"
                className={inputBase}
              />
            </div>
            <div>
              <label htmlFor="password" className={labelBase}>
                {t("auth.login.password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                dir="ltr"
                className={inputBase}
              />
            </div>
            <SubmitButton className={`${btnPrimary} w-full`}>
              {t("auth.login.submit")}
            </SubmitButton>
          </form>

          <p className="mt-5 text-center text-caption">
            <Link href="/login/phone" className="font-semibold text-brand-700 hover:underline">
              {t("auth.login.phoneAlt")}
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-caption text-steel-500">
          {t("auth.login.noAccount")}{" "}
          <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
            {t("common.signup")}
          </Link>
        </p>
      </div>
    </main>
  );
}
