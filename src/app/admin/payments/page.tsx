import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { computePaymentState } from "@/lib/payments";
import { SubmitButton } from "@/components/SubmitButton";
import { SuccessDialog } from "@/components/SuccessDialog";
import { confirmPaymentAction, rejectPaymentAction } from "./actions";

const methodKeyMap: Record<string, string> = {
  FIB: "methodFib",
  FASTPAY: "methodFastpay",
  QICARD: "methodQicard",
  CASH_ON_DELIVERY: "methodCod",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const t = await getTranslations("admin.payments");
  const tp = await getTranslations("payment");
  const te = await getTranslations("errors");

  const payments = await prisma.payment.findMany({
    where: { status: "PENDING_CONFIRMATION" },
    orderBy: { createdAt: "asc" },
    include: {
      request: {
        include: { customer: true, part: true, brand: true, carModel: true, payments: true },
      },
    },
  });

  return (
    <div>
      {success && <SuccessDialog messageKey={success} redirectTo="/admin/payments" />}
      <h1 className="mb-6 text-title font-bold text-steel-900">{t("title")}</h1>
      {error && (
        <p className="mb-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
          {te.has(error) ? te(error) : te("generic")}
        </p>
      )}

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-steel-300 bg-white px-4 py-14 text-center text-caption text-steel-500">
          {t("empty")}
        </div>
      ) : (
        <ul className="space-y-4">
          {payments.map((p) => {
            const state = computePaymentState(p.request.priceUsd, p.request.payments);
            return (
              <li key={p.id} className="rounded-2xl border border-steel-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-heading text-heading font-bold text-steel-900" dir="ltr">
                      ${p.amountUsd.toString()}
                    </p>
                    <p className="mt-0.5 text-caption font-semibold text-brand-700">
                      {tp(methodKeyMap[p.method])}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent-50 px-2.5 py-0.5 font-heading text-overline font-semibold uppercase text-accent-700 ring-1 ring-accent-200">
                    {t("pendingBadge")}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-caption sm:grid-cols-2">
                  <div className="flex justify-between gap-3 border-b border-steel-100 pb-2">
                    <dt className="text-steel-500">{t("request")}</dt>
                    <dd className="text-end font-medium text-steel-900">
                      {p.request.part.name} — {p.request.brand.name} {p.request.carModel.name}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-steel-100 pb-2">
                    <dt className="text-steel-500">{t("customer")}</dt>
                    <dd className="text-end font-medium text-steel-900">{p.request.customer.name}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-steel-100 pb-2">
                    <dt className="text-steel-500">{t("sender")}</dt>
                    <dd className="text-end font-medium text-steel-900">
                      {p.senderAccountName ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-steel-100 pb-2">
                    <dt className="text-steel-500">{t("senderPhone")}</dt>
                    <dd className="text-end font-medium text-steel-900" dir="ltr">
                      {p.senderPhone ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-steel-500">{t("balancePaid")}</dt>
                    <dd className="text-end font-medium text-steel-900" dir="ltr">
                      ${state.confirmed} / ${state.total}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-steel-500">{t("balanceRemaining")}</dt>
                    <dd className="text-end font-medium text-steel-900" dir="ltr">
                      ${state.remaining}
                    </dd>
                  </div>
                </dl>

                {p.proofUrl ? (
                  <a
                    href={p.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block"
                  >
                    <Image
                      src={p.proofUrl}
                      alt={t("proof")}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-lg object-cover ring-1 ring-steel-200"
                    />
                  </a>
                ) : (
                  <p className="mt-3 text-caption text-steel-400">{t("noProof")}</p>
                )}

                <div className="mt-4 flex flex-col gap-3 border-t border-steel-100 pt-4 sm:flex-row sm:items-start">
                  <div className="flex items-center gap-3">
                    <form action={confirmPaymentAction}>
                      <input type="hidden" name="paymentId" value={p.id} />
                      <input type="hidden" name="requestId" value={p.requestId} />
                      <input type="hidden" name="source" value="queue" />
                      <SubmitButton className="rounded-lg bg-success-600 px-5 py-2.5 font-heading text-sm font-semibold text-white transition-colors hover:bg-success-700">
                        {t("confirm")}
                      </SubmitButton>
                    </form>
                    <Link
                      href={`/admin/requests/${p.requestId}`}
                      className="text-caption font-semibold text-brand-700 hover:underline"
                    >
                      {t("viewRequest")}
                    </Link>
                  </div>

                  <form
                    action={rejectPaymentAction}
                    className="flex flex-1 flex-col gap-2 sm:ms-auto sm:flex-row"
                  >
                    <input type="hidden" name="paymentId" value={p.id} />
                    <input type="hidden" name="requestId" value={p.requestId} />
                    <input type="hidden" name="source" value="queue" />
                    <input
                      name="note"
                      required
                      placeholder={t("rejectReasonPlaceholder")}
                      className="flex-1 rounded-lg border border-steel-300 px-3 py-2 text-caption text-steel-900 focus:border-danger-600 focus:outline-none focus:ring-2 focus:ring-danger-600/15"
                    />
                    <SubmitButton className="rounded-lg border border-steel-300 bg-white px-4 py-2 font-heading text-sm font-semibold text-danger-600 transition-colors hover:border-danger-600 hover:bg-danger-50">
                      {t("reject")}
                    </SubmitButton>
                  </form>
                </div>

                <p className="mt-2 text-overline text-steel-400">{t("confirmHint")}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
