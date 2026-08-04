import Link from "next/link";
import Image from "next/image";

/*
  The KalaryCarPart lockup, as static assets rather than markup drawn here.

  The K mark, its orange dot, the colours and the construction are the supplied
  artwork unchanged; only the wordmark text was re-set when the product was
  renamed from KalaryParts. Both variants share one viewBox cropped to the
  artwork's measured bounds (getBBox, not estimated), so the name sets at the
  same size in either:

    variant "wordmark"  mark + name, no tagline. Used in every header — at
                        header sizes the tagline renders about 4px tall and
                        reads as a smudge.
    variant "full"      adds "ANY PART · ANY CAR", for the places with room to
                        make it legible: the footer and the social share image.

  Ink: the base artwork is white, for dark surfaces. The "-onlight" files are
  the same geometry with the ink darkened, for the white customer, auth and
  marketing headers.

  The artwork is never mirrored in RTL — a logo is fixed artwork — but its
  position flips with the surrounding flex direction.
*/
const SOURCES = {
  wordmark: {
    dark: "/brand/kalarycarpart-wordmark-onlight.svg", // dark ink, light surface
    light: "/brand/kalarycarpart-wordmark.svg", // white ink, dark surface
    ratio: 324 / 81,
  },
  full: {
    dark: "/brand/kalarycarpart-logo-onlight.svg",
    light: "/brand/kalarycarpart-logo.svg",
    // Same box as the wordmark: the tagline sits inside the name's bounds, so
    // both crop identically and the name sets at one consistent size.
    ratio: 324 / 81,
  },
} as const;

const HEIGHTS = { sm: 30, md: 36, lg: 46 } as const;

export function Logo({
  href = "/",
  size = "md",
  tone = "dark",
  variant = "wordmark",
  priority = false,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  /** "dark" = dark ink for light backgrounds; "light" = white ink for dark ones. */
  tone?: "dark" | "light";
  /** "wordmark" drops the tagline; "full" keeps it. */
  variant?: "wordmark" | "full";
  priority?: boolean;
}) {
  const source = SOURCES[variant];
  const height = HEIGHTS[size];

  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      <Image
        src={source[tone]}
        alt="KalaryCarPart"
        width={Math.round(height * source.ratio)}
        height={height}
        priority={priority}
        style={{ height, width: "auto" }}
      />
    </Link>
  );
}
