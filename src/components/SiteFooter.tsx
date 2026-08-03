import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./Logo";

/*
  Mega footer. Social profiles (WhatsApp, Instagram, Facebook) don't exist
  yet and point to "#" as scaffolding — swap in real URLs once those
  accounts exist. Every other link routes to a real page.
*/
export async function SiteFooter() {
  const t = await getTranslations("footer");
  const th = await getTranslations("home");

  const columns: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: t("company"),
      links: [
        { label: t("about"), href: "/about" },
        { label: t("contact"), href: "/contact" },
      ],
    },
    {
      title: t("support"),
      links: [
        { label: t("howItWorks"), href: "/#how" },
        { label: t("faq"), href: "/faq" },
        // /requests redirects to /login when signed out, so this always
        // lands the customer on the right place either way.
        { label: t("track"), href: "/requests" },
      ],
    },
    {
      title: t("legal"),
      links: [
        { label: t("terms"), href: "/terms" },
        { label: t("privacy"), href: "/privacy" },
      ],
    },
    {
      title: t("connect"),
      links: [
        { label: t("whatsapp"), href: "#" },
        { label: t("instagram"), href: "#" },
        { label: t("facebook"), href: "#" },
      ],
    },
  ];

  return (
    <footer className="bg-steel-950 text-steel-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2">
          <Logo tone="light" variant="full" size="lg" />
          <p className="mt-4 max-w-xs text-caption leading-relaxed text-steel-400">
            {th("tagline")}
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="font-heading text-overline font-semibold uppercase text-steel-500">
              {col.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-caption text-steel-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-steel-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5">
          <p className="text-caption text-steel-500">
            {t("rights", { year: new Date().getFullYear() })}
          </p>
          <p className="text-caption text-steel-500">{th("footer")}</p>
        </div>
      </div>
    </footer>
  );
}
