import { getTranslations } from "next-intl/server";
import { BackHome } from "../BackHome";

type Section = { h: string; b: string };

export default async function TermsPage() {
  const t = await getTranslations("terms");
  const sections = t.raw("sections") as Section[];

  return (
    <div>
      <BackHome />
      <h1 className="mt-3 text-title font-bold text-steel-900">{t("title")}</h1>
      <p className="mt-1.5 text-caption text-steel-400">
        {t("updated", { year: new Date().getFullYear() })}
      </p>
      <div className="mt-6 space-y-5">
        {sections.map((s) => (
          <div key={s.h}>
            <h2 className="font-heading text-body font-bold text-steel-900">{s.h}</h2>
            <p className="mt-1.5 text-caption leading-relaxed text-steel-600">{s.b}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
