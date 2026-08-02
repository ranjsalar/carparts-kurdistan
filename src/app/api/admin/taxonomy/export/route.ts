import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { exportTaxonomy, HEADERS, toCsv, type TaxonomyType } from "@/lib/taxonomy-io";

/** Admin-only taxonomy download. /admin is gated by the proxy, but this route
 *  sits under /api so it checks the session itself. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const type: TaxonomyType = params.get("type") === "parts" ? "parts" : "vehicles";
  const format = params.get("format") === "json" ? "json" : "csv";
  const rows = await exportTaxonomy(type);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `carparts-${type}-${stamp}.${format}`;

  const body = format === "json" ? JSON.stringify(rows, null, 2) : toCsv(HEADERS[type], rows);
  return new NextResponse(body, {
    headers: {
      "Content-Type":
        format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
