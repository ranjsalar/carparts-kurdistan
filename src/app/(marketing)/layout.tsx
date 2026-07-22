import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-steel-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Logo />
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">{children}</main>
      <SiteFooter />
    </div>
  );
}
