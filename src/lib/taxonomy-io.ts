import { prisma } from "./db";
import { expandYears, MAX_YEAR, MIN_YEAR } from "./years";

/*
  Bulk taxonomy import / export.

  Two flat sheets rather than one, because vehicles and parts are separate
  trees and mixing them in a single file makes both harder to edit:

    vehicles  brand, model, yearFrom, yearTo
    parts     category, categoryKu, categoryAr, subCategory, subCategoryKu,
              subCategoryAr, part, partKu, partAr, requiresColorCode,
              priceMinUsd, priceMaxUsd

  Import is upsert-only — it never deletes. A row that already exists is
  updated in place, so re-importing an edited export is safe and repeatable.
*/

export type TaxonomyType = "vehicles" | "parts";

export const HEADERS: Record<TaxonomyType, string[]> = {
  vehicles: ["brand", "model", "yearFrom", "yearTo"],
  parts: [
    "category",
    "categoryKu",
    "categoryAr",
    "subCategory",
    "subCategoryKu",
    "subCategoryAr",
    "part",
    "partKu",
    "partAr",
    "requiresColorCode",
    "priceMinUsd",
    "priceMaxUsd",
  ],
};

// ── CSV helpers ──────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvCell(row[h])).join(","));
  return lines.join("\r\n");
}

/** Minimal RFC-4180 parser: handles quoted fields, escaped quotes and CRLF. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const clean = text.replace(/^﻿/, ""); // strip BOM from spreadsheet exports
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return body.map((cells) => {
    const obj: Record<string, string> = {};
    keys.forEach((k, i) => (obj[k] = (cells[i] ?? "").trim()));
    return obj;
  });
}

// ── Export ───────────────────────────────────────────────────────────────────

export async function exportTaxonomy(type: TaxonomyType): Promise<Record<string, unknown>[]> {
  if (type === "vehicles") {
    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: {
        models: {
          orderBy: { name: "asc" },
          include: { yearRanges: { orderBy: { startYear: "asc" } } },
        },
      },
    });
    return brands.flatMap((b) =>
      b.models.flatMap((m) =>
        m.yearRanges.map((y) => ({
          brand: b.name,
          model: m.name,
          yearFrom: y.startYear,
          yearTo: y.endYear,
        })),
      ),
    );
  }

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      subCategories: {
        orderBy: { name: "asc" },
        include: { parts: { orderBy: { name: "asc" } } },
      },
    },
  });
  return categories.flatMap((c) =>
    c.subCategories.flatMap((s) =>
      s.parts.map((p) => ({
        category: c.name,
        categoryKu: c.nameKu ?? "",
        categoryAr: c.nameAr ?? "",
        subCategory: s.name,
        subCategoryKu: s.nameKu ?? "",
        subCategoryAr: s.nameAr ?? "",
        part: p.name,
        partKu: p.nameKu ?? "",
        partAr: p.nameAr ?? "",
        requiresColorCode: p.requiresColorCode ? "yes" : "no",
        priceMinUsd: p.priceMinUsd?.toString() ?? "",
        priceMaxUsd: p.priceMaxUsd?.toString() ?? "",
      })),
    ),
  );
}

// ── Import ───────────────────────────────────────────────────────────────────

export type ImportResult = {
  ok: boolean;
  error?: string;
  created: number;
  updated: number;
  skipped: number;
  problems: string[];
};

const truthy = new Set(["yes", "true", "1", "y"]);
const money = /^\d{1,8}(\.\d{1,2})?$/;

export async function importTaxonomy(
  type: TaxonomyType,
  rows: Record<string, string>[],
): Promise<ImportResult> {
  const result: ImportResult = { ok: true, created: 0, updated: 0, skipped: 0, problems: [] };
  if (rows.length === 0) return { ...result, ok: false, error: "importEmpty" };

  const note = (line: number, message: string) => {
    result.skipped++;
    if (result.problems.length < 20) result.problems.push(`Row ${line}: ${message}`);
  };

  if (type === "vehicles") {
    for (const [i, row] of rows.entries()) {
      const line = i + 2; // +1 for header, +1 for 1-based
      const brandName = row.brand?.trim();
      const modelName = row.model?.trim();
      const from = parseInt(row.yearFrom, 10);
      const to = row.yearTo?.trim() ? parseInt(row.yearTo, 10) : from;
      if (!brandName || !modelName) {
        note(line, "brand and model are required");
        continue;
      }
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < MIN_YEAR || to > MAX_YEAR || to < from) {
        note(line, "invalid year(s)");
        continue;
      }

      const brand = await prisma.brand.upsert({
        where: { name: brandName },
        update: {},
        create: { name: brandName },
      });
      const model = await prisma.carModel.upsert({
        where: { brandId_name: { brandId: brand.id, name: modelName } },
        update: {},
        create: { brandId: brand.id, name: modelName },
      });
      for (const year of expandYears(from, to)) {
        const existing = await prisma.yearRange.findUnique({
          where: {
            carModelId_startYear_endYear: {
              carModelId: model.id,
              startYear: year,
              endYear: year,
            },
          },
        });
        if (existing) result.updated++;
        else {
          await prisma.yearRange.create({
            data: { carModelId: model.id, startYear: year, endYear: year },
          });
          result.created++;
        }
      }
    }
    return result;
  }

  for (const [i, row] of rows.entries()) {
    const line = i + 2;
    const categoryName = row.category?.trim();
    const subName = row.subCategory?.trim();
    const partName = row.part?.trim();
    if (!categoryName || !subName || !partName) {
      note(line, "category, subCategory and part are required");
      continue;
    }
    const min = row.priceMinUsd?.trim();
    const max = row.priceMaxUsd?.trim();
    if ((min && !money.test(min)) || (max && !money.test(max))) {
      note(line, "invalid price");
      continue;
    }
    if (min && max && Number(max) < Number(min)) {
      note(line, "price max is below min");
      continue;
    }

    const category = await prisma.category.upsert({
      where: { name: categoryName },
      update: { nameKu: row.categoryKu || null, nameAr: row.categoryAr || null },
      create: {
        name: categoryName,
        nameKu: row.categoryKu || null,
        nameAr: row.categoryAr || null,
      },
    });
    const sub = await prisma.subCategory.upsert({
      where: { categoryId_name: { categoryId: category.id, name: subName } },
      update: { nameKu: row.subCategoryKu || null, nameAr: row.subCategoryAr || null },
      create: {
        categoryId: category.id,
        name: subName,
        nameKu: row.subCategoryKu || null,
        nameAr: row.subCategoryAr || null,
      },
    });

    const existing = await prisma.part.findUnique({
      where: { subCategoryId_name: { subCategoryId: sub.id, name: partName } },
    });
    const data = {
      nameKu: row.partKu || null,
      nameAr: row.partAr || null,
      requiresColorCode: truthy.has((row.requiresColorCode ?? "").toLowerCase()),
      priceMinUsd: min || null,
      priceMaxUsd: max || null,
    };
    if (existing) {
      await prisma.part.update({ where: { id: existing.id }, data });
      result.updated++;
    } else {
      await prisma.part.create({ data: { ...data, subCategoryId: sub.id, name: partName } });
      result.created++;
    }
  }
  return result;
}
