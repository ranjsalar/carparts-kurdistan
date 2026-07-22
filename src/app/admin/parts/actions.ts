"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const PATH = "/admin/parts";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function addCategory(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  if (!name) return;
  await prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  revalidatePath(PATH);
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  let inUse = false;
  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    inUse = true;
  }
  revalidatePath(PATH);
  if (inUse) redirect(`${PATH}?error=in-use`);
}

export async function addSubCategory(formData: FormData) {
  await requireAdmin();
  const categoryId = text(formData, "categoryId");
  const name = text(formData, "name");
  if (!categoryId || !name) return;
  await prisma.subCategory.upsert({
    where: { categoryId_name: { categoryId, name } },
    update: {},
    create: { categoryId, name },
  });
  revalidatePath(PATH);
}

export async function deleteSubCategory(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  let inUse = false;
  try {
    await prisma.subCategory.delete({ where: { id } });
  } catch {
    inUse = true;
  }
  revalidatePath(PATH);
  if (inUse) redirect(`${PATH}?error=in-use`);
}

export async function addPart(formData: FormData) {
  await requireAdmin();
  const subCategoryId = text(formData, "subCategoryId");
  const name = text(formData, "name");
  const requiresColorCode = formData.get("requiresColorCode") === "on";
  if (!subCategoryId || !name) return;
  await prisma.part.upsert({
    where: { subCategoryId_name: { subCategoryId, name } },
    update: { requiresColorCode },
    create: { subCategoryId, name, requiresColorCode },
  });
  revalidatePath(PATH);
}

export async function deletePart(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  let inUse = false;
  try {
    await prisma.part.delete({ where: { id } });
  } catch {
    inUse = true;
  }
  revalidatePath(PATH);
  if (inUse) redirect(`${PATH}?error=in-use`);
}

export async function setPartPriceRange(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const minRaw = text(formData, "priceMin");
  const maxRaw = text(formData, "priceMax");

  // Empty inputs clear the indicative range.
  if (!minRaw && !maxRaw) {
    await prisma.part.update({
      where: { id },
      data: { priceMinUsd: null, priceMaxUsd: null },
    });
    revalidatePath(PATH);
    return;
  }

  const PRICE = /^\d{1,8}(\.\d{1,2})?$/;
  const min = Number(minRaw);
  const max = Number(maxRaw);
  if (!PRICE.test(minRaw) || !PRICE.test(maxRaw) || min <= 0 || max < min) {
    redirect(`${PATH}?error=bad-range`);
  }

  await prisma.part.update({
    where: { id },
    data: { priceMinUsd: minRaw, priceMaxUsd: maxRaw },
  });
  revalidatePath(PATH);
}

export async function togglePartColorCode(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const part = await prisma.part.findUnique({ where: { id } });
  if (!part) return;
  await prisma.part.update({
    where: { id },
    data: { requiresColorCode: !part.requiresColorCode },
  });
  revalidatePath(PATH);
}
