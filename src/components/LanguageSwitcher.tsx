"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "ku", label: "کوردی", short: "کوردی" },
  { code: "ar", label: "العربية", short: "عربي" },
];

function switchTo(code: string) {
  document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}`;
  window.location.reload();
}

export function LanguageSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];
  const trigger =
    tone === "light"
      ? "border-white/25 text-white hover:border-white/50"
      : "border-steel-300 text-steel-700 hover:border-brand-500 hover:text-brand-700";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-lg border bg-transparent px-2.5 py-1.5 font-heading text-caption font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${trigger}`}
      >
        {/* globe */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12 h18 M12 3 a13.5 13.5 0 0 1 0 18 a13.5 13.5 0 0 1 0-18" />
        </svg>
        {current.short}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9 l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="animate-rise absolute end-0 top-full z-50 mt-1.5 min-w-36 overflow-hidden rounded-xl border border-steel-200 bg-white py-1 shadow-lg shadow-steel-900/10"
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                role="option"
                aria-selected={lang.code === locale}
                onClick={() => switchTo(lang.code)}
                className={`flex w-full items-center justify-between gap-4 px-3.5 py-2 text-start text-caption transition-colors hover:bg-steel-100 ${
                  lang.code === locale
                    ? "font-semibold text-brand-700"
                    : "text-steel-700"
                }`}
              >
                {lang.label}
                {lang.code === locale && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                    <path d="M5 12.5 10 17.5 19 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
