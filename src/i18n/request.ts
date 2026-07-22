import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["en", "ku", "ar"] as const;
export type Locale = (typeof locales)[number];

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isRtl(locale: string) {
  return locale === "ku" || locale === "ar";
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale = (locales as readonly string[]).includes(cookieLocale ?? "")
    ? (cookieLocale as Locale)
    : "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
