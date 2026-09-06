"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getSession, requireRole, ALL_STAFF, FINANCE_ROLES } from "@/server/auth";
import { nextDocumentNumber } from "@/server/services/numbering";
import { pressCode } from "@/lib/press-code";
import { sumMinor } from "@/lib/currency";
import { postInvoiceToLedger } from "./ledger-actions";
import {
  createInvoiceSchema,
  voidInvoiceSchema,
  type CreateInvoiceInput,
  type VoidInvoiceInput,
} from "@/lib/validation";

/**
 * Issuing a bill is the one action that touches three tables in one
 * transaction: the Invoice + its line items, the linked Order's status
 * (bumped to INVOICED so the Kanban board reflects it left production),
 * and — via postInvoiceToLedger — a debit on the client's ledger. Doing
 * all three outside a transaction would risk a bill existing with no
 * corresponding ledger entry if the process died in between, which is
 * exactly the kind of silent mismatch the paper ledger books couldn't
 * have (a bill was physically stapled to its ledger line).
 */
export async function createInvoice(input: CreateInvoiceInput) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const data = createInvoiceSchema.parse(input);

  const press = await db.press.findUniqueOrThrow({ where: { id: session.pressId } });
  const invoiceNumber = await nextDocumentNumber(press.id, pressCode(press.name), "BILL");

  const lineItems = data.lineItems.map((item, sortOrder) => ({
    particulars: item.particulars,
    qty: item.qty,
    rateMinor: item.rateMinor,
    amountMinor: Math.round(item.qty * item.rateMinor),
    sortOrder,
  }));
  const subtotalMinor = sumMinor(lineItems.map((li) => li.amountMinor));
  const totalMinor = subtotalMinor - data.discountMinor + data.taxMinor;

  const invoice = await db.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        pressId: session.pressId,
        invoiceNumber,
        orderId: data.orderId,
        clientId: data.clientId,
        issueDate: new Date(),
        status: "UNPAID",
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

    if (data.orderId) {
      await tx.order.update({ where: { id: data.orderId }, data: { status: "INVOICED" } });
      await tx.orderStatusEvent.create({
        data: { orderId: data.orderId, toStatus: "INVOICED", changedById: session.userId, note: `Invoice ${invoiceNumber} issued` },
      });
    }

    return created;
  });

  await postInvoiceToLedger(invoice.id);

  if (data.orderId) revalidatePath(`/dashboard/orders/${data.orderId}`);
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/clients/${data.clientId}/ledger`);
  return invoice;
}

/**
 * Voiding never deletes the row (it's a numbered fiscal document — the
 * physical pad's number stays "used" even if the bill was cancelled) and
 * reverses its ledger debit with an ADJUSTMENT credit rather than editing
 * the original INVOICE entry, keeping the ledger append-only.
 */
export async function voidInvoice(input: VoidInvoiceInput) {
  const session = requireRole(await getSession(), FINANCE_ROLES);
  const data = voidInvoiceSchema.parse(input);

  const invoice = await db.invoice.findUniqueOrThrow({ where: { id: data.invoiceId } });
  if (invoice.pressId !== session.pressId) throw new Error("Invoice does not belong to your press");
  if (invoice.status === "VOID") throw new Error("Invoice is already void");

  await db.$transaction(async (tx) => {
    await tx.invoice.update({ where: { id: invoice.id }, data: { status: "VOID" } });

    const last = await tx.clientLedgerEntry.findFirst({
      where: { pressId: invoice.pressId, clientId: invoice.clientId },
      orderBy: { entryDate: "desc" },
    });
    const balanceBefore = last?.runningBalanceMinor ?? 0;

    await tx.clientLedgerEntry.create({
      data: {
        pressId: invoice.pressId,
        clientId: invoice.clientId,
        entryType: "ADJUSTMENT",
        invoiceId: invoice.id,
        creditMinor: invoice.totalMinor - invoice.amountPaidMinor,
        runningBalanceMinor: balanceBefore - (invoice.totalMinor - invoice.amountPaidMinor),
        description: `Voided invoice ${invoice.invoiceNumber} — ${data.reason}`,
      },
    });
  });

  revalidatePath(`/dashboard/invoices/${invoice.id}`);
  revalidatePath(`/dashboard/clients/${invoice.clientId}/ledger`);
}

export async function listInvoices(filters: { clientId?: string; status?: string } = {}) {
  const session = requireRole(await getSession(), ALL_STAFF);
  return db.invoice.findMany({
    where: {
      pressId: session.pressId,
      clientId: filters.clientId,
      status: filters.status ? (filters.status as never) : undefined,
    },
    include: { client: { select: { id: true, name: true, companyName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoice(invoiceId: string) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      order: true,
    },
  });
  if (invoice.pressId !== session.pressId) throw new Error("Invoice does not belong to your press");
  return invoice;
}
