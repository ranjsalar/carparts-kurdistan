import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { btnPrimary } from "@/components/ui";
import { BackHome } from "../BackHome";

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <div>
      <BackHome />
      <h1 className="mt-3 text-title font-bold text-steel-900">{t("title")}</h1>
      <p className="mt-6 text-body leading-relaxed text-steel-700">{t("body")}</p>
      <Link href="/request" className={`${btnPrimary} mt-6 inline-flex`}>
        {t("cta")}
      </Link>
    </div>
  );
}
