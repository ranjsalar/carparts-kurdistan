import { getTranslations } from "next-intl/server";
import { card } from "@/components/ui";
import { BackHome } from "../BackHome";

type FaqItem = { q: string; a: string };

export default async function FaqPage() {
  const t = await getTranslations("faq");
  const items = t.raw("items") as FaqItem[];

  return (
    <div>
      <BackHome />
      <h1 className="mt-3 text-title font-bold text-steel-900">{t("title")}</h1>
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.q} className={`${card} p-5`}>
            <h2 className="font-heading text-body font-bold text-steel-900">{item.q}</h2>
            <p className="mt-1.5 text-caption leading-relaxed text-steel-600">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
