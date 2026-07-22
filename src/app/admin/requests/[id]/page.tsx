import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { statusBadgeClasses } from "@/lib/status";
import { paymentMethodLabels } from "@/lib/payments";
import { nextShipmentStatus } from "@/lib/shipments";
import { SubmitButton } from "@/components/SubmitButton";
import { advanceShipmentAction, confirmPaymentAction } from "./actions";
import { QuoteForm } from "./QuoteForm";

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; paid?: string; advanced?: string; error?: string }>;
}) {
  const { id } = await params;
  const { sent, paid, advanced, error } = await searchParams;
  const t = await getTranslations("admin.detail");
  const tq = await getTranslations("admin.queue");
  const ts = await getTranslations("statuses");
  const te = await getTranslations("errors");

  const request = await prisma.partRequest.findUnique({
    where: { id },
    include: {
      customer: true,
      brand: true,
      carModel: true,
      yearRange: true,
      part: { include: { subCategory: { include: { category: true } } } },
      quotedBy: true,
      statusLogs: { orderBy: { createdAt: "asc" }, include: { createdBy: true } },
    },
  });
  if (!request) notFound();

  const canQuote = request.status === "PENDING" || request.status === "QUOTED";
  const nextStage = nextShipmentStatus(request.status);
  const inShipmentPhase =
    request.status === "PAID" ||
    ["SOURCING", "SHIPPED", "ARRIVED", "READY", "COMPLETED"].includes(request.status);

  return (
    <div>
      <Link href="/admin/requests" className="text-sm text-brand-700 hover:underline">
        ← {t("backToQueue")}
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title font-bold text-steel-900">
          {request.part.name}{" "}
          <span className="font-normal text-steel-500">
            — {request.brand.name} {request.carModel.name}
          </span>
        </h1>
        <span
          className={`rounded-full px-3 py-1 font-heading text-overline font-semibold uppercase ${statusBadgeClasses[request.status]}`}
        >
          {ts(request.status)}
        </span>
      </div>

      {sent && (
        <p className="mb-4 rounded-lg border-s-4 border-success-600 bg-success-50 px-4 py-2.5 text-caption text-success-700">
          {t("quoteSentBanner")}
        </p>
      )}
      {paid && (
        <p className="mb-4 rounded-lg border-s-4 border-success-600 bg-success-50 px-4 py-2.5 text-caption text-success-700">
          {t("paidConfirmedBanner")}
        </p>
      )}
      {advanced && (
        <p className="mb-4 rounded-lg border-s-4 border-success-600 bg-success-50 px-4 py-2.5 text-caption text-success-700">
          {t("statusUpdatedBanner")}
        </p>
      )}
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
                <dd className="font-medium text-steel-900">
                  {request.brand.name} {request.carModel.name} ({request.yearRange.startYear}–
                  {request.yearRange.endYear})
                </dd>
              </div>
              <div>
                <dt className="text-steel-400">{tq("part")}</dt>
                <dd className="font-medium text-steel-900">
                  {request.part.subCategory.category.name} › {request.part.subCategory.name} ›{" "}
                  {request.part.name}
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
                <dd className="font-medium text-steel-900">
                  {request.createdAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              {request.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-steel-400">{t("customerNotes")}</dt>
                  <dd className="font-medium text-steel-900">“{request.notes}”</dd>
                </div>
              )}
            </dl>
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
            <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">{t("customer")}</h2>
            <p className="font-medium text-steel-900">{request.customer.name}</p>
            <p className="mt-1 text-sm text-steel-600">
              {request.customer.phone && (
                <span className="me-4" dir="ltr">
                  📱 {request.customer.phone}
                </span>
              )}
              {request.customer.email && <span dir="ltr">✉️ {request.customer.email}</span>}
            </p>
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
                    {log.note && <span className="text-steel-700">{log.note}</span>}
                    <span className="block text-xs text-steel-400">
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
                ${request.priceUsd?.toString()} ·{" "}
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
              />
            ) : (
              <p className="text-sm text-steel-500">{t("notQuotable")}</p>
            )}
          </section>

          {(request.status === "APPROVED" || request.status === "PAID") && (
            <section className="mt-6 rounded-2xl border border-steel-200 bg-white p-5">
              <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">
                {t("payment")}
              </h2>

              {request.status === "APPROVED" && !request.paymentMethod && (
                <p className="text-sm text-steel-500">{t("waitingMethod")}</p>
              )}

              {request.paymentMethod && (
                <p className="text-sm text-steel-700">
                  {t("method")}:{" "}
                  <span className="font-medium">{paymentMethodLabels[request.paymentMethod]}</span>
                </p>
              )}

              {request.paymentProofUrl && (
                <div className="mt-3">
                  <p className="mb-1 text-sm text-steel-400">{t("proof")}</p>
                  <a href={request.paymentProofUrl} target="_blank" rel="noreferrer">
                    <Image
                      src={request.paymentProofUrl}
                      alt={t("proof")}
                      width={128}
                      height={128}
                      className="h-32 w-32 rounded-lg object-cover ring-1 ring-steel-200"
                    />
                  </a>
                </div>
              )}

              {request.status === "APPROVED" && request.paymentMethod && (
                <form action={confirmPaymentAction} className="mt-4">
                  <input type="hidden" name="requestId" value={request.id} />
                  <SubmitButton className="w-full rounded-lg bg-success-600 py-2.5 font-heading text-sm font-semibold text-white transition-colors hover:bg-success-700">
                    {t("confirmPayment")}
                  </SubmitButton>
                  <p className="mt-1 text-xs text-steel-400">{t("confirmHint")}</p>
                </form>
              )}

              {request.status === "PAID" && (
                <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {ts("PAID")}
                  {request.paidAt &&
                    ` · ${request.paidAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
                </p>
              )}
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
        </div>
      </div>
    </div>
  );
}
