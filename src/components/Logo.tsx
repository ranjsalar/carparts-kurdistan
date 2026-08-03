import Link from "next/link";
import Image from "next/image";

/*
  The KalaryParts lockup is a supplied asset, not drawn in code. It ships in
  four files — two variants × two ink colours:

    variant "wordmark"  mark + name, no tagline. Used in headers, where the
                        supplied tagline would render around 4px tall and read
                        as a smudge. Its viewBox is cropped to the artwork's
                        real bounds, so at a given header height the name sets
                        about a quarter larger than the full lockup would.
    variant "full"      the complete lockup including "ANY PART · ANY CAR",
                        used where there is room for it to be legible: the
                        footer, and the social share image.

  Ink: the supplied artwork is white, for dark surfaces. The "-onlight" files
  are the same geometry with the ink darkened, for the white customer, auth and
  marketing headers.

  The artwork is never mirrored in RTL — a logo is fixed artwork — but its
  position flips with the surrounding flex direction.
*/
const SOURCES = {
  wordmark: {
    dark: "/brand/kalaryparts-wordmark-onlight.svg", // dark ink, light surface
    light: "/brand/kalaryparts-wordmark.svg", // white ink, dark surface
    ratio: 286 / 81,
  },
  full: {
    dark: "/brand/kalaryparts-logo-onlight.svg",
    light: "/brand/kalaryparts-logo.svg",
    ratio: 420 / 100,
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
        alt="KalaryParts"
        width={Math.round(height * source.ratio)}
        height={height}
        priority={priority}
        style={{ height, width: "auto" }}
      />
    </Link>
  );
}
