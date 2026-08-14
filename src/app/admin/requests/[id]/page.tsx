import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { statusBadgeClasses, statusLabels } from "@/lib/status";
import { formatUsd } from "@/lib/format";
import { computePaymentState } from "@/lib/payments";
import { renderTimelineNote, type TimelineContext } from "@/lib/timeline";
import { nextShipmentStatus } from "@/lib/shipments";
import { getQuoteSuggestions } from "@/lib/quote-suggestions";
import {
  PART_CONDITION_KEY,
  customEntries,
  partLabel,
  vehicleLabel,
} from "@/lib/request-display";
import { isWalkIn, partyEmail, partyName, partyPhone } from "@/lib/request-customer";
import { ChannelBadge } from "@/components/ChannelBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { SuccessDialog } from "@/components/SuccessDialog";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { advanceShipmentAction, overrideRequestStatusAction } from "./actions";
import { confirmPaymentAction, rejectPaymentAction } from "../../payments/actions";
import { QuoteForm } from "./QuoteForm";
import type { RequestStatus } from "@/generated/prisma/enums";

const ALL_STATUSES = Object.keys(statusLabels) as RequestStatus[];

const methodKeyMap: Record<string, string> = {
  FIB: "methodFib",
  FASTPAY: "methodFastpay",
  QICARD: "methodQicard",
  CASH_ON_DELIVERY: "methodCod",
};

const paymentStatusStyle: Record<string, string> = {
  PENDING_CONFIRMATION: "bg-accent-50 text-accent-700 ring-1 ring-accent-200",
  CONFIRMED: "bg-success-50 text-success-700 ring-1 ring-success-100",
  REJECTED: "bg-danger-50 text-danger-700 ring-1 ring-danger-100",
};

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { id } = await params;
  const { success, error } = await searchParams;
  const t = await getTranslations("admin.detail");
  const tq = await getTranslations("admin.queue");
  const tpay = await getTranslations("admin.payments");
  const tp = await getTranslations("payment");
  const ts = await getTranslations("statuses");
  const te = await getTranslations("errors");
  const tl = await getTranslations("timeline");
  const tov = await getTranslations("admin.override");
  const trf = await getTranslations("requestForm");

  const noteCtx: TimelineContext = {
    t: (key, values) => tl(key, values),
    hasKey: (key) => tl.has(key),
    label: (kind, value) =>
      kind === "source"
        ? value === "CHINA"
          ? t("china")
          : t("dubai")
        : kind === "method"
          ? tp(methodKeyMap[value] ?? value)
          : ts(value),
  };

  const request = await prisma.partRequest.findUnique({
    where: { id },
    include: {
      customer: true,
      brand: true,
      carModel: true,
      yearRange: true,
      trim: true,
      part: { include: { subCategory: { include: { category: true } } } },
      quotedBy: true,
      statusLogs: { orderBy: { createdAt: "asc" }, include: { createdBy: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!request) notFound();

  const payState = computePaymentState(request.priceUsd, request.payments);
  const canQuote = request.status === "PENDING" || request.status === "QUOTED";
  const nextStage = nextShipmentStatus(request.status);
  const inShipmentPhase =
    request.status === "PAID" ||
    ["SOURCING", "SHIPPED", "ARRIVED", "READY", "COMPLETED"].includes(request.status);

  return (
    <div>
      <Link
        href="/admin/requests"
        className="-ms-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-brand-700 hover:bg-steel-100 hover:underline"
      >
        ← {t("backToQueue")}
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title font-bold text-steel-900">
          {partLabel(request)}{" "}
          <span className="font-normal text-steel-500">— {vehicleLabel(request)}</span>
        </h1>
        <span
          className={`rounded-full px-3 py-1 font-heading text-overline font-semibold uppercase ${statusBadgeClasses[request.status]}`}
        >
          {ts(request.status)}
        </span>
      </div>

      {success && <SuccessDialog messageKey={success} redirectTo="/admin/requests" />}
      {error && (
        <p className="mb-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
          {te.has(error) ? te(error) : te("generic")}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: request details */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-steel-200 bg-white p-5">
            <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">{t("request")}</h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-steel-400">{tq("vehicle")}</dt>
                <dd className="font-medium text-steel-900">{vehicleLabel(request)}</dd>
              </div>
              <div>
                <dt className="text-steel-400">{tq("part")}</dt>
                <dd className="font-medium text-steel-900">
                  {request.part
                    ? `${request.part.subCategory.category.name} › ${request.part.subCategory.name} › ${request.part.name}`
                    : partLabel(request)}
                </dd>
              </div>
              <div>
                <dt className="text-steel-400">{t("colorCode")}</dt>
                <dd className="font-medium text-steel-900">
                  {request.colorCode ?? <span className="text-steel-400">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-steel-400">{t("submittedAt")}</dt>
                <dd className="font-medium text-steel-900" dir="ltr">
                  {request.createdAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              {request.partCondition && (
                <div>
                  <dt className="text-steel-400">{t("conditionLabel")}</dt>
                  <dd className="font-medium text-steel-900">
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-brand-800 ring-1 ring-brand-200">
                      {trf(`condition.${PART_CONDITION_KEY[request.partCondition]}`)}
                    </span>
                  </dd>
                </div>
              )}
              {request.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-steel-400">{t("customerNotes")}</dt>
                  <dd className="font-medium text-steel-900">“{request.notes}”</dd>
                </div>
              )}
            </dl>

            {/* Anything the customer typed instead of picking. Called out
                deliberately: these values are unverified, may be misspelled,
                and are the queue of candidates for extending the taxonomy. */}
            {customEntries(request).length > 0 && (
              <div className="mt-4 rounded-xl border-s-4 border-accent-500 bg-accent-50 px-4 py-3">
                <p className="font-heading text-overline font-semibold uppercase text-accent-800">
                  {t("customEntryTitle")}
                </p>
                <ul className="mt-1.5 space-y-0.5 text-sm text-accent-900">
                  {customEntries(request).map((entry) => (
                    <li key={entry.field}>
                      <span className="text-accent-700">{t(`customEntryField.${entry.field}`)}:</span>{" "}
                      <span className="font-semibold">“{entry.text}”</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-caption text-accent-800">{t("customEntryHint")}</p>
              </div>
            )}
            {request.photoUrl && (
              <div className="mt-4">
                <p className="mb-1 text-sm text-steel-400">{t("attachedPhoto")}</p>
                <a href={request.photoUrl} target="_blank" rel="noreferrer">
                  <Image
                    src={request.photoUrl}
                    alt={t("attachedPhoto")}
                    width={160}
                    height={160}
                    className="h-40 w-40 rounded-lg object-cover ring-1 ring-steel-200"
                  />
                </a>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-steel-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-overline font-semibold uppercase text-steel-500">
                {t("customer")}
              </h2>
              <ChannelBadge request={request} />
            </div>
            <p className="font-medium text-steel-900">{partyName(request)}</p>
            <p className="mt-1 text-sm text-steel-600">
              {partyPhone(request) && (
                <span className="me-4" dir="ltr">
                  📱 {partyPhone(request)}
                </span>
              )}
              {partyEmail(request) && <span dir="ltr">✉️ {partyEmail(request)}</span>}
            </p>
            {/* A walk-in has no account, so nothing the pipeline writes reaches
                them automatically — say so where the contact details are, not
                buried elsewhere. */}
            {isWalkIn(request) && (
              <p className="mt-2 rounded-lg bg-accent-50 px-3 py-2 text-caption text-accent-800">
                {t("walkInNoAccount")}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-steel-200 bg-white p-5">
            <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">{t("timeline")}</h2>
            <ol className="space-y-3">
              {request.statusLogs.map((log) => (
                <li key={log.id} className="flex gap-3 text-sm">
                  <span
                    className={`mt-0.5 h-fit whitespace-nowrap rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${statusBadgeClasses[log.status]}`}
                  >
                    {ts(log.status)}
                  </span>
                  <span className="flex-1">
                    {renderTimelineNote(log, noteCtx) && (
                      <span className="text-steel-700">{renderTimelineNote(log, noteCtx)}</span>
                    )}
                    <span className="block text-xs text-steel-400" dir="ltr">
                      {log.createdAt.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {log.createdBy && ` · ${log.createdBy.name}`}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right: quote form + payment + shipment */}
        <div>
          <section className="rounded-2xl border border-steel-200 bg-white p-5">
            <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">
              {request.status === "QUOTED" ? t("updateQuote") : t("sendQuote")}
            </h2>

            {request.status === "QUOTED" && request.quotedAt && (
              <p className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-caption text-brand-900" dir="ltr">
                ${formatUsd(request.priceUsd)} ·{" "}
                {request.source === "CHINA" ? t("china") : t("dubai")} ·{" "}
                {request.quotedBy?.name ?? "admin"} ·{" "}
                {request.quotedAt.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {request.preferredSource && (
              <p className="mb-3 rounded-lg border-s-4 border-accent-500 bg-accent-50 px-3 py-2 text-caption text-accent-800">
                {t("customerPrefers")}{" "}
                <span className="font-semibold">
                  {request.preferredSource === "CHINA"
                    ? `${t("china")} (${t("etaChina")})`
                    : `${t("dubai")} (${t("etaDubai")})`}
                </span>
              </p>
            )}

            {canQuote ? (
              <QuoteForm
                requestId={request.id}
                isUpdate={request.status === "QUOTED"}
                defaults={{
                  source: request.source ?? request.preferredSource ?? "CHINA",
                  part: request.pricePartUsd?.toString() ?? "",
                  shipping: request.priceShippingUsd?.toString() ?? "",
                  tax: request.priceTaxUsd?.toString() ?? "",
                  delivery: request.priceDeliveryUsd?.toString() ?? "",
                  notes: request.quoteNotes ?? "",
                }}
                suggestions={await getQuoteSuggestions()}
              />
            ) : (
              <p className="text-sm text-steel-500">{t("notQuotable")}</p>
            )}
          </section>

          {(request.status === "APPROVED" || inShipmentPhase) && request.priceUsd !== null && (
            <section className="mt-6 rounded-2xl border border-steel-200 bg-white p-5">
              <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">
                {t("payment")}
              </h2>

              {/* Balance */}
              <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-steel-100/70 p-3 text-center">
                <div>
                  <p className="text-overline uppercase text-steel-500">{tpay("balancePaid")}</p>
                  <p className="font-heading text-body font-bold text-success-700" dir="ltr">
                    ${payState.confirmed}
                  </p>
                </div>
                <div>
                  <p className="text-overline uppercase text-steel-500">{tpay("balanceRemaining")}</p>
                  <p className="font-heading text-body font-bold text-accent-700" dir="ltr">
                    ${payState.remaining}
                  </p>
                </div>
                <div>
                  <p className="text-overline uppercase text-steel-500">{tpay("balanceTotal")}</p>
                  <p className="font-heading text-body font-bold text-steel-900" dir="ltr">
                    ${payState.total}
                  </p>
                </div>
              </div>

              {request.payments.length === 0 ? (
                <p className="text-sm text-steel-500">{tpay("noneYet")}</p>
              ) : (
                <ul className="space-y-3">
                  {request.payments.map((pay) => (
                    <li key={pay.id} className="rounded-xl border border-steel-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-heading text-body font-bold text-steel-900" dir="ltr">
                          ${pay.amountUsd.toString()}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${paymentStatusStyle[pay.status]}`}
                        >
                          {tpay(`status_${pay.status}`)}
                        </span>
                      </div>
                      <p className="mt-1 text-caption text-steel-600">
                        {tp(methodKeyMap[pay.method])}
                        {pay.senderAccountName && (
                          <span className="text-steel-500">
                            {" "}
                            · {pay.senderAccountName}
                            {pay.senderPhone && (
                              <span dir="ltr"> ({pay.senderPhone})</span>
                            )}
                          </span>
                        )}
                      </p>
                      {pay.status === "REJECTED" && pay.adminNote && (
                        <p className="mt-1 text-caption text-danger-700">“{pay.adminNote}”</p>
                      )}
                      {pay.proofUrl && (
                        <a href={pay.proofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block">
                          <Image
                            src={pay.proofUrl}
                            alt={tpay("proof")}
                            width={80}
                            height={80}
                            className="h-20 w-20 rounded-lg object-cover ring-1 ring-steel-200"
                          />
                        </a>
                      )}
                      {pay.status === "PENDING_CONFIRMATION" && (
                        <div className="mt-3 space-y-2">
                          <form action={confirmPaymentAction}>
                            <input type="hidden" name="paymentId" value={pay.id} />
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="source" value="detail" />
                            <SubmitButton className="w-full rounded-lg bg-success-600 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-success-700">
                              {tpay("confirm")}
                            </SubmitButton>
                          </form>
                          <form action={rejectPaymentAction} className="flex gap-2">
                            <input type="hidden" name="paymentId" value={pay.id} />
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="source" value="detail" />
                            <input
                              name="note"
                              required
                              placeholder={tpay("rejectReasonPlaceholder")}
                              className="flex-1 rounded-lg border border-steel-300 px-3 py-2 text-caption text-steel-900 focus:border-danger-600 focus:outline-none focus:ring-2 focus:ring-danger-600/15"
                            />
                            <SubmitButton className="rounded-lg border border-steel-300 bg-white px-3 py-2 font-heading text-sm font-semibold text-danger-600 transition-colors hover:border-danger-600 hover:bg-danger-50">
                              {tpay("reject")}
                            </SubmitButton>
                          </form>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-steel-400">{tpay("confirmHint")}</p>
            </section>
          )}

          {inShipmentPhase && (
            <section className="mt-6 rounded-2xl border border-steel-200 bg-white p-5">
              <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">
                {t("shipment")}
              </h2>
              <p className="text-sm text-steel-700">
                {t("current")}:{" "}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses[request.status]}`}
                >
                  {ts(request.status)}
                </span>
              </p>

              {nextStage ? (
                <form action={advanceShipmentAction} className="mt-4 space-y-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <div>
                    <label htmlFor="note" className="mb-1 block text-sm font-medium text-steel-700">
                      {t("notesToCustomer")}
                    </label>
                    <input
                      id="note"
                      name="note"
                      placeholder={t("notePlaceholder")}
                      className="w-full rounded-lg border border-steel-300 px-3.5 py-2.5 text-caption text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                    />
                  </div>
                  <SubmitButton className="w-full rounded-lg bg-steel-900 py-2.5 font-heading text-sm font-semibold text-white transition-colors hover:bg-steel-800">
                    {t("markAs", { status: ts(nextStage) })}
                  </SubmitButton>
                  <p className="text-xs text-steel-400">{t("advanceHint")}</p>
                </form>
              ) : (
                <p className="mt-3 rounded-lg border-s-4 border-success-600 bg-success-50 px-4 py-2.5 text-caption text-success-700">
                  {t("completedNote")}
                </p>
              )}
            </section>
          )}

          {/* Manual override — exceptional corrections only. Recorded in the
              timeline as an explicit admin override, never as a normal step. */}
          <section className="mt-6 rounded-2xl border border-accent-200 bg-accent-50/40 p-5">
            <h2 className="mb-1 font-heading text-overline font-semibold uppercase text-accent-800">
              {tov("title")}
            </h2>
            <p className="mb-3 text-caption text-steel-600">{tov("intro")}</p>
            <form action={overrideRequestStatusAction} className="space-y-3">
              <input type="hidden" name="requestId" value={request.id} />
              <div>
                <label className="mb-1.5 block text-caption font-medium text-steel-700">
                  {tov("newStatus")}
                </label>
                <select
                  name="status"
                  defaultValue={request.status}
                  className="select-field w-full rounded-lg border border-steel-300 bg-white px-3 py-2 text-caption text-steel-900 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/15"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ts(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-caption font-medium text-steel-700">
                  {tov("reason")}
                </label>
                <input
                  name="reason"
                  required
                  placeholder={tov("reasonPlaceholder")}
                  className="w-full rounded-lg border border-steel-300 bg-white px-3 py-2 text-caption text-steel-900 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/15"
                />
              </div>
              <ConfirmSubmit
                label={tov("apply")}
                title={tov("confirmTitle")}
                body={tov("confirmBody")}
                confirmLabel={tov("apply")}
                danger
                className="w-full rounded-lg bg-accent-600 px-4 py-2.5 font-heading text-sm font-semibold text-white hover:bg-accent-700"
              />
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
