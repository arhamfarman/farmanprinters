import type { OrderStatus } from "@prisma/client";

/**
 * Single source of truth for the Kanban pipeline: order, label, and color
 * live here so the board, the table view, and the status badge can't drift
 * out of sync with each other.
 */
export const ORDER_PIPELINE: { status: OrderStatus; label: string; colorClass: string }[] = [
  { status: "INQUIRY", label: "Inquiry", colorClass: "bg-slate-100 text-slate-700" },
  { status: "QUOTATION", label: "Quotation", colorClass: "bg-amber-100 text-amber-800" },
  { status: "DESIGN_APPROVAL", label: "Design Approval", colorClass: "bg-violet-100 text-violet-800" },
  { status: "IN_PRODUCTION", label: "In Production", colorClass: "bg-blue-100 text-blue-800" },
  { status: "READY_FOR_DELIVERY", label: "Ready for Delivery", colorClass: "bg-cyan-100 text-cyan-800" },
  { status: "INVOICED", label: "Invoiced", colorClass: "bg-orange-100 text-orange-800" },
  { status: "COMPLETED", label: "Completed", colorClass: "bg-emerald-100 text-emerald-800" },
];

// CANCELLED is deliberately excluded from the board columns — it's a
// terminal state surfaced via a filter/badge instead of a column, so a
// dead job doesn't permanently occupy pipeline real estate.
export const CANCELLED_STATUS: OrderStatus = "CANCELLED";

export function statusLabel(status: OrderStatus): string {
  if (status === CANCELLED_STATUS) return "Cancelled";
  return ORDER_PIPELINE.find((s) => s.status === status)?.label ?? status;
}

export function statusColorClass(status: OrderStatus): string {
  if (status === CANCELLED_STATUS) return "bg-red-100 text-red-800";
  return ORDER_PIPELINE.find((s) => s.status === status)?.colorClass ?? "bg-slate-100 text-slate-700";
}

/** Enforces the pipeline can only move forward one stage at a time from the board (or be cancelled). */
export function nextAllowedStatuses(current: OrderStatus): OrderStatus[] {
  const idx = ORDER_PIPELINE.findIndex((s) => s.status === current);
  if (idx === -1) return [];
  const next = ORDER_PIPELINE[idx + 1];
  return [...(next ? [next.status] : []), CANCELLED_STATUS];
}
