import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function BackHome() {
  const t = await getTranslations("marketing");
  return (
    <Link
      href="/"
      className="font-heading text-caption font-semibold text-brand-700 hover:underline"
    >
      ← {t("backHome")}
    </Link>
  );
}
