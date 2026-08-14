import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { computePaymentState } from "@/lib/payments";
import { formatUsd } from "@/lib/format";
import { partLabel, vehicleLabel } from "@/lib/request-display";
import { partyName } from "@/lib/request-customer";
import { ChannelBadge } from "@/components/ChannelBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { SuccessDialog } from "@/components/SuccessDialog";
import { InlineConfirm } from "@/components/InlineConfirm";
import { confirmPaymentAction, rejectPaymentAction } from "./actions";

const methodKeyMap: Record<string, string> = {
  FIB: "methodFib",
  FASTPAY: "methodFastpay",
  QICARD: "methodQicard",
  CASH_ON_DELIVERY: "methodCod",
};

/*
  Queue ordering. Oldest-first stays the default — a payment queue is a
  work queue, and the person who has been waiting longest should be served
  first. The rest are for finding a specific payment, not for changing the
  routine order of work.
*/
const SORTS = {
  oldest: { createdAt: "asc" },
  newest: { createdAt: "desc" },
  amountDesc: { amountUsd: "desc" },
  amountAsc: { amountUsd: "asc" },
  customer: { request: { customer: { name: "asc" } } },
} as const;

type SortKey = keyof typeof SORTS;
const SORT_KEYS = Object.keys(SORTS) as SortKey[];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; sort?: string; q?: string }>;
}) {
  const { success, error, sort, q } = await searchParams;
  const t = await getTranslations("admin.payments");
  const tp = await getTranslations("payment");
  const te = await getTranslations("errors");
  const tc = await getTranslations("common");

  const sortKey: SortKey = SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : "oldest";
  const query = (q ?? "").trim();

  // Search matches the customer's name or phone — the two things an admin has
  // to hand when someone calls asking about a transfer they just sent.
  const where = {
    status: "PENDING_CONFIRMATION" as const,
    ...(query
      ? {
          request: {
            OR: [
              { customer: { name: { contains: query, mode: "insensitive" as const } } },
              { customer: { phone: { contains: query } } },
              { walkInName: { contains: query, mode: "insensitive" as const } },
              { walkInPhone: { contains: query } },
            ],
          },
        }
      : {}),
  };

  const [payments, totalPending] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: SORTS[sortKey],
      include: {
        request: {
          include: { customer: true, part: true, brand: true, carModel: true, trim: true, payments: true },
        },
      },
    }),
    prisma.payment.count({ where: { status: "PENDING_CONFIRMATION" } }),
  ]);

  const isFiltered = query !== "" || sortKey !== "oldest";

  return (
    <div>
      {success && <SuccessDialog messageKey={success} redirectTo="/admin/payments" />}
      <h1 className="mb-6 text-title font-bold text-steel-900">{t("title")}</h1>
      {error && (
        <p className="mb-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
          {te.has(error) ? te(error) : te("generic")}
        </p>
      )}

      {/* Plain GET form: filtering is a URL, so a filtered queue can be
          bookmarked, shared, and survives the redirect after a confirm. */}
      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="mb-1.5 block text-caption font-medium text-steel-700">
            {t("searchLabel")}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-steel-300 bg-white px-3.5 py-2.5 text-body text-steel-900 placeholder:text-steel-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>
        <div>
          <label htmlFor="sort" className="mb-1.5 block text-caption font-medium text-steel-700">
            {t("sortLabel")}
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sortKey}
            className="select-field rounded-lg border border-steel-300 bg-white px-3.5 py-2.5 text-body text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          >
            {SORT_KEYS.map((k) => (
              <option key={k} value={k}>
                {t(`sort.${k}`)}
              </option>
            ))}
          </select>
        </div>
        <button className="min-h-11 rounded-lg bg-brand-700 px-5 font-heading text-sm font-semibold text-white transition-colors hover:bg-brand-800">
          {t("applyFilters")}
        </button>
        {isFiltered && (
          <Link
            href="/admin/payments"
            className="flex min-h-11 items-center text-caption font-semibold text-brand-700 hover:underline"
          >
            {t("clearFilters")}
          </Link>
        )}
      </form>

      {isFiltered && (
        <p className="mb-4 text-caption text-steel-500">
          {t("showingCount", { shown: payments.length, total: totalPending })}
        </p>
      )}

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-steel-300 bg-white px-4 py-14 text-center text-caption text-steel-500">
          {isFiltered ? t("noMatches") : t("empty")}
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
                      ${formatUsd(p.amountUsd)}
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
                      {partLabel(p.request)} — {vehicleLabel(p.request)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-steel-100 pb-2">
                    <dt className="text-steel-500">{t("customer")}</dt>
                    <dd className="flex items-center justify-end gap-2 text-end font-medium text-steel-900">
                      {partyName(p.request)}
                      <ChannelBadge request={p.request} />
                    </dd>
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
                      {/* Confirm without leaving the queue. The armed label
                          names the amount, so the second tap is a deliberate
                          confirmation of a specific figure. */}
                      <InlineConfirm
                        label={t("confirm")}
                        armedLabel={t("confirmArmed", { amount: formatUsd(p.amountUsd) })}
                        cancelLabel={tc("cancel")}
                        className="rounded-lg bg-success-600 px-5 py-2.5 font-heading text-sm font-semibold text-white transition-colors hover:bg-success-700"
                      />
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
