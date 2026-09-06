"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getSession, requireRole, ALL_STAFF } from "@/server/auth";
import { nextDocumentNumber } from "@/server/services/numbering";
import { pressCode } from "@/lib/press-code";
import { sumMinor } from "@/lib/currency";
import {
  createQuotationSchema,
  updateQuotationStatusSchema,
  type CreateQuotationInput,
  type UpdateQuotationStatusInput,
} from "@/lib/validation";

/**
 * Quotations keep their own line-item copy rather than pointing back at
 * OrderLineItem, so a quotation a client already has in hand can't
 * silently change if someone edits the job's scope afterwards — the same
 * reasoning as Invoice/DeliveryChallan (see schema.prisma).
 */
export async function createQuotation(input: CreateQuotationInput) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const data = createQuotationSchema.parse(input);

  const press = await db.press.findUniqueOrThrow({ where: { id: session.pressId } });
  const quotationNumber = await nextDocumentNumber(press.id, pressCode(press.name), "QUOTATION");

  const lineItems = data.lineItems.map((item, sortOrder) => ({
    particulars: item.particulars,
    qty: item.qty,
    rateMinor: item.rateMinor,
    amountMinor: Math.round(item.qty * item.rateMinor),
    sortOrder,
  }));
  const subtotalMinor = sumMinor(lineItems.map((li) => li.amountMinor));
  const totalMinor = subtotalMinor - data.discountMinor + data.taxMinor;

  const quotation = await db.quotation.create({
    data: {
      pressId: session.pressId,
      quotationNumber,
      orderId: data.orderId,
      clientId: data.clientId,
      issueDate: new Date(),
      validUntil: data.validUntil,
      status: "DRAFT",
      subtotalMinor,
      discountMinor: data.discountMinor,
      taxMinor: data.taxMinor,
      totalMinor,
      notes: data.notes,
      createdById: session.userId,
      lineItems: { create: lineItems },
    },
    include: { lineItems: true },
  });

  if (data.orderId) revalidatePath(`/dashboard/orders/${data.orderId}`);
  revalidatePath("/dashboard/quotations");
  return quotation;
}

/** SENT/ACCEPTED/REJECTED/EXPIRED — a client-side signature/acceptance flow can call this from a portal action once wired up. */
export async function updateQuotationStatus(input: UpdateQuotationStatusInput) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const data = updateQuotationStatusSchema.parse(input);

  const quotation = await db.quotation.findUniqueOrThrow({ where: { id: data.quotationId } });
  if (quotation.pressId !== session.pressId) throw new Error("Quotation does not belong to your press");

  const updated = await db.quotation.update({ where: { id: quotation.id }, data: { status: data.status } });
  revalidatePath(`/dashboard/quotations/${quotation.id}`);
  return updated;
}

export async function listQuotations(filters: { clientId?: string; status?: string } = {}) {
  const session = requireRole(await getSession(), ALL_STAFF);
  return db.quotation.findMany({
    where: {
      pressId: session.pressId,
      clientId: filters.clientId,
      status: filters.status ? (filters.status as never) : undefined,
    },
    include: { client: { select: { id: true, name: true, companyName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuotation(quotationId: string) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const quotation = await db.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } }, order: true },
  });
  if (quotation.pressId !== session.pressId) throw new Error("Quotation does not belong to your press");
  return quotation;
}
