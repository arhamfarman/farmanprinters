"use server";

import { db } from "@/server/db";
import { getSession, requireClientSession } from "@/server/auth";
import { getClientLedger } from "@/server/actions/ledger-actions";

/**
 * Client portal's own read path — deliberately separate from the staff
 * `listOrders`/`getOrder` in order-actions.ts (rather than reusing them
 * with an extra flag) so a portal session can never accidentally see
 * another client's rows: every query here is scoped to `clientId` from
 * the session, never a client-supplied id.
 */
export async function listMyOrders() {
  const session = requireClientSession(await getSession());
  return db.order.findMany({
    where: { pressId: session.pressId, clientId: session.clientId },
    include: { lineItems: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getMyOrder(orderId: string) {
  const session = requireClientSession(await getSession());
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      statusEvents: { orderBy: { createdAt: "asc" } },
      challans: { orderBy: { createdAt: "desc" } },
    },
  });
  if (order.clientId !== session.clientId || order.pressId !== session.pressId) {
    throw new Error("Order does not belong to you");
  }
  return order;
}

/** Read-only reuse of the same ledger query the dashboard uses — the portal just can't call recordPayment. */
export async function getMyLedger() {
  const session = requireClientSession(await getSession());
  return getClientLedger(session.clientId);
}

/** Invoice.clientId is direct (not routed through Order), so this doesn't need to join through orders at all. */
export async function getMyInvoices() {
  const session = requireClientSession(await getSession());
  return db.invoice.findMany({
    where: { pressId: session.pressId, clientId: session.clientId },
    orderBy: { issueDate: "desc" },
  });
}
