import type { Metadata } from "next";
import { Cairo, Inter, Vazirmatn } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { isRtl } from "@/i18n/request";
import "./globals.css";

/*
  One typeface per language, carrying both headings and body — hierarchy comes
  from weight, not from a second family. Each font publishes the SAME variable
  (--font-app) and only the active locale's class goes on <html>.

  preload is off on purpose. All three families are declared in one module, so
  next/font would emit a preload link for every one of them on every request —
  measured at five woff2 files fetched per page regardless of locale. Without
  the preload hint the browser fetches a font only when it is actually needed
  to paint text, which means just the active family. The trade is a brief
  fallback flash on first paint, handled by display: "swap".

  Kurdish (Sorani) and Arabic get purpose-built script faces rather than the
  Arabic companion of a Latin family, which is why the legibility compensation
  in globals.css could be eased back — see the note there.
*/
const interFont = Inter({
  variable: "--font-app",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const vazirmatnFont = Vazirmatn({
  variable: "--font-app",
  // Latin is included so Latin brand names, part codes and digits inside
  // Kurdish text render in the same family instead of falling back.
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const cairoFont = Cairo({
  variable: "--font-app",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const fontForLocale: Record<string, { variable: string }> = {
  en: interFont,
  ku: vazirmatnFont,
  ar: cairoFont,
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  const title = t("title");
  const description = t("description");
  // Social platforms handle PNG link previews far more reliably than SVG, so
  // the share image is a raster export rather than the vector lockup. It is
  // 1200×630 — the 1.91:1 card Facebook, LinkedIn and X all crop to — so the
  // preview fills the card instead of letterboxing, and 1200 wide covers
  // retina timelines. Regenerate it from the full lockup on brand-900 if the
  // artwork changes; the supplied 840×200 header PNG is the wrong shape.
  const image = {
    url: "/brand/kalarycarpart-og.png",
    width: 1200,
    height: 630,
    alt: "KalaryCarPart — any part, any car",
  };

  return {
    // og:image must be an absolute URL — crawlers have no page context to
    // resolve a relative one against. Without a metadataBase Next falls back
    // to localhost, which every crawler fails to fetch, so previews come back
    // blank. Set NEXT_PUBLIC_SITE_URL to the public origin at deploy time.
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title,
    description,
    openGraph: { title, description, siteName: "KalaryCarPart", images: [image], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${(fontForLocale[locale] ?? interFont).variable} h-full antialiased`}
      // Browser extensions (e.g. the data-qb-installed attribute seen in the
      // hydration warning) inject attributes onto <html> before React
      // hydrates. This suppresses the mismatch warning for this element only —
      // it does not mask genuine hydration issues elsewhere in the tree.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
