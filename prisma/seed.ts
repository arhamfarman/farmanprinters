import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Demo press + realistic local print-shop data so `npm run dev` has
 * something to look at without hand-entering a client/catalog/order
 * first. Idempotent-ish via `upsert` on rows with a natural unique key
 * (press/users/client/category) so re-running `db:seed` doesn't pile up
 * duplicates; the sample order and its ledger entry are plain `create`
 * since they don't have one to upsert on.
 */
async function main() {
  const press = await prisma.press.upsert({
    where: { id: "demo-press" },
    update: {},
    create: {
      id: "demo-press",
      name: "Farman Printing Press - Islamabad",
      ntnNumber: "3311234-5",
      headOfficeAddress: "Shop #7, Blue Area, Islamabad",
      branchOfficeAddress: "G-9 Markaz, Islamabad",
      phones: ["051-2345678", "0300-9876543"],
      email: "info@farmanpress.com",
      website: "www.farmanpress.com",
    },
  });

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const owner = await prisma.user.upsert({
    where: { email: "owner@farmanpress.com" },
    update: {},
    create: {
      pressId: press.id,
      name: "Farman Ahmed",
      email: "owner@farmanpress.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "designer@farmanpress.com" },
    update: {},
    create: {
      pressId: press.id,
      name: "Ayesha Khan",
      email: "designer@farmanpress.com",
      passwordHash: await bcrypt.hash("Password123!", 10),
      role: "DESIGNER",
    },
  });

  // The sample NGO client — no portal User row yet on purpose: that's
  // only ever created via grantClientPortalAccess (client-actions.ts),
  // mirroring the real flow of a staff member switching on portal access
  // after onboarding a client, not something seeded for free.
  const client = await prisma.client.upsert({
    where: { id: "demo-client-ngo" },
    update: {},
    create: {
      id: "demo-client-ngo",
      pressId: press.id,
      name: "Zainab Malik",
      companyName: "Society for Education & Development",
      phone: "051-8438822",
      email: "accounts@sed-ngo.org.pk",
      address: "House 12, Street 4, F-7/2, Islamabad",
      city: "Islamabad",
      ntnNumber: "0987654-3",
      openingBalanceMinor: 4_500_000, // PKR 45,000 owed, migrated from the paper ledger
    },
  });

  const printingCategory = await prisma.productCategory.upsert({
    where: { pressId_slug: { pressId: press.id, slug: "panaflex" } },
    update: {},
    create: { pressId: press.id, name: "Panaflex & Banners", slug: "panaflex", sortOrder: 0, iconName: "Image" },
  });
  const awardsCategory = await prisma.productCategory.upsert({
    where: { pressId_slug: { pressId: press.id, slug: "shields" } },
    update: {},
    create: { pressId: press.id, name: "Shields & Awards", slug: "shields", sortOrder: 1, iconName: "Award" },
  });
  const stampsCategory = await prisma.productCategory.upsert({
    where: { pressId_slug: { pressId: press.id, slug: "stamps" } },
    update: {},
    create: { pressId: press.id, name: "Rubber Stamps", slug: "stamps", sortOrder: 2, iconName: "Stamp" },
  });
  const mugsCategory = await prisma.productCategory.upsert({
    where: { pressId_slug: { pressId: press.id, slug: "mugs" } },
    update: {},
    create: { pressId: press.id, name: "Mugs", slug: "mugs", sortOrder: 3, iconName: "Coffee" },
  });
  const idCardsCategory = await prisma.productCategory.upsert({
    where: { pressId_slug: { pressId: press.id, slug: "id-cards" } },
    update: {},
    create: { pressId: press.id, name: "ID Cards", slug: "id-cards", sortOrder: 4, iconName: "IdCard" },
  });
  const stationeryCategory = await prisma.productCategory.upsert({
    where: { pressId_slug: { pressId: press.id, slug: "stationery" } },
    update: {},
    create: { pressId: press.id, name: "Letterheads & Envelopes", slug: "stationery", sortOrder: 5, iconName: "Mail" },
  });

  const [panaflexItem] = await Promise.all([
    prisma.catalogItem.create({
      data: {
        pressId: press.id,
        categoryId: printingCategory.id,
        name: "Panaflex Printing (Frontlit 240gsm)",
        unit: "sq ft",
        defaultRateMinor: 3_500, // PKR 35 / sq ft
      },
    }),
    prisma.catalogItem.create({
      data: {
        pressId: press.id,
        categoryId: awardsCategory.id,
        name: "Custom Acrylic Award / Shield (8 inch)",
        unit: "piece",
        defaultRateMinor: 180_000, // PKR 1,800 / piece
      },
    }),
    prisma.catalogItem.create({
      data: {
        pressId: press.id,
        categoryId: stampsCategory.id,
        name: "Self-Inking Rubber Stamp (Standard Dater)",
        unit: "piece",
        defaultRateMinor: 45_000, // PKR 450 / piece
      },
    }),
    prisma.catalogItem.create({
      data: {
        pressId: press.id,
        categoryId: mugsCategory.id,
        name: "Ceramic Mug Sublimation Printing",
        unit: "piece",
        defaultRateMinor: 55_000, // PKR 550 / piece
      },
    }),
    prisma.catalogItem.create({
      data: {
        pressId: press.id,
        categoryId: idCardsCategory.id,
        name: "Employee ID Card (PVC hard card + Lanyard)",
        unit: "piece",
        defaultRateMinor: 25_000, // PKR 250 / piece
      },
    }),
    prisma.catalogItem.create({
      data: {
        pressId: press.id,
        categoryId: stationeryCategory.id,
        name: "Letterhead / Envelope Printing (Offset 100gsm)",
        unit: "1000 pcs",
        defaultRateMinor: 850_000, // PKR 8,500 / 1000 pcs
      },
    }),
  ]);

  // One sample job so the Kanban board isn't empty — priced off the
  // Panaflex catalog item above rather than a hand-typed rate, the way
  // staff would actually build an order from the price list.
  const order = await prisma.order.create({
    data: {
      pressId: press.id,
      orderNumber: "FPP-JOB-2026-001",
      clientId: client.id,
      categoryId: printingCategory.id,
      title: "20ft x 6ft Event Backdrop Panaflex",
      status: "QUOTATION",
      priority: "NORMAL",
      createdById: owner.id,
      lineItems: {
        create: [
          {
            particulars: panaflexItem.name,
            qty: 120,
            unit: panaflexItem.unit,
            rateMinor: panaflexItem.defaultRateMinor,
            amountMinor: 120 * panaflexItem.defaultRateMinor,
            sortOrder: 0,
          },
        ],
      },
      statusEvents: {
        create: [
          { toStatus: "INQUIRY", changedById: owner.id, note: "Seed data" },
          { fromStatus: "INQUIRY", toStatus: "QUOTATION", changedById: owner.id },
        ],
      },
    },
  });

  await prisma.documentSequence.upsert({
    where: { pressId_documentType_year: { pressId: press.id, documentType: "ORDER", year: new Date().getFullYear() } },
    update: {},
    create: { pressId: press.id, documentType: "ORDER", year: new Date().getFullYear(), lastNumber: 1 },
  });

  // The requested "pending balance of PKR 45,000" as an actual ledger
  // line (not just Client.openingBalanceMinor) so the client ledger page
  // — and the ledger-math test script below — has a real row to read,
  // matching how ledger-actions.ts expects OPENING_BALANCE to be recorded.
  await prisma.clientLedgerEntry.create({
    data: {
      pressId: press.id,
      clientId: client.id,
      entryType: "OPENING_BALANCE",
      debitMinor: 4_500_000,
      runningBalanceMinor: 4_500_000,
      description: "Opening balance migrated from paper ledger",
    },
  });

  console.log(`Seeded press "${press.name}"`);
  console.log(`  Order created against: ${order.orderNumber}`);
  console.log(`  Admin login:    owner@farmanpress.com / Password123!`);
  console.log(`  Designer login: designer@farmanpress.com / Password123!`);
  console.log(`  NGO client "${client.companyName}" opening balance: PKR 45,000`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
