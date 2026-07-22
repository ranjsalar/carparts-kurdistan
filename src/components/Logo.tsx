import Link from "next/link";

/*
  Logo mark: a hex-nut (the most universal car-part silhouette) holding a
  wheel hub, with a single signal-amber torque notch. Drawn inline so it
  inherits currentColor and needs no assets.
*/
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {/* hex nut */}
      <path
        d="M16 2.5 L27.7 9.25 V22.75 L16 29.5 L4.3 22.75 V9.25 Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* hub */}
      <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="2.2" />
      {/* torque notch */}
      <path
        d="M21.8 9.2 A9 9 0 0 1 25 15.4"
        stroke="var(--color-accent-500)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  href = "/",
  size = "md",
  tone = "dark",
}: {
  href?: string;
  size?: "md" | "lg";
  tone?: "dark" | "light";
}) {
  const markSize = size === "lg" ? 40 : 28;
  const text = tone === "light" ? "text-white" : "text-steel-900";
  const sub = tone === "light" ? "text-brand-300" : "text-brand-600";
  const mark = tone === "light" ? "text-brand-300" : "text-brand-600";

  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${text}`}>
      <span className={mark}>
        <LogoMark size={markSize} />
      </span>
      <span className="leading-none">
        <span
          className={`block font-heading font-bold ${size === "lg" ? "text-2xl" : "text-lg"} tracking-tight`}
        >
          CarParts
        </span>
        <span
          className={`block font-heading text-overline font-semibold uppercase ${sub}`}
        >
          Kurdistan
        </span>
      </span>
    </Link>
  );
}
