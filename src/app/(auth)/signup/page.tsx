import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signup } from "../actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary, card, inputBase, labelBase } from "@/components/ui";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const t = await getTranslations();
  const errorKeys: Record<string, string> = {
    invalid: "signupInvalid",
    exists: "exists",
    phoneExists: "phoneExists",
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-steel-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className={`${card} p-7`}>
          <h1 className="text-title font-bold text-steel-900">{t("auth.signup.title")}</h1>

          {error && (
            <p className="mt-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
              {t(`auth.errors.${errorKeys[error] ?? "generic"}`)}
            </p>
          )}

          <form action={signup} className="mt-6 space-y-5">
            <div>
              <label htmlFor="name" className={labelBase}>
                {t("auth.signup.name")}
              </label>
              <input id="name" name="name" required autoComplete="name" className={inputBase} />
            </div>
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
              <label htmlFor="phone" className={labelBase}>
                {t("auth.signup.phone")}{" "}
                <span className="font-normal text-steel-400">({t("common.optional")})</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+9647501234567"
                autoComplete="tel"
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
                minLength={8}
                autoComplete="new-password"
                dir="ltr"
                className={inputBase}
              />
            </div>
            <SubmitButton className={`${btnPrimary} w-full`}>
              {t("auth.signup.submit")}
            </SubmitButton>
          </form>
        </div>

        <p className="mt-5 text-center text-caption text-steel-500">
          {t("auth.signup.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            {t("common.login")}
          </Link>
        </p>
      </div>
    </main>
  );
}
