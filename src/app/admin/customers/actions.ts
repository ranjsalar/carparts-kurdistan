"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_ACTION, logAdminActivity } from "@/lib/admin-activity";
import { normalizePhone } from "@/lib/otp";

const ID_PATTERN = /^[a-z0-9]{10,40}$/i;

function safeId(value: FormDataEntryValue | null): string {
  const id = typeof value === "string" ? value : "";
  if (!ID_PATTERN.test(id)) redirect("/admin/customers");
  return id;
}
function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Statuses that mean the order is still live and money/goods are in motion. */
const ACTIVE_STATUSES = [
  "PENDING",
  "QUOTED",
  "APPROVED",
  "PAID",
  "SOURCING",
  "SHIPPED",
  "ARRIVED",
  "READY",
] as const;

export async function updateCustomerAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = safeId(formData.get("customerId"));
  const name = text(formData, "name");
  const emailRaw = text(formData, "email").toLowerCase();
  const phoneRaw = text(formData, "phone");

  if (!name) redirect(`/admin/customers/${id}?error=nameRequired`);

  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) redirect(`/admin/customers/${id}?error=phoneInvalid`);

  // Uniqueness is enforced by the database too; checking first turns a
  // constraint violation into a readable message.
  if (emailRaw) {
    const clash = await prisma.user.findFirst({ where: { email: emailRaw, NOT: { id } } });
    if (clash) redirect(`/admin/customers/${id}?error=exists`);
  }
  if (phone) {
    const clash = await prisma.user.findFirst({ where: { phone, NOT: { id } } });
    if (clash) redirect(`/admin/customers/${id}?error=phoneExists`);
  }

  const customer = await prisma.user.update({
    where: { id },
    data: { name, email: emailRaw || null, phone },
  });
  await logAdminActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ADMIN_ACTION.customerUpdated,
    summary: `Updated account details for ${customer.name}`,
    targetType: "customer",
    targetId: id,
  });

  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${id}?success=customerUpdated`);
}

/** Suspend or restore sign-in access. Never touches the customer's history. */
export async function toggleSuspendCustomerAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = safeId(formData.get("customerId"));
  const customer = await prisma.user.findUnique({ where: { id } });
  if (!customer || customer.role !== "CUSTOMER") redirect("/admin/customers");

  const suspending = customer.suspendedAt === null;
  await prisma.user.update({
    where: { id },
    data: { suspendedAt: suspending ? new Date() : null },
  });
  await logAdminActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: suspending ? ADMIN_ACTION.customerSuspended : ADMIN_ACTION.customerRestored,
    summary: `${suspending ? "Suspended" : "Restored"} sign-in for ${customer.name}`,
    targetType: "customer",
    targetId: id,
  });

  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  redirect(
    `/admin/customers/${id}?success=${suspending ? "customerSuspended" : "customerRestored"}`,
  );
}

/**
 * Deletes a customer and everything belonging to them.
 *
 * Deliberately BLOCKED while the customer has a live request (anything not
 * COMPLETED or REJECTED). Deleting mid-order would destroy the record of money
 * that has actually changed hands, and the request rows cascade away with the
 * account. Suspension is offered instead, which stops access while keeping the
 * financial history intact. Completed/rejected history can be deleted, and the
 * admin has to type the customer's name to confirm.
 */
export async function deleteCustomerAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = safeId(formData.get("customerId"));
  const customer = await prisma.user.findUnique({
    where: { id },
    include: { requests: { select: { status: true } } },
  });
  if (!customer || customer.role !== "CUSTOMER") redirect("/admin/customers");

  const active = customer.requests.filter((r) =>
    (ACTIVE_STATUSES as readonly string[]).includes(r.status),
  ).length;
  if (active > 0) {
    redirect(`/admin/customers/${id}?error=customerHasActiveRequests`);
  }

  const label = `${customer.name} (${customer.requests.length} historical request(s))`;
  // PartRequest.customerId is a required relation, so the database restricts
  // deleting a user who still has rows there — the requests must go first.
  // Payments and status logs cascade from PartRequest; notifications only null
  // their request link, so they are removed explicitly.
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId: id } }),
    prisma.partRequest.deleteMany({ where: { customerId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  await logAdminActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ADMIN_ACTION.customerDeleted,
    summary: `Deleted customer ${label}`,
    targetType: "customer",
    targetId: id,
  });

  revalidatePath("/admin/customers");
  redirect("/admin/customers?success=customerDeleted");
}
