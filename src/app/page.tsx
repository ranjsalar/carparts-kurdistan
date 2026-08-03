import Link from "next/link";
import type { ComponentType } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { yearLabel } from "@/lib/years";
import { getSessionUser } from "@/lib/auth";
import { BrandGrid } from "@/components/BrandGrid";
import { HowItWorks } from "@/components/HowItWorks";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import {
  IconBumper,
  IconDoor,
  IconDrop,
  IconEngine,
  IconFilter,
  IconFinish,
  IconGauge,
  IconLamp,
  IconMirror,
  IconNut,
  IconPay,
  IconSeat,
  IconSnowflake,
  IconSpark,
  IconTruck,
} from "@/components/icons";
import { btnPrimary, btnSecondary, overline } from "@/components/ui";
import { HeroSelector, type SelectorBrand } from "./HeroSelector";

type IconType = ComponentType<{ size?: number; className?: string }>;

// Keyed by canonical (English) taxonomy names from the DB.
const categoryIcons: Record<string, IconType> = {
  Interior: IconSeat,
  Exterior: IconBumper,
  Engine: IconEngine,
};

const subCategoryIcons: Record<string, IconType> = {
  Bumpers: IconBumper,
  Hood: IconNut,
  Doors: IconDoor,
  Mirrors: IconMirror,
  Lights: IconLamp,
  Fenders: IconNut,
  Seats: IconSeat,
  Dashboard: IconGauge,
  Panels: IconNut,
  "AC Parts": IconSnowflake,
  Belts: IconNut,
  Filters: IconFilter,
  Pumps: IconDrop,
  Gaskets: IconNut,
  Cooling: IconSnowflake,
  Ignition: IconSpark,
};

export default async function Home() {
  const [user, t, locale, brands, categories] = await Promise.all([
    getSessionUser(),
    getTranslations(),
    getLocale(),
    prisma.brand.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        models: {
          orderBy: { name: "asc" },
          include: { yearRanges: { orderBy: { startYear: "asc" } } },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { subCategories: { orderBy: { name: "asc" } } },
    }),
  ]);

  const localized = (row: { name: string; nameKu?: string | null; nameAr?: string | null }) =>
    (locale === "ku" ? row.nameKu : locale === "ar" ? row.nameAr : null) ?? row.name;

  const selectorBrands: SelectorBrand[] = brands.map((b) => ({
    id: b.id,
    name: b.name,
    models: b.models.map((m) => ({
      id: m.id,
      name: m.name,
      yearRanges: m.yearRanges.map((y) => ({ id: y.id, label: yearLabel(y) })),
    })),
  }));

  const trust = [
    { icon: IconNut, title: t("home.trust1"), sub: t("home.trust1Sub") },
    { icon: IconTruck, title: t("home.trust2"), sub: t("home.trust2Sub") },
    { icon: IconPay, title: t("home.trust3"), sub: t("home.trust3Sub") },
    { icon: IconFinish, title: t("home.trust4"), sub: t("home.trust4Sub") },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-steel-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3.5">
          <Logo />
          <div className="flex items-center gap-2.5">
            {user ? (
              user.role === "ADMIN" ? (
                <Link href="/admin" className={btnPrimary}>
                  {t("home.adminPanel")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/requests"
                    className="hidden font-heading text-caption font-semibold text-steel-600 transition-colors hover:text-brand-700 sm:inline"
                  >
                    {t("home.myRequests")}
                  </Link>
                  <Link href="/request" className={btnPrimary}>
                    {t("home.requestPart")}
                  </Link>
                </>
              )
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center rounded-lg px-2 font-heading text-caption font-semibold text-steel-600 transition-colors hover:bg-steel-100 hover:text-brand-700"
                >
                  {t("common.login")}
                </Link>
                <Link href="/signup" className={btnPrimary}>
                  {t("home.getStarted")}
                </Link>
              </>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Hero — dark petrol with vehicle selector as the primary action */}
      <section className="relative overflow-hidden bg-brand-900">
        <svg
          className="pointer-events-none absolute -bottom-24 -start-20 h-96 w-96 text-brand-800"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden
        >
          <path
            d="M16 2.5 L27.7 9.25 V22.75 L16 29.5 L4.3 22.75 V9.25 Z"
            stroke="currentColor"
            strokeWidth="0.6"
          />
          <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="0.5" />
        </svg>
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className={`${overline} text-brand-300`}>
              {t("common.brand")} {t("common.brandSuffix")}
            </p>
            <h1 className="mt-3 text-display font-bold text-white">{t("home.heroTitle")}</h1>
            <p className="mt-4 max-w-lg text-body text-brand-100">{t("home.tagline")}</p>
            <ul className="mt-7 space-y-2.5">
              {[t("home.trust3"), t("home.trust2"), t("home.trust4")].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-caption text-brand-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-400)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12.5 10 17.5 19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <HeroSelector brands={selectorBrands} />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-steel-200 bg-steel-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((item) => (
            <div key={item.title} className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-steel-200">
                <item.icon size={22} />
              </span>
              <div>
                <p className="font-heading text-caption font-bold text-steel-900">{item.title}</p>
                <p className="mt-0.5 text-caption text-steel-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-title font-bold text-steel-900">{t("home.categoriesTitle")}</h2>
        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {categories.map((cat) => {
            const CatIcon = categoryIcons[cat.name] ?? IconNut;
            return (
              <div
                key={cat.id}
                className="rounded-2xl border border-steel-200 bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-steel-900/5"
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
                    <CatIcon size={26} />
                  </span>
                  <h3 className="font-heading text-heading font-bold text-steel-900">
                    {localized(cat)}
                  </h3>
                </div>
                <ul className="mt-5 grid grid-cols-2 gap-1.5">
                  {cat.subCategories.map((sub) => {
                    const SubIcon = subCategoryIcons[sub.name] ?? IconNut;
                    return (
                      <li key={sub.id}>
                        <Link
                          href={`/request?categoryId=${cat.id}&subCategoryId=${sub.id}`}
                          className="group flex min-h-11 items-center gap-2 rounded-lg px-2 text-caption text-steel-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                        >
                          <SubIcon size={16} className="text-steel-400 transition-colors group-hover:text-brand-600" />
                          {localized(sub)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Brands */}
      <section className="border-y border-steel-200 bg-steel-50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-title font-bold text-steel-900">{t("home.brandsTitle")}</h2>
          <p className="mt-1.5 text-caption text-steel-500">{t("home.brandsHint")}</p>
          <BrandGrid brands={selectorBrands} />
        </div>
      </section>

      {/* How it works — real product previews + sourcing route */}
      <HowItWorks />
      {!user && (
        <div className="mx-auto max-w-6xl px-5 pb-14">
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className={btnPrimary}>
              {t("home.getStarted")}
            </Link>
            <Link href="/login" className={btnSecondary}>
              {t("common.login")}
            </Link>
          </div>
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
