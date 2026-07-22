import { getTranslations } from "next-intl/server";
import { BackHome } from "../BackHome";

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div>
      <BackHome />
      <h1 className="mt-3 text-title font-bold text-steel-900">{t("title")}</h1>
      <div className="mt-6 space-y-4 text-body leading-relaxed text-steel-700">
        <p>{t("p1")}</p>
        <p>{t("p2")}</p>
        <p>{t("p3")}</p>
      </div>
    </div>
  );
}
