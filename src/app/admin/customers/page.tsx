import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { SuccessDialog } from "@/components/SuccessDialog";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; q?: string }>;
}) {
  const { success, q } = await searchParams;
  const t = await getTranslations("admin.customers");

  const search = q?.trim() ?? "";
  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { requests: true } } },
  });

  return (
    <div>
      {success && <SuccessDialog messageKey={success} redirectTo="/admin/customers" />}
      <h1 className="mb-2 text-title font-bold text-steel-900">{t("title")}</h1>
      <p className="mb-6 text-caption text-steel-500">{t("subtitle")}</p>

      <form className="mb-6 flex gap-2" action="/admin/customers">
        <input
          name="q"
          defaultValue={search}
          placeholder={t("searchPlaceholder")}
          className="w-full max-w-sm rounded-lg border border-steel-300 px-3.5 py-2 text-caption text-steel-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
        />
        <button className="rounded-lg border border-steel-300 bg-white px-4 py-2 font-heading text-caption font-semibold text-steel-700 hover:border-brand-500">
          {t("search")}
        </button>
      </form>

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-steel-300 bg-white px-4 py-14 text-center text-caption text-steel-500">
          {t("empty")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-steel-200 bg-white">
          <table className="w-full text-start text-caption">
            <thead className="bg-steel-100/70">
              <tr>
                {["name", "contact", "requests", "joined", "status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-start font-heading text-overline font-semibold uppercase text-steel-500"
                  >
                    {t(h)}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {customers.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-brand-50/50">
                  <td className="px-4 py-3.5 font-semibold text-steel-900">{c.name}</td>
                  <td className="px-4 py-3.5 text-steel-600" dir="ltr">
                    {c.email ?? c.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-steel-700">{c._count.requests}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-steel-500" dir="ltr">
                    {c.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${
                        c.suspendedAt
                          ? "bg-danger-50 text-danger-700 ring-1 ring-danger-100"
                          : "bg-success-50 text-success-700 ring-1 ring-success-100"
                      }`}
                    >
                      {c.suspendedAt ? t("suspended") : t("active")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-heading font-semibold text-brand-700 hover:underline"
                    >
                      {t("open")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
