import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { ComponentType } from "react";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { statusBadgeClasses } from "@/lib/status";
import { SHIPMENT_STAGES } from "@/lib/shipments";
import { IconBox, IconFinish, IconFlag, IconReady, IconTruck } from "@/components/icons";
import { card, overline } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { approveQuoteAction, rejectQuoteAction } from "./actions";
import { PaymentForm } from "./PaymentForm";

const stageIcons: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  SOURCING: IconBox,
  SHIPPED: IconTruck,
  ARRIVED: IconFlag,
  READY: IconReady,
  COMPLETED: IconFinish,
};

export default async function CustomerRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ approved?: string; rejected?: string; method?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const flags = await searchParams;
  const t = await getTranslations("detail");
  const ts = await getTranslations("statuses");
  const tp = await getTranslations("payment");
  const tt = await getTranslations("tracking");
  const te = await getTranslations("errors");
  const locale = await getLocale();

  const request = await prisma.partRequest.findUnique({
    where: { id },
    include: {
      brand: true,
      carModel: true,
      yearRange: true,
      part: true,
      statusLogs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!request || request.customerId !== user.id) notFound();

  // Part name carries optional Kurdish/Arabic translations; fall back to English.
  const localizedPartName =
    (locale === "ku" ? request.part.nameKu : locale === "ar" ? request.part.nameAr : null) ??
    request.part.name;

  const methodLabel =
    request.paymentMethod === "CASH_ON_DELIVERY"
      ? tp("cod")
      : request.paymentMethod === "ONLINE_GATEWAY"
        ? tp("gateway")
        : request.paymentMethod === "BANK_TRANSFER"
          ? tp("bank")
          : "";

  const banner = flags.error
    ? {
        tone: "border-danger-600 bg-danger-50 text-danger-700",
        text: te.has(flags.error) ? te(flags.error) : te("generic"),
      }
    : flags.approved
      ? { tone: "border-success-600 bg-success-50 text-success-700", text: t("banners.approved") }
      : flags.rejected
        ? { tone: "border-steel-400 bg-steel-100 text-steel-600", text: t("banners.rejected") }
        : flags.method
          ? {
              tone: "border-success-600 bg-success-50 text-success-700",
              text: t("banners.methodSaved"),
            }
          : null;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/requests"
        className="font-heading text-caption font-semibold text-brand-700 hover:underline"
      >
        ← {t("back")}
      </Link>

      <div className="mt-3 mb-7 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title font-bold text-steel-900">{localizedPartName}</h1>
        <span
          className={`rounded-full px-3 py-1 font-heading text-overline font-semibold uppercase ${statusBadgeClasses[request.status]}`}
        >
          {ts(request.status)}
        </span>
      </div>

      {banner && (
        <p className={`mb-5 rounded-xl border-s-4 px-4 py-3 text-caption ${banner.tone}`}>
          {banner.text}
        </p>
      )}

      <section className={`${card} mb-5 p-5`}>
        <p className="text-body text-steel-700">
          {request.brand.name} {request.carModel.name} ({request.yearRange.startYear}–
          {request.yearRange.endYear})
          {request.colorCode && (
            <span className="ms-2 rounded-md bg-steel-100 px-2 py-0.5 font-heading text-overline font-semibold uppercase text-steel-600">
              {request.colorCode}
            </span>
          )}
        </p>
        {request.preferredSource && (
          <p className="mt-2 text-caption text-steel-500">
            {t("requestedSource")}:{" "}
            <span className="font-medium text-steel-700">
              {request.preferredSource === "CHINA"
                ? `${t("sourceChina")} (${t("etaChina")})`
                : `${t("sourceDubai")} (${t("etaDubai")})`}
            </span>
          </p>
        )}
        {request.notes && <p className="mt-2 text-caption text-steel-500">“{request.notes}”</p>}
        {request.photoUrl && (
          <a href={request.photoUrl} target="_blank" rel="noreferrer">
            <Image
              src={request.photoUrl}
              alt=""
              width={80}
              height={80}
              className="mt-3 h-20 w-20 rounded-lg object-cover ring-1 ring-steel-200"
            />
          </a>
        )}
      </section>

      {/* Quote & decision — the money moment gets the dark treatment */}
      {request.status === "QUOTED" && request.priceUsd !== null && (
        <section className="mb-5 overflow-hidden rounded-2xl bg-brand-900 p-6 text-white">
          <p className={`${overline} text-brand-300`}>{t("yourQuote")}</p>

          {/* Itemized breakdown — components are null on quotes made before
              itemization existed, so only render the rows that are real. */}
          <dl className="mt-4 space-y-2 border-b border-white/15 pb-4">
            {[
              { label: t("partPrice"), value: request.pricePartUsd },
              { label: t("shippingCost"), value: request.priceShippingUsd },
              { label: t("taxCost"), value: request.priceTaxUsd },
              { label: t("deliveryCost"), value: request.priceDeliveryUsd },
            ]
              .filter((row) => row.value !== null)
              .map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4">
                  <dt className="text-caption text-brand-100">{row.label}</dt>
                  <dd className="font-heading text-caption font-semibold" dir="ltr">
                    ${row.value!.toString()}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="mt-3 flex items-baseline justify-between gap-4">
            <p className="font-heading text-caption font-semibold uppercase text-brand-300">
              {t("totalLabel")}
            </p>
            <p className="font-heading text-title font-bold" dir="ltr">
              ${request.priceUsd.toString()}
            </p>
          </div>

          {request.source && (
            <p className="mt-2 text-caption text-brand-200">
              {t("sourcedFrom", {
                source: request.source === "CHINA" ? t("sourceChina") : t("sourceDubai"),
              })}
            </p>
          )}
          {request.quoteNotes && <p className="mt-2 text-caption text-brand-100">{request.quoteNotes}</p>}
          <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-caption text-brand-100">
            {t("fullPaymentNote")}
          </p>
          <div className="mt-5 flex gap-3">
            <form action={approveQuoteAction} className="flex-1">
              <input type="hidden" name="requestId" value={request.id} />
              <SubmitButton className="w-full rounded-lg bg-accent-500 py-2.5 font-heading text-sm font-bold text-white transition-colors hover:bg-accent-600">
                {t("approve")}
              </SubmitButton>
            </form>
            <form action={rejectQuoteAction} className="flex-1">
              <input type="hidden" name="requestId" value={request.id} />
              <SubmitButton className="w-full rounded-lg border border-white/25 py-2.5 font-heading text-sm font-semibold text-white transition-colors hover:bg-white/10">
                {t("reject")}
              </SubmitButton>
            </form>
          </div>
        </section>
      )}

      {request.status === "APPROVED" && (
        <section className={`${card} mb-5 p-5`}>
          <h2 className={overline}>{t("paymentTitle")}</h2>
          <p className="mt-2 mb-4 text-body text-steel-600">
            {t("total")}{" "}
            <span className="font-heading text-heading font-bold text-steel-900" dir="ltr">
              ${request.priceUsd?.toString()}
            </span>
            {request.paymentMethod && (
              <span className="ms-2 text-caption text-success-700">
                {t("methodSelectedNote", { method: methodLabel })}
              </span>
            )}
          </p>
          <PaymentForm
            requestId={request.id}
            currentMethod={request.paymentMethod}
            hasProof={Boolean(request.paymentProofUrl)}
          />
        </section>
      )}

      {request.status === "REJECTED" && (
        <p className="mb-5 rounded-xl border-s-4 border-steel-400 bg-steel-100 px-4 py-3 text-caption text-steel-600">
          {t("rejectedClosed")}{" "}
          <Link href="/request" className="font-semibold text-brand-700 hover:underline">
            {t("submitNew")}
          </Link>
        </p>
      )}

      {request.status === "PAID" && request.paymentMethod && (
        <p className="mb-5 rounded-xl border-s-4 border-success-600 bg-success-50 px-4 py-3 text-caption text-success-700">
          {t("paidBanner", { method: methodLabel })}
        </p>
      )}

      {/* Shipment tracking — stage icons on a route */}
      {(request.status === "PAID" || SHIPMENT_STAGES.includes(request.status)) && (
        <section className={`${card} mb-5 p-6`}>
          <h2 className={`${overline} mb-5`}>{tt("title")}</h2>
          <ol>
            {SHIPMENT_STAGES.map((stage, i) => {
              const currentIdx = SHIPMENT_STAGES.indexOf(request.status);
              // A completed order has no "current" stage — everything is done.
              const state =
                i < currentIdx || request.status === "COMPLETED"
                  ? "done"
                  : i === currentIdx
                    ? "current"
                    : "upcoming";
              const StageIcon = stageIcons[stage];
              return (
                <li key={stage} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                        state === "done"
                          ? "bg-brand-600 text-white"
                          : state === "current"
                            ? "bg-accent-500 text-white ring-4 ring-accent-100"
                            : "border-2 border-steel-200 bg-white text-steel-300"
                      }`}
                    >
                      <StageIcon size={22} />
                    </span>
                    {i < SHIPMENT_STAGES.length - 1 && (
                      <span
                        className={`my-1 h-7 border-s-2 ${
                          state === "done" ? "border-brand-400" : "border-dashed border-steel-300"
                        }`}
                        aria-hidden
                      />
                    )}
                  </div>
                  <p
                    className={`pt-2.5 text-body ${
                      state === "current"
                        ? "font-heading font-bold text-steel-900"
                        : state === "done"
                          ? "text-steel-700"
                          : "text-steel-400"
                    }`}
                  >
                    {ts(stage)}
                    {state === "current" && (
                      <span className="ms-2 rounded-full bg-accent-50 px-2 py-0.5 font-heading text-overline font-semibold uppercase text-accent-700 ring-1 ring-accent-200">
                        {tt("current")}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
          {request.status === "PAID" && (
            <p className="mt-4 text-caption text-steel-400">{tt("paidHint")}</p>
          )}
        </section>
      )}

      {/* Timeline */}
      <section className={`${card} p-6`}>
        <h2 className={`${overline} mb-4`}>{t("progress")}</h2>
        <ol className="space-y-4">
          {request.statusLogs.map((log) => (
            <li key={log.id} className="flex gap-3 text-caption">
              <span
                className={`mt-0.5 h-fit whitespace-nowrap rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${statusBadgeClasses[log.status]}`}
              >
                {ts(log.status)}
              </span>
              <span className="flex-1">
                {log.note && <span className="text-steel-700">{log.note}</span>}
                <span className="block text-steel-400">
                  {log.createdAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
