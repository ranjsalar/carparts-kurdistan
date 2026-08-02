/*
  Vehicle years.

  The taxonomy stores one YearRange row per individual model year
  (startYear === endYear), so customers pick an exact year rather than guessing
  which generation bracket their car falls into. The start/end columns are kept
  rather than collapsing to a single `year` field: the schema and every foreign
  key stay unchanged, and any legacy multi-year row still renders sensibly.
*/

export type YearLike = { startYear: number; endYear: number };

/** "2019" for a single year, "2019–2025" for a legacy span. */
export function yearLabel(range: YearLike): string {
  return range.startYear === range.endYear
    ? String(range.startYear)
    : `${range.startYear}–${range.endYear}`;
}

/** Inclusive list of years in a span, guarded against absurd input. */
export function expandYears(startYear: number, endYear: number): number[] {
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);
  return years;
}

export const MIN_YEAR = 1950;
export const MAX_YEAR = 2100;
