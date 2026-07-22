"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const PATH = "/admin/vehicles";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function addBrand(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  if (!name) return;
  await prisma.brand.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  revalidatePath(PATH);
}

export async function deleteBrand(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  let inUse = false;
  try {
    await prisma.brand.delete({ where: { id } });
  } catch {
    inUse = true; // referenced by existing requests
  }
  revalidatePath(PATH);
  if (inUse) redirect(`${PATH}?error=in-use`);
}

export async function addModel(formData: FormData) {
  await requireAdmin();
  const brandId = text(formData, "brandId");
  const name = text(formData, "name");
  if (!brandId || !name) return;
  await prisma.carModel.upsert({
    where: { brandId_name: { brandId, name } },
    update: {},
    create: { brandId, name },
  });
  revalidatePath(PATH);
}

export async function deleteModel(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  let inUse = false;
  try {
    await prisma.carModel.delete({ where: { id } });
  } catch {
    inUse = true;
  }
  revalidatePath(PATH);
  if (inUse) redirect(`${PATH}?error=in-use`);
}

export async function addYearRange(formData: FormData) {
  await requireAdmin();
  const carModelId = text(formData, "carModelId");
  const startYear = parseInt(text(formData, "startYear"), 10);
  const endYear = parseInt(text(formData, "endYear"), 10);
  if (
    !carModelId ||
    !Number.isInteger(startYear) ||
    !Number.isInteger(endYear) ||
    startYear < 1950 ||
    endYear > 2100 ||
    endYear < startYear
  ) {
    redirect(`${PATH}?error=bad-years`);
  }
  await prisma.yearRange.upsert({
    where: { carModelId_startYear_endYear: { carModelId, startYear, endYear } },
    update: {},
    create: { carModelId, startYear, endYear },
  });
  revalidatePath(PATH);
}

export async function deleteYearRange(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  let inUse = false;
  try {
    await prisma.yearRange.delete({ where: { id } });
  } catch {
    inUse = true;
  }
  revalidatePath(PATH);
  if (inUse) redirect(`${PATH}?error=in-use`);
}
