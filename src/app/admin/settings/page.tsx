import { getTranslations } from "next-intl/server";
import { getReceivingAccounts, isPlaceholderAccount, methodNeedsSecondField } from "@/lib/payments";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary } from "@/components/ui";
import { updateReceivingAccountAction } from "./actions";

const methodKeyMap: Record<string, string> = {
  FIB: "methodFib",
  FASTPAY: "methodFastpay",
  QICARD: "methodQicard",
};
const ONLINE_METHODS = ["FIB", "FASTPAY", "QICARD"];

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const t = await getTranslations("admin.settings");
  const tp = await getTranslations("payment");
  const te = await getTranslations("errors");

  const accounts = await getReceivingAccounts();
  const byMethod = new Map(accounts.map((a) => [a.method, a]));

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-title font-bold text-steel-900">{t("title")}</h1>
      <p className="mb-6 text-caption text-steel-500">{t("intro")}</p>

      {saved && (
        <p className="mb-4 rounded-lg border-s-4 border-success-600 bg-success-50 px-4 py-2.5 text-caption text-success-700">
          {t("saved")}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border-s-4 border-danger-600 bg-danger-50 px-4 py-2.5 text-caption text-danger-700">
          {te.has(error) ? te(error) : te("generic")}
        </p>
      )}

      <div className="space-y-4">
        {ONLINE_METHODS.map((method) => {
          const typedMethod = method as "FIB" | "FASTPAY" | "QICARD";
          const account = byMethod.get(typedMethod);
          const isPlaceholder = isPlaceholderAccount(account);
          const needsSecond = methodNeedsSecondField(typedMethod);
          return (
            <form
              key={method}
              action={updateReceivingAccountAction}
              className="rounded-2xl border border-steel-200 bg-white p-5"
            >
              <input type="hidden" name="method" value={method} />
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-heading text-body font-bold text-steel-900">
                  {tp(methodKeyMap[method])}
                </h2>
                {isPlaceholder && (
                  <span className="rounded-full bg-accent-50 px-2 py-0.5 font-heading text-overline font-semibold uppercase text-accent-700 ring-1 ring-accent-200">
                    {t("placeholderBadge")}
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-caption font-medium text-steel-700">
                    {t("accountName")}
                  </label>
                  <input
                    name="accountName"
                    required
                    defaultValue={account?.accountName ?? ""}
                    className="w-full rounded-lg border border-steel-300 bg-white px-3.5 py-2.5 text-body text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-caption font-medium text-steel-700">
                    {needsSecond ? tp("qiCardNumber") : t("accountNumber")}
                  </label>
                  <input
                    name="accountNumberOrPhone"
                    required
                    dir="ltr"
                    defaultValue={account?.accountNumberOrPhone ?? ""}
                    className="w-full rounded-lg border border-steel-300 bg-white px-3.5 py-2.5 text-body text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                  />
                </div>
                {needsSecond && (
                  <div>
                    <label className="mb-1.5 block text-caption font-medium text-steel-700">
                      {tp("registeredPhone")}
                    </label>
                    <input
                      name="accountNumberOrPhone2"
                      required
                      dir="ltr"
                      defaultValue={account?.accountNumberOrPhone2 ?? ""}
                      className="w-full rounded-lg border border-steel-300 bg-white px-3.5 py-2.5 text-body text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                    />
                  </div>
                )}
              </div>
              <div className="mt-3 flex justify-end">
                <SubmitButton className={btnPrimary}>
                  {t("save")}
                </SubmitButton>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
