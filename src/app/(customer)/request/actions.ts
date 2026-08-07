"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { submitPartRequest } from "@/lib/requests";
import { saveUpload } from "@/lib/storage";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { noteEndpointHit } from "@/lib/threat-detection";

export type CreateRequestResult = { ok: false; error: string };

export async function createRequest(formData: FormData): Promise<CreateRequestResult> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await noteEndpointHit(await clientIp());

  if (!(await rateLimit(`submit:${user.id}`, 10, 60 * 60 * 1000)).ok) {
    return { ok: false, error: "submitRateLimited" };
  }

  const field = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  let photoUrl: string | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const saved = await saveUpload(photo);
    if (!saved.ok) return { ok: false, error: saved.error };
    photoUrl = saved.url;
  }

  const result = await submitPartRequest(user.id, {
    brandId: field("brandId"),
    carModelId: field("carModelId"),
    yearRangeId: field("yearRangeId"),
    trimId: field("trimId"),
    partId: field("partId"),
    rawBrandText: field("rawBrandText"),
    rawModelText: field("rawModelText"),
    rawYearText: field("rawYearText"),
    rawTrimText: field("rawTrimText"),
    rawPartText: field("rawPartText"),
    partCondition: field("partCondition"),
    preferredSource: field("preferredSource"),
    colorCode: field("colorCode"),
    notes: field("notes"),
    photoUrl,
  });

  if (!result.ok) return { ok: false, error: result.error };
  redirect("/requests?success=requestSubmitted");
}
