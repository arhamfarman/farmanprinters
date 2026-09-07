"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getSession, requireRole, ALL_STAFF } from "@/server/auth";
import { recordPaymentSchema, type RecordPaymentInput } from "@/lib/validation";

/**
 * Every function here appends to ClientLedgerEntry inside a transaction
 * that also carries the running balance forward, so the ledger table can
 * be rendered by reading rows in date order — never by re-summing the
 * whole history on each page load, the way the paper ledger book forced
 * you to add up a column by hand.
 */

/** Shared transaction-client type — lets ledger-writing helpers run either standalone (own transaction) or nested inside a caller's (invoice-actions.ts's createInvoice). */
export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function currentBalance(tx: Tx, pressId: string, clientId: string) {
  const last = await tx.clientLedgerEntry.findFirst({
    where: { pressId, clientId },
    orderBy: { entryDate: "desc" },
  });
  if (last) return last.runningBalanceMinor;

  const client = await tx.client.findUniqueOrThrow({ where: { id: clientId } });
  return client.openingBalanceMinor;
}

/**
 * The actual debit-posting logic, taking an existing transaction client
 * rather than opening its own — so invoice-actions.ts's createInvoice can
 * run "create the Invoice" and "post its ledger debit" as one atomic
 * $transaction. A bill existing with no matching ledger entry (if the
 * process died between two separate transactions) is exactly the silent
 * mismatch the paper ledger books couldn't have — a bill was physically
 * stapled to its ledger line.
 */
export async function postInvoiceToLedgerTx(tx: Tx, invoiceId: string) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const balanceBefore = await currentBalance(tx, invoice.pressId, invoice.clientId);
  const runningBalanceMinor = balanceBefore + invoice.totalMinor;

  return tx.clientLedgerEntry.create({
    data: {
      pressId: invoice.pressId,
      clientId: invoice.clientId,
      entryType: "INVOICE",
      invoiceId: invoice.id,
      debitMinor: invoice.totalMinor,
      runningBalanceMinor,
      description: `Invoice ${invoice.invoiceNumber}`,
      entryDate: invoice.issueDate,
    },
  });
}

/** Standalone entry point for anything that isn't already inside a transaction with the Invoice it's posting for. */
export async function postInvoiceToLedger(invoiceId: string) {
  return db.$transaction((tx) => postInvoiceToLedgerTx(tx, invoiceId));
}

/**
 * Records a payment: creates the Payment row, posts a matching credit to
 * the ledger, and — if it targets a specific invoice — bumps that
 * invoice's amountPaidMinor/status. Partial payments are just a smaller
 * amountMinor; the invoice stays PARTIALLY_PAID until the running total
 * meets its totalMinor.
 */
export async function recordPayment(input: RecordPaymentInput) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const data = recordPaymentSchema.parse(input);

  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        pressId: session.pressId,
        clientId: data.clientId,
        invoiceId: data.invoiceId,
        amountMinor: data.amountMinor,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        receivedById: session.userId,
      },
    });

    const balanceBefore = await currentBalance(tx, session.pressId, data.clientId);
    const runningBalanceMinor = balanceBefore - data.amountMinor;

    await tx.clientLedgerEntry.create({
      data: {
        pressId: session.pressId,
        clientId: data.clientId,
        entryType: "PAYMENT",
        paymentId: payment.id,
        invoiceId: data.invoiceId,
        creditMinor: data.amountMinor,
        runningBalanceMinor,
        description: data.reference ? `Payment (${data.method}) — ${data.reference}` : `Payment (${data.method})`,
      },
    });

    if (data.invoiceId) {
      const invoice = await tx.invoice.update({
        where: { id: data.invoiceId },
        data: { amountPaidMinor: { increment: data.amountMinor } },
      });
      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          status:
            invoice.amountPaidMinor >= invoice.totalMinor
              ? "PAID"
              : invoice.amountPaidMinor > 0
                ? "PARTIALLY_PAID"
                : "UNPAID",
        },
      });
    }

    return payment;
  });

  revalidatePath(`/dashboard/clients/${data.clientId}/ledger`);
  if (data.invoiceId) revalidatePath(`/dashboard/invoices/${data.invoiceId}`);
  return result;
}

/** Ledger page data: rows in date order plus the current balance for the summary cards. */
export async function getClientLedger(clientId: string) {
  const session = requireRole(await getSession(), ALL_STAFF);

  const [client, entries] = await Promise.all([
    db.client.findUniqueOrThrow({ where: { id: clientId } }),
    db.clientLedgerEntry.findMany({
      where: { pressId: session.pressId, clientId },
      orderBy: { entryDate: "asc" },
      include: { invoice: { select: { invoiceNumber: true } }, payment: { select: { method: true } } },
    }),
  ]);

  const currentBalanceMinor = entries.at(-1)?.runningBalanceMinor ?? client.openingBalanceMinor;
  const totalReceivableMinor = entries
    .filter((e) => e.debitMinor > 0)
    .reduce((sum, e) => sum + e.debitMinor, 0);
  const totalPaidMinor = entries.filter((e) => e.creditMinor > 0).reduce((sum, e) => sum + e.creditMinor, 0);

  return { client, entries, currentBalanceMinor, totalReceivableMinor, totalPaidMinor };
}
