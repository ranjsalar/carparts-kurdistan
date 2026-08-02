"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_ACTION, logAdminActivity } from "@/lib/admin-activity";
import { importTaxonomy, parseCsv, type TaxonomyType } from "@/lib/taxonomy-io";

const MAX_BYTES = 2 * 1024 * 1024; // a taxonomy sheet is tiny; anything larger is a mistake

export async function importTaxonomyAction(formData: FormData) {
  const admin = await requireAdmin();
  const type: TaxonomyType = formData.get("type") === "parts" ? "parts" : "vehicles";
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/taxonomy?error=importNoFile`);
  }
  if (file.size > MAX_BYTES) {
    redirect(`/admin/taxonomy?error=importTooLarge`);
  }

  const text = await file.text();
  let rows: Record<string, string>[];
  try {
    if (file.name.toLowerCase().endsWith(".json") || text.trimStart().startsWith("[")) {
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      rows = parsed.map((r) =>
        Object.fromEntries(
          Object.entries(r as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")]),
        ),
      );
    } else {
      rows = parseCsv(text);
    }
  } catch {
    redirect(`/admin/taxonomy?error=importUnreadable`);
  }

  const result = await importTaxonomy(type, rows);
  if (!result.ok) {
    redirect(`/admin/taxonomy?error=${result.error ?? "generic"}`);
  }

  await logAdminActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ADMIN_ACTION.taxonomyImported,
    summary: `Imported ${type}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
    targetType: "taxonomy",
  });

  revalidatePath("/admin/taxonomy");
  revalidatePath("/admin/vehicles");
  revalidatePath("/admin/parts");
  redirect(
    `/admin/taxonomy?success=taxonomyImported&created=${result.created}&updated=${result.updated}&skipped=${result.skipped}`,
  );
}
