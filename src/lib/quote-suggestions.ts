import { prisma } from "./db";

/*
  Recently-used shipping and tax figures, offered as one-tap suggestions on the
  quote form.

  Deliberately suggestions and NOT pre-filled defaults. These numbers end up in
  a price a customer is asked to approve, and the two fields behave differently:

    shipping  varies with the part. A wing mirror and a bonnet do not cost the
              same to ship, and China and Dubai are different routes entirely.
              A stale default here is a quote that is quietly wrong.
    tax       is much more stable in practice, so it is the one that would be
              safe to default — but splitting the behaviour (one field
              pre-filled, its neighbour blank) is the kind of inconsistency
              that trains people to stop reading the form.

  A silently pre-filled money field is only ever noticed when it is wrong, and
  by then the quote has been sent. A chip the admin taps is nearly as fast and
  keeps the number a deliberate choice. If a value is genuinely constant, it
  will be the first chip every time and cost one tap.
*/

export type QuoteSuggestions = { shipping: string[]; tax: string[] };

const LOOKBACK = 40;
const MAX_CHIPS = 3;

/** Most frequently used recent values, most common first. */
function rank(values: (string | null)[]): string[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (v === null) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) continue; // zero is the default already
    const key = n.toFixed(2);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))
    .slice(0, MAX_CHIPS)
    .map(([value]) => value);
}

export async function getQuoteSuggestions(): Promise<QuoteSuggestions> {
  try {
    const recent = await prisma.partRequest.findMany({
      where: { priceUsd: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: LOOKBACK,
      select: { priceShippingUsd: true, priceTaxUsd: true },
    });

    return {
      shipping: rank(recent.map((r) => r.priceShippingUsd?.toString() ?? null)),
      tax: rank(recent.map((r) => r.priceTaxUsd?.toString() ?? null)),
    };
  } catch {
    // Suggestions are a convenience — never fail the quote screen over them.
    return { shipping: [], tax: [] };
  }
}
