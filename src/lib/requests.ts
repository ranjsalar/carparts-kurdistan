import { prisma } from "./db";
import { TIMELINE } from "./timeline";
import { isPartCondition } from "./request-display";
import type { PartCondition, SourceCountry } from "@/generated/prisma/enums";

/*
  Each vehicle/part level accepts EITHER a catalog id OR free text the customer
  typed after choosing "Other — not listed". Empty string means "not provided",
  which is how the form sends an unused branch.
*/
export type SubmitRequestInput = {
  brandId?: string;
  carModelId?: string;
  yearRangeId?: string;
  trimId?: string;
  partId?: string;
  rawBrandText?: string;
  rawModelText?: string;
  rawYearText?: string;
  rawTrimText?: string;
  rawPartText?: string;
  partCondition?: string;
  preferredSource?: string;
  colorCode?: string;
  /** Required: every request must arrive with context for the sourcing team. */
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
  const text = (v: string | undefined) => v?.trim() || null;

  const rawBrandText = text(input.rawBrandText);
  const rawModelText = text(input.rawModelText);
  const rawYearText = text(input.rawYearText);
  const rawTrimText = text(input.rawTrimText);
  const rawPartText = text(input.rawPartText);

  const [model, yearRange, trim, part] = await Promise.all([
    input.carModelId ? prisma.carModel.findUnique({ where: { id: input.carModelId } }) : null,
    input.yearRangeId ? prisma.yearRange.findUnique({ where: { id: input.yearRangeId } }) : null,
    input.trimId ? prisma.trim.findUnique({ where: { id: input.trimId } }) : null,
    input.partId ? prisma.part.findUnique({ where: { id: input.partId } }) : null,
  ]);

  // Each level needs exactly one of: a catalog row, or typed text. The
  // database cannot express "one or the other", so it is enforced here — the
  // form is not a security boundary.
  if (!input.brandId && !rawBrandText) return { ok: false, error: "brandRequired" };
  if (!input.carModelId && !rawModelText) return { ok: false, error: "modelRequired" };
  if (!input.yearRangeId && !rawYearText) return { ok: false, error: "yearRequired" };
  if (!input.partId && !rawPartText) return { ok: false, error: "partRequired" };

  // Catalog selections must still hang together: a model has to belong to the
  // chosen brand, a year to that model, a trim to that model.
  if (input.carModelId) {
    if (!model || model.brandId !== input.brandId) return { ok: false, error: "vehicleMismatch" };
  }
  if (input.yearRangeId) {
    if (!yearRange || !model || yearRange.carModelId !== model.id) {
      return { ok: false, error: "vehicleMismatch" };
    }
  }
  if (input.trimId) {
    if (!trim || !model || trim.carModelId !== model.id) {
      return { ok: false, error: "vehicleMismatch" };
    }
  }
  if (input.partId && !part) {
    return { ok: false, error: "partNotFound" };
  }

  const colorCode = input.colorCode?.trim() || null;
  // A typed part has no requiresColorCode flag to consult, so the colour step
  // is only enforced for catalog parts.
  if (part?.requiresColorCode && !colorCode) {
    return { ok: false, error: "colorRequired" };
  }

  // Condition is required for the body panels flagged for it, and rejected
  // for anything else so a crafted submission cannot attach a meaningless
  // condition to an oil filter.
  let partCondition: PartCondition | null = null;
  if (part?.conditionApplies) {
    if (!isPartCondition(input.partCondition)) {
      return { ok: false, error: "conditionRequired" };
    }
    partCondition = input.partCondition;
  } else if (input.partCondition) {
    return { ok: false, error: "conditionNotApplicable" };
  }

  // Notes are mandatory — checked server-side, not just in the form, since the
  // client can be bypassed.
  const notes = input.notes?.trim();
  if (!notes) {
    return { ok: false, error: "notesRequired" };
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
      brandId: input.brandId || null,
      carModelId: model?.id ?? null,
      yearRangeId: yearRange?.id ?? null,
      trimId: trim?.id ?? null,
      partId: part?.id ?? null,
      rawBrandText,
      rawModelText,
      rawYearText,
      rawTrimText,
      rawPartText,
      partCondition,
      preferredSource,
      colorCode,
      notes,
      photoUrl: input.photoUrl || null,
      status: "PENDING",
      statusLogs: {
        create: {
          status: "PENDING",
          note: "Request submitted",
          noteKey: TIMELINE.requestSubmitted,
          createdById: customerId,
        },
      },
    },
  });

  return { ok: true, id: request.id };
}
