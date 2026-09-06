import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Demo press + sample data so `npm run dev` has something to look at
 * without hand-entering a client/order/invoice first. Idempotent-ish via
 * `upsert` on the press/user/client so re-running `db:seed` doesn't pile
 * up duplicates, though orders/invoices are plain `create` since they
 * don't have a natural unique key to upsert on.
 */
async function main() {
  const press = await prisma.press.upsert({
    where: { id: "demo-press" },
    update: {},
    create: {
      id: "demo-press",
      name: "Farman Printing Press",
      ntnNumber: "1234567-8",
      headOfficeAddress: "Shop #12, Urdu Bazar, Lahore",
      branchOfficeAddress: "Main Market, Gulberg, Lahore",
      phones: ["0346-9547770", "0307-7161616"],
      email: "info@farmanprinting.example",
      website: "www.farmanprinting.example",
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);
  const owner = await prisma.user.upsert({
    where: { email: "owner@farmanprinting.example" },
    update: {},
    create: {
      pressId: press.id,
      name: "Farman Ahmed",
      email: "owner@farmanprinting.example",
      passwordHash,
      role: "OWNER_ADMIN",
    },
  });

  const categories = await Promise.all(
    [
      { name: "ID Cards", slug: "id-cards", iconName: "IdCard", sortOrder: 0 },
      { name: "Rubber Stamps", slug: "stamps", iconName: "Stamp", sortOrder: 1 },
      { name: "Shields & Awards", slug: "shields", iconName: "Award", sortOrder: 2 },
      { name: "Panaflex & Banners", slug: "panaflex", iconName: "Image", sortOrder: 3 },
      { name: "Mugs", slug: "mugs", iconName: "Coffee", sortOrder: 4 },
      { name: "Envelopes & Letterheads", slug: "envelopes", iconName: "Mail", sortOrder: 5 },
    ].map((c) =>
      prisma.productCategory.upsert({
        where: { pressId_slug: { pressId: press.id, slug: c.slug } },
        update: {},
        create: { ...c, pressId: press.id },
      }),
    ),
  );

  const idCardsCategory = categories.find((c) => c.slug === "id-cards")!;
  await prisma.serviceItem.createMany({
    data: [
      { pressId: press.id, categoryId: idCardsCategory.id, name: "Employee ID Card - PVC", unit: "pcs", defaultRateMinor: 15000 },
      { pressId: press.id, categoryId: idCardsCategory.id, name: "Employee ID Card - Paper Laminated", unit: "pcs", defaultRateMinor: 8000 },
    ],
    skipDuplicates: true,
  });

  const client = await prisma.client.upsert({
    where: { id: "demo-client" },
    update: {},
    create: {
      id: "demo-client",
      pressId: press.id,
      name: "Ahmed Raza",
      companyName: "Raza Textiles (Pvt) Ltd",
      phone: "0300-1234567",
      city: "Lahore",
      openingBalanceMinor: 0,
    },
  });

  const order = await prisma.order.create({
    data: {
      pressId: press.id,
      orderNumber: "FPP-JOB-2026-000001",
      clientId: client.id,
      categoryId: idCardsCategory.id,
      title: "200x Employee ID Cards",
      status: "INVOICED",
      priority: "NORMAL",
      createdById: owner.id,
      lineItems: {
        create: [
          { particulars: "Employee ID Card - PVC", qty: 200, rateMinor: 15000, amountMinor: 200 * 15000, sortOrder: 0 },
        ],
      },
      statusEvents: {
        create: [
          { toStatus: "INQUIRY", changedById: owner.id, note: "Seed data" },
          { fromStatus: "INQUIRY", toStatus: "QUOTATION", changedById: owner.id },
          { fromStatus: "QUOTATION", toStatus: "DESIGN_APPROVAL", changedById: owner.id },
          { fromStatus: "DESIGN_APPROVAL", toStatus: "IN_PRODUCTION", changedById: owner.id },
          { fromStatus: "IN_PRODUCTION", toStatus: "READY_FOR_DELIVERY", changedById: owner.id },
          { fromStatus: "READY_FOR_DELIVERY", toStatus: "INVOICED", changedById: owner.id },
        ],
      },
    },
  });

  const invoiceTotalMinor = 200 * 15000;
  const invoice = await prisma.invoice.create({
    data: {
      pressId: press.id,
      invoiceNumber: "FPP-BILL-2026-000001",
      orderId: order.id,
      clientId: client.id,
      issueDate: new Date(),
      status: "PARTIALLY_PAID",
      subtotalMinor: invoiceTotalMinor,
      totalMinor: invoiceTotalMinor,
      amountPaidMinor: 1_500_000,
      createdById: owner.id,
      lineItems: {
        create: [
          { particulars: "Employee ID Card - PVC", qty: 200, rateMinor: 15000, amountMinor: invoiceTotalMinor, sortOrder: 0 },
        ],
      },
    },
  });

  await prisma.documentSequence.upsert({
    where: { pressId_documentType_year: { pressId: press.id, documentType: "BILL", year: new Date().getFullYear() } },
    update: {},
    create: { pressId: press.id, documentType: "BILL", year: new Date().getFullYear(), lastNumber: 1 },
  });
  await prisma.documentSequence.upsert({
    where: { pressId_documentType_year: { pressId: press.id, documentType: "ORDER", year: new Date().getFullYear() } },
    update: {},
    create: { pressId: press.id, documentType: "ORDER", year: new Date().getFullYear(), lastNumber: 1 },
  });

  await prisma.clientLedgerEntry.create({
    data: {
      pressId: press.id,
      clientId: client.id,
      entryType: "INVOICE",
      invoiceId: invoice.id,
      debitMinor: invoiceTotalMinor,
      runningBalanceMinor: invoiceTotalMinor,
      description: `Invoice ${invoice.invoiceNumber}`,
      entryDate: invoice.issueDate,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      pressId: press.id,
      clientId: client.id,
      invoiceId: invoice.id,
      amountMinor: 1_500_000,
      method: "BANK_TRANSFER",
      receivedById: owner.id,
    },
  });

  await prisma.clientLedgerEntry.create({
    data: {
      pressId: press.id,
      clientId: client.id,
      entryType: "PAYMENT",
      invoiceId: invoice.id,
      paymentId: payment.id,
      creditMinor: 1_500_000,
      runningBalanceMinor: invoiceTotalMinor - 1_500_000,
      description: "Payment (BANK_TRANSFER)",
    },
  });

  console.log(`Seeded press "${press.name}" — sign in as ${owner.email} / password123`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
