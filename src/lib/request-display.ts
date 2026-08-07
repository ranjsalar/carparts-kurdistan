/*
  Turning a request's vehicle and part into text.

  Every level of a request can now be either a catalog row or something the
  customer typed because the catalog had no match, and the part name is
  translated while a typed string never is. Rather than spread that branching
  across every page that shows a request, it lives here — the pages ask for a
  label and get one.
*/

type Named = { name: string; nameKu?: string | null; nameAr?: string | null };

export type RequestVehicleParts = {
  brand?: Named | null;
  carModel?: { name: string } | null;
  yearRange?: { startYear: number; endYear: number } | null;
  trim?: { name: string } | null;
  part?: Named | null;
  rawBrandText?: string | null;
  rawModelText?: string | null;
  rawYearText?: string | null;
  rawTrimText?: string | null;
  rawPartText?: string | null;
};

/** Localised taxonomy name, falling back to English when a translation is missing. */
export function localizedName(row: Named | null | undefined, locale: string): string | null {
  if (!row) return null;
  return (locale === "ku" ? row.nameKu : locale === "ar" ? row.nameAr : null) || row.name;
}

function yearLabelOf(y: { startYear: number; endYear: number } | null | undefined): string | null {
  if (!y) return null;
  return y.startYear === y.endYear ? String(y.startYear) : `${y.startYear}–${y.endYear}`;
}

/**
 * "Toyota Land Cruiser (2022) · GXR", with any level the customer typed used
 * in place of the catalog value. Never returns an empty string — a request
 * with nothing recorded at all still needs something to render.
 *
 * Takes no locale: makes, models and trims are proper nouns that stay as they
 * are in every language, and a year is digits. Only the PART name is
 * translated — see partLabel.
 */
export function vehicleLabel(req: RequestVehicleParts): string {
  const brand = req.brand?.name ?? req.rawBrandText ?? null;
  const model = req.carModel?.name ?? req.rawModelText ?? null;
  const year = yearLabelOf(req.yearRange) ?? req.rawYearText ?? null;
  const trim = req.trim?.name ?? req.rawTrimText ?? null;

  const head = [brand, model].filter(Boolean).join(" ");
  const parts = [head || null, year ? `(${year})` : null].filter(Boolean).join(" ");
  return [parts || "—", trim].filter(Boolean).join(" · ");
}

/** The part, translated when it came from the catalog. */
export function partLabel(req: RequestVehicleParts, locale = "en"): string {
  return localizedName(req.part, locale) ?? req.rawPartText ?? "—";
}

/** Vehicle and part together, for list rows and notification bodies. */
export function requestLabel(req: RequestVehicleParts, locale = "en"): string {
  return `${partLabel(req, locale)} — ${vehicleLabel(req)}`;
}

/**
 * Which levels the customer typed rather than picked. Admin surfaces use this
 * to mark them visibly: a typed value is unverified, may be misspelled, and is
 * a candidate for adding to the taxonomy.
 */
export function customEntries(req: RequestVehicleParts): {
  field: "brand" | "model" | "year" | "trim" | "part";
  text: string;
}[] {
  const out: { field: "brand" | "model" | "year" | "trim" | "part"; text: string }[] = [];
  if (req.rawBrandText) out.push({ field: "brand", text: req.rawBrandText });
  if (req.rawModelText) out.push({ field: "model", text: req.rawModelText });
  if (req.rawYearText) out.push({ field: "year", text: req.rawYearText });
  if (req.rawTrimText) out.push({ field: "trim", text: req.rawTrimText });
  if (req.rawPartText) out.push({ field: "part", text: req.rawPartText });
  return out;
}

export function hasCustomEntry(req: RequestVehicleParts): boolean {
  return customEntries(req).length > 0;
}

/*
  Body-panel condition. The enum lives in the database; these are the
  translation keys under requestForm.condition.* used to render each grade's
  label and its `${key}Hint`.

  Order here is the order the customer sees, and it is deliberate: genuine
  parts that already carry factory paint first, then the genuine part that
  needs painting, then the non-genuine replica last. That runs roughly from
  most to least faithful to the original, which is also roughly most to least
  expensive.
*/
export const PART_CONDITION_KEY: Record<string, string> = {
  ORIGINAL_TAKE_OFF: "takeOff",
  ORIGINAL_USED: "used",
  NEW_UNPAINTED: "newUnpainted",
  COPY_REPLICA: "copyReplica",
};

export const PART_CONDITIONS = [
  "ORIGINAL_TAKE_OFF",
  "ORIGINAL_USED",
  "NEW_UNPAINTED",
  "COPY_REPLICA",
] as const;

export type PartConditionValue = (typeof PART_CONDITIONS)[number];

export function isPartCondition(value: unknown): value is PartConditionValue {
  return typeof value === "string" && (PART_CONDITIONS as readonly string[]).includes(value);
}
