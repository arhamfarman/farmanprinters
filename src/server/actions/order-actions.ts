"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getSession, requireRole, ALL_STAFF } from "@/server/auth";
import { nextDocumentNumber } from "@/server/services/numbering";
import { nextAllowedStatuses } from "@/lib/order-status";
import { pressCode } from "@/lib/press-code";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  type CreateOrderInput,
  type UpdateOrderStatusInput,
} from "@/lib/validation";

/**
 * Creates a job order with its initial line items in one transaction, and
 * assigns it the next "FPP-JOB-2026-000123"-style number for the press.
 * Any staff role may create a job (a designer fielding a walk-in, an
 * accountant logging a phone order, etc.) — status changes further down
 * the pipeline are where role restrictions actually bite.
 */
export async function createOrder(input: CreateOrderInput) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const data = createOrderSchema.parse(input);

  const press = await db.press.findUniqueOrThrow({ where: { id: session.pressId } });
  const orderNumber = await nextDocumentNumber(press.id, pressCode(press.name), "ORDER");

  const order = await db.order.create({
    data: {
      pressId: session.pressId,
      orderNumber,
      clientId: data.clientId,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      priority: data.priority,
      createdById: session.userId,
      status: "INQUIRY",
      lineItems: {
        create: data.lineItems.map((item, sortOrder) => ({
          particulars: item.particulars,
          qty: item.qty,
          rateMinor: item.rateMinor,
          amountMinor: Math.round(item.qty * item.rateMinor),
          sortOrder,
        })),
      },
      statusEvents: {
        create: { toStatus: "INQUIRY", changedById: session.userId, note: "Order created" },
      },
    },
    include: { lineItems: true },
  });

  revalidatePath("/dashboard/orders");
  return order;
}

/**
 * Moves an order to the next pipeline stage (or CANCELLED). Rejects a jump
 * that skips stages so the Kanban board can't get the production/delivery
 * trail out of sync with reality — e.g. you can't mark something
 * COMPLETED without it having passed through DELIVERED first.
 */
export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const data = updateOrderStatusSchema.parse(input);

  const order = await db.order.findUniqueOrThrow({ where: { id: data.orderId } });
  if (order.pressId !== session.pressId) {
    throw new Error("Order does not belong to your press");
  }

  const allowed = nextAllowedStatuses(order.status);
  if (!allowed.includes(data.toStatus)) {
    throw new Error(
      `Cannot move an order from ${order.status} to ${data.toStatus}. Allowed next steps: ${allowed.join(", ")}`,
    );
  }

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.order.update({
      where: { id: order.id },
      data: { status: data.toStatus },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: data.toStatus,
        changedById: session.userId,
        note: data.note,
      },
    });
    return next;
  });

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${order.id}`);
  return updated;
}

/** Lists orders for the Kanban/table view, grouped for the board by the caller. */
export async function listOrders(filters: { status?: string; clientId?: string; search?: string } = {}) {
  const session = requireRole(await getSession(), ALL_STAFF);

  return db.order.findMany({
    where: {
      pressId: session.pressId,
      status: filters.status ? (filters.status as never) : undefined,
      clientId: filters.clientId,
      title: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
    },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      lineItems: true,
      designer: { select: { id: true, name: true } },
      productionStaff: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/** Full detail for the order page: line items, status trail, linked documents. */
export async function getOrder(orderId: string) {
  const session = requireRole(await getSession(), ALL_STAFF);

  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      statusEvents: { orderBy: { createdAt: "asc" } },
      quotations: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      challans: { orderBy: { createdAt: "desc" } },
      assets: { orderBy: { createdAt: "desc" } },
      designer: { select: { id: true, name: true } },
      productionStaff: { select: { id: true, name: true } },
    },
  });

  if (order.pressId !== session.pressId) throw new Error("Order does not belong to your press");
  return order;
}
