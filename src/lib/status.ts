import type { RequestStatus } from "@/generated/prisma/enums";

export const statusLabels: Record<RequestStatus, string> = {
  PENDING: "Pending quote",
  QUOTED: "Quote ready",
  APPROVED: "Approved",
  REJECTED: "Quote rejected",
  PAID: "Paid",
  SOURCING: "Ordering from supplier",
  SHIPPED: "Shipped",
  ARRIVED: "Arrived in Kurdistan",
  READY: "Ready for pickup/delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Badge colors on the design tokens: amber = waiting on someone, petrol =
// moving through the pipeline, green = money/finish, neutral/red = closed.
export const statusBadgeClasses: Record<RequestStatus, string> = {
  PENDING: "bg-accent-50 text-accent-700 ring-1 ring-accent-200",
  QUOTED: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
  APPROVED: "bg-brand-100 text-brand-800 ring-1 ring-brand-200",
  REJECTED: "bg-steel-100 text-steel-600 ring-1 ring-steel-200",
  PAID: "bg-success-50 text-success-700 ring-1 ring-success-100",
  SOURCING: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
  SHIPPED: "bg-brand-100 text-brand-800 ring-1 ring-brand-200",
  ARRIVED: "bg-brand-200 text-brand-900 ring-1 ring-brand-300",
  READY: "bg-accent-50 text-accent-700 ring-1 ring-accent-200",
  COMPLETED: "bg-success-50 text-success-700 ring-1 ring-success-100",
  CANCELLED: "bg-danger-50 text-danger-700 ring-1 ring-danger-100",
};
