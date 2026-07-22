import { prisma } from "./db";
import type { SourceCountry } from "@/generated/prisma/enums";

export type SubmitRequestInput = {
  brandId: string;
  carModelId: string;
  yearRangeId: string;
  partId: string;
  preferredSource?: string;
  colorCode?: string;
  notes?: string;
  photoUrl?: string;
};

export type SubmitRequestResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Validates that the selected taxonomy items exist and belong together
 * (model → brand, year range → model), then creates a PENDING request with
 * its first status-log entry.
 */
export async function submitPartRequest(
  customerId: string,
  input: SubmitRequestInput,
): Promise<SubmitRequestResult> {
  const [model, yearRange, part] = await Promise.all([
    prisma.carModel.findUnique({ where: { id: input.carModelId } }),
    prisma.yearRange.findUnique({ where: { id: input.yearRangeId } }),
    prisma.part.findUnique({ where: { id: input.partId } }),
  ]);

  if (!model || model.brandId !== input.brandId) {
    return { ok: false, error: "vehicleMismatch" };
  }
  if (!yearRange || yearRange.carModelId !== model.id) {
    return { ok: false, error: "vehicleMismatch" };
  }
  if (!part) {
    return { ok: false, error: "partNotFound" };
  }

  const colorCode = input.colorCode?.trim() || null;
  if (part.requiresColorCode && !colorCode) {
    return { ok: false, error: "colorRequired" };
  }

  // The customer must state a sourcing preference (China ≈ 2 months,
  // Dubai ≈ 20 days). Advisory only — admin confirms the actual source.
  if (input.preferredSource !== "CHINA" && input.preferredSource !== "DUBAI") {
    return { ok: false, error: "invalidSource" };
  }
  const preferredSource = input.preferredSource as SourceCountry;

  const request = await prisma.partRequest.create({
    data: {
      customerId,
      brandId: input.brandId,
      carModelId: model.id,
      yearRangeId: yearRange.id,
      partId: part.id,
      preferredSource,
      colorCode,
      notes: input.notes?.trim() || null,
      photoUrl: input.photoUrl || null,
      status: "PENDING",
      statusLogs: {
        create: { status: "PENDING", note: "Request submitted", createdById: customerId },
      },
    },
  });

  return { ok: true, id: request.id };
}
