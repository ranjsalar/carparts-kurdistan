import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { statusBadgeClasses } from "@/lib/status";
import { formatUsd } from "@/lib/format";
import { computePaymentState } from "@/lib/payments";
import { partLabel, vehicleLabel } from "@/lib/request-display";
import { SubmitButton } from "@/components/SubmitButton";
import { SuccessDialog } from "@/components/SuccessDialog";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import {
  deleteCustomerAction,
  toggleSuspendCustomerAction,
  updateCustomerAction,
} from "../actions";

const ACTIVE_STATUSES = [
  "PENDING",
  "QUOTED",
  "APPROVED",
  "PAID",
  "SOURCING",
  "SHIPPED",
  "ARRIVED",
  "READY",
];

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { id } = await params;
  const { success, error } = await searchParams;
  const t = await getTranslations("admin.customers");
  const ts = await getTranslations("statuses");
  const te = await getTranslations("errors");
  const tc = await getTranslations("common");

  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      requests: {
        orderBy: { createdAt: "desc" },
        include: { brand: true, carModel: true, yearRange: true, trim: true, part: true, payments: true },
      },
    },
  });
  if (!customer || customer.role !== "CUSTOMER") notFound();

  const activeCount = customer.requests.filter((r) => ACTIVE_STATUSES.includes(r.status)).length;
  const lifetimePaid = customer.requests.reduce((sum, r) => {
    return sum + computePaymentState(r.priceUsd, r.payments).confirmedCents;
  }, 0);
  const suspended = customer.suspendedAt !== null;

  const field =
    "w-full rounded-lg border border-steel-300 bg-white px-3.5 py-2.5 text-body text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15";

  return (
    <div>
      {success && (
        <SuccessDialog messageKey={success} redirectTo={`/admin/customers/${id}`} />
      )}
      <Link
        href="/admin/customers"
        className="-ms-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-brand-700 hover:bg-steel-100 hover:underline"
      >
        ← {t("backToList")}
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title font-bold text-steel-900">{customer.name}</h1>
        <span
          className={`rounded-full px-3 py-1 font-heading text-overline font-semibold uppercase ${
            suspended
              ? "bg-danger-50 text-danger-700 ring-1 ring-danger-100"
              : "bg-success-50 text-success-700 ring-1 ring-success-100"
          }`}
        >
          {suspended ? t("suspended") : t("active")}
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
          {te.has(error) ? te(error) : te("generic")}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Order history */}
          <section className="rounded-2xl border border-steel-200 bg-white p-5">
            <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">
              {t("orderHistory")}
            </h2>
            {customer.requests.length === 0 ? (
              <p className="text-caption text-steel-500">{t("noRequests")}</p>
            ) : (
              <ul className="divide-y divide-steel-100">
                {customer.requests.map((r) => {
                  const pay = computePaymentState(r.priceUsd, r.payments);
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${statusBadgeClasses[r.status]}`}
                      >
                        {ts(r.status)}
                      </span>
                      <span className="text-caption text-steel-900">
                        {partLabel(r)}{" "}
                        <span className="text-steel-500">
                          — {vehicleLabel(r)}
                        </span>
                      </span>
                      <span className="ms-auto text-caption text-steel-700" dir="ltr">
                        {r.priceUsd !== null ? `$${formatUsd(r.priceUsd)}` : "—"}
                        {pay.confirmedCents > 0 && (
                          <span className="ms-2 text-success-700">
                            {t("paidShort")} ${pay.confirmed}
                          </span>
                        )}
                      </span>
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="text-caption font-semibold text-brand-700 hover:underline"
                      >
                        {t("open")}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Edit details */}
          <section className="rounded-2xl border border-steel-200 bg-white p-5">
            <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">
              {t("editDetails")}
            </h2>
            <form action={updateCustomerAction} className="space-y-3">
              <input type="hidden" name="customerId" value={customer.id} />
              <div>
                <label className="mb-1.5 block text-caption font-medium text-steel-700">
                  {t("name")}
                </label>
                <input name="name" required defaultValue={customer.name} className={field} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-caption font-medium text-steel-700">
                    {t("email")}
                  </label>
                  <input
                    name="email"
                    type="email"
                    dir="ltr"
                    defaultValue={customer.email ?? ""}
                    className={field}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-caption font-medium text-steel-700">
                    {t("phone")}
                  </label>
                  <input
                    name="phone"
                    dir="ltr"
                    defaultValue={customer.phone ?? ""}
                    className={field}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <SubmitButton className="rounded-lg bg-brand-700 px-5 py-2.5 font-heading text-sm font-semibold text-white hover:bg-brand-800">
                  {tc("save")}
                </SubmitButton>
              </div>
            </form>
          </section>
        </div>

        {/* Summary + account actions */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-steel-200 bg-white p-5">
            <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">
              {t("summary")}
            </h2>
            <dl className="space-y-2 text-caption">
              <div className="flex justify-between gap-3">
                <dt className="text-steel-500">{t("requests")}</dt>
                <dd className="font-semibold text-steel-900">{customer.requests.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-steel-500">{t("activeRequests")}</dt>
                <dd className="font-semibold text-steel-900">{activeCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-steel-500">{t("lifetimePaid")}</dt>
                <dd className="font-semibold text-success-700" dir="ltr">
                  ${(lifetimePaid / 100).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-steel-500">{t("joined")}</dt>
                <dd className="font-semibold text-steel-900" dir="ltr">
                  {customer.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-steel-200 bg-white p-5">
            <h2 className="mb-3 font-heading text-overline font-semibold uppercase text-steel-500">
              {t("accountActions")}
            </h2>

            <form action={toggleSuspendCustomerAction}>
              <input type="hidden" name="customerId" value={customer.id} />
              <ConfirmSubmit
                label={suspended ? t("restore") : t("suspend")}
                title={suspended ? t("restoreTitle") : t("suspendTitle")}
                body={suspended ? t("restoreBody") : t("suspendBody")}
                confirmLabel={suspended ? t("restore") : t("suspend")}
                danger={!suspended}
                className="w-full rounded-lg border border-steel-300 bg-white px-4 py-2.5 font-heading text-sm font-semibold text-steel-700 hover:border-brand-500"
              />
            </form>
            <p className="mt-2 text-overline text-steel-500">{t("suspendHint")}</p>

            <div className="mt-5 border-t border-steel-100 pt-5">
              {activeCount > 0 ? (
                <>
                  <button
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-steel-200 bg-steel-100 px-4 py-2.5 font-heading text-sm font-semibold text-steel-400"
                  >
                    {t("delete")}
                  </button>
                  <p className="mt-2 text-overline text-danger-700">
                    {t("deleteBlocked", { count: activeCount })}
                  </p>
                </>
              ) : (
                <>
                  <form action={deleteCustomerAction}>
                    <input type="hidden" name="customerId" value={customer.id} />
                    <ConfirmSubmit
                      label={t("delete")}
                      title={t("deleteTitle")}
                      body={t("deleteBody", { count: customer.requests.length })}
                      confirmLabel={t("delete")}
                      danger
                      requireTypedText={customer.name}
                      className="w-full rounded-lg border border-steel-300 bg-white px-4 py-2.5 font-heading text-sm font-semibold text-danger-600 hover:border-danger-600 hover:bg-danger-50"
                    />
                  </form>
                  <p className="mt-2 text-overline text-steel-500">{t("deleteHint")}</p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
