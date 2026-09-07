import { PrismaClient } from "@prisma/client";
import { createInquiry } from "@/server/actions/inquiry-actions";
import { postInvoiceToLedgerTx } from "@/server/actions/ledger-actions";
import { nextDocumentNumber } from "@/server/services/numbering";

const prisma = new PrismaClient();

/**
 * Genuine live round-trip test, not just a static build/typecheck pass —
 * calls the actual production code paths (createInquiry has no auth gate
 * so it can be called directly; the auth-gated createInvoice's core logic
 * is replicated here using the same exported postInvoiceToLedgerTx helper
 * it calls, since faking a NextAuth session outside a real HTTP request
 * isn't practical). Creates real rows against the live Supabase DB, then
 * deletes everything it created in a `finally` block — safe to re-run any
 * time without leaving test data behind.
 */
async function main() {
  const press = await prisma.press.findUniqueOrThrow({ where: { id: "demo-press" } });
  const client = await prisma.client.findUniqueOrThrow({ where: { id: "demo-client-ngo" } });
  const panaflex = await prisma.catalogItem.findFirstOrThrow({ where: { pressId: press.id, name: { contains: "Panaflex" } } });

  let inquiryId: string | undefined;
  let invoiceId: string | undefined;
  let ledgerEntryId: string | undefined;

  try {
    // --- 1. Public Inquiry form -> live Order-pipeline-adjacent Inquiry record ---
    const formData = new FormData();
    formData.set("contactName", "[verify-e2e] Test Contact");
    formData.set("email", "verify-e2e@example.com");
    formData.set("message", "");
    formData.set("items", JSON.stringify([{ catalogItemId: panaflex.id, quantity: 15, notes: "10ft x 1.5ft banner" }]));

    const inquiry = await createInquiry(formData);
    inquiryId = inquiry.id;

    const inquiryCheck = await prisma.inquiry.findUniqueOrThrow({
      where: { id: inquiry.id },
      include: { items: { include: { catalogItem: true } } },
    });
    const inquiryOk = inquiryCheck.items.length === 1 && inquiryCheck.items[0]?.catalogItem.id === panaflex.id;
    console.log(`${inquiryOk ? "✅" : "❌"} Public inquiry:  created Inquiry ${inquiry.id} with ${inquiryCheck.items.length} item(s) — ${inquiryCheck.items[0]?.quantity} ${panaflex.unit} of "${panaflex.name}"`);

    // --- 2. Invoice creation + ledger posting, atomically, live ---
    const balanceBefore = (
      await prisma.clientLedgerEntry.findFirst({ where: { pressId: press.id, clientId: client.id }, orderBy: { entryDate: "desc" } })
    )?.runningBalanceMinor ?? client.openingBalanceMinor;

    const qty = 15;
    const amountMinor = qty * panaflex.defaultRateMinor;
    const invoiceNumber = await nextDocumentNumber(press.id, "FPP", "BILL");

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          pressId: press.id,
          invoiceNumber,
          clientId: client.id,
          issueDate: new Date(),
          status: "UNPAID",
          subtotalMinor: amountMinor,
          totalMinor: amountMinor,
          notes: "[verify-e2e] temporary test invoice",
          lineItems: { create: [{ particulars: panaflex.name, qty, rateMinor: panaflex.defaultRateMinor, amountMinor, sortOrder: 0 }] },
        },
      });
      await postInvoiceToLedgerTx(tx, created.id);
      return created;
    });
    invoiceId = invoice.id;

    const ledgerEntry = await prisma.clientLedgerEntry.findFirstOrThrow({ where: { invoiceId: invoice.id } });
    ledgerEntryId = ledgerEntry.id;

    const expectedBalance = balanceBefore + amountMinor;
    const ledgerOk = ledgerEntry.debitMinor === amountMinor && ledgerEntry.runningBalanceMinor === expectedBalance;
    console.log(
      `${ledgerOk ? "✅" : "❌"} Invoice+Ledger: ${invoice.invoiceNumber} for PKR ${amountMinor / 100} — ` +
        `balance PKR ${balanceBefore / 100} -> PKR ${ledgerEntry.runningBalanceMinor / 100} (expected PKR ${expectedBalance / 100})`,
    );

    if (!inquiryOk || !ledgerOk) throw new Error("One or more live round-trip checks failed — see ❌ above");
    console.log("\nAll live round-trip checks passed against the Supabase database.");
  } finally {
    // Clean up — this script must leave the live DB exactly as it found it.
    if (ledgerEntryId) await prisma.clientLedgerEntry.delete({ where: { id: ledgerEntryId } }).catch(() => {});
    if (invoiceId) await prisma.invoice.delete({ where: { id: invoiceId } }).catch(() => {});
    if (inquiryId) await prisma.inquiry.delete({ where: { id: inquiryId } }).catch(() => {});
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Live verification failed:", error);
  process.exit(1);
});
