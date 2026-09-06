"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getSession, requireRole, ALL_STAFF } from "@/server/auth";
import { nextDocumentNumber } from "@/server/services/numbering";
import { pressCode } from "@/lib/press-code";
import {
  createChallanSchema,
  markChallanDeliveredSchema,
  type CreateChallanInput,
  type MarkChallanDeliveredInput,
} from "@/lib/validation";

/**
 * A Delivery Challan has no Rate/Amount columns (see schema.prisma) — it's
 * a goods-received slip printed when a job physically leaves the press,
 * not a billing document, so creating one never touches the ledger the
 * way createInvoice does.
 */
export async function createChallan(input: CreateChallanInput) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const data = createChallanSchema.parse(input);

  const press = await db.press.findUniqueOrThrow({ where: { id: session.pressId } });
  const challanNumber = await nextDocumentNumber(press.id, pressCode(press.name), "CHALLAN");

  const challan = await db.deliveryChallan.create({
    data: {
      pressId: session.pressId,
      challanNumber,
      orderId: data.orderId,
      clientId: data.clientId,
      issueDate: new Date(),
      status: "PENDING",
      notes: data.notes,
      items: {
        create: data.items.map((item, sortOrder) => ({
          particulars: item.particulars,
          quantity: item.quantity,
          sortOrder,
        })),
      },
    },
    include: { items: true },
  });

  if (data.orderId) {
    await db.order.update({ where: { id: data.orderId }, data: { status: "READY_FOR_DELIVERY" } });
    revalidatePath(`/dashboard/orders/${data.orderId}`);
  }
  revalidatePath("/dashboard/challans");
  return challan;
}

/** Records the physical handoff — the two signature lines on the pad. */
export async function markChallanDelivered(input: MarkChallanDeliveredInput) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const data = markChallanDeliveredSchema.parse(input);

  const challan = await db.deliveryChallan.findUniqueOrThrow({ where: { id: data.challanId } });
  if (challan.pressId !== session.pressId) throw new Error("Challan does not belong to your press");

  const updated = await db.deliveryChallan.update({
    where: { id: challan.id },
    data: { status: "DELIVERED", deliveredBy: data.deliveredBy, receivedBy: data.receivedBy },
  });

  revalidatePath(`/dashboard/challans/${challan.id}`);
  return updated;
}

export async function listChallans(filters: { clientId?: string; status?: string } = {}) {
  const session = requireRole(await getSession(), ALL_STAFF);
  return db.deliveryChallan.findMany({
    where: {
      pressId: session.pressId,
      clientId: filters.clientId,
      status: filters.status ? (filters.status as never) : undefined,
    },
    include: { client: { select: { id: true, name: true, companyName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getChallan(challanId: string) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const challan = await db.deliveryChallan.findUniqueOrThrow({
    where: { id: challanId },
    include: { client: true, items: { orderBy: { sortOrder: "asc" } }, order: true },
  });
  if (challan.pressId !== session.pressId) throw new Error("Challan does not belong to your press");
  return challan;
}
