import type { Prisma } from "@/generated/prisma/client";

/*
  Display formatting helpers.

  Money is stored as a Prisma Decimal, and Decimal.toString() drops trailing
  zeros ("184.50" → "184.5", "220.00" → "220"). For transactional amounts —
  quote line items, totals, revenue — that reads as inconsistent and makes
  itemized breakdowns fail to line up. Always render two decimal places.

  Scope: transactional amounts only. Indicative price *ranges* on the request
  form and parts catalogue stay whole-dollar on purpose — they're explicitly
  approximate and read cleaner without cents.
*/
export function formatUsd(
  value: Prisma.Decimal | number | string | null | undefined,
): string {
  if (value === null || value === undefined) return "0.00";
  return (typeof value === "number" ? value : Number(value)).toFixed(2);
}
