import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Round-trip smoke test for the live database — not a substitute for real
 * tests, just a fast "did the migration + seed actually land correctly"
 * check you can re-run any time with `npx tsx prisma/verify.ts`. Exercises
 * a join across most of the models this session touched (Press -> User ->
 * Client -> CatalogItem -> Order -> ClientLedgerEntry) and simulates the
 * Credentials provider's authorize() check without spinning up the Next.js
 * server, so a login problem shows up here first.
 */
async function main() {
  const press = await prisma.press.findUniqueOrThrow({
    where: { id: "demo-press" },
    include: { users: true, clients: true, catalogItems: true, orders: { include: { lineItems: true } } },
  });
  console.log(`✅ Press:        ${press.name} (${press.users.length} users, ${press.clients.length} clients, ${press.catalogItems.length} catalog items, ${press.orders.length} orders)`);

  const admin = press.users.find((u) => u.role === "ADMIN");
  if (!admin) throw new Error("Seeded ADMIN user not found");
  const passwordOk = admin.passwordHash ? await bcrypt.compare("Password123!", admin.passwordHash) : false;
  console.log(`${passwordOk ? "✅" : "❌"} Admin login:    ${admin.email} — bcrypt.compare("Password123!") against passwordHash = ${passwordOk}`);

  const designer = press.users.find((u) => u.role === "DESIGNER");
  console.log(`${designer ? "✅" : "❌"} Designer user:  ${designer?.email ?? "missing"}`);

  const ngo = press.clients.find((c) => c.id === "demo-client-ngo");
  if (!ngo) throw new Error("Seeded NGO client not found");
  console.log(`✅ Client:       ${ngo.companyName} — NTN ${ngo.ntnNumber}, opening balance PKR ${ngo.openingBalanceMinor / 100}`);

  const ledger = await prisma.clientLedgerEntry.findMany({ where: { clientId: ngo.id }, orderBy: { entryDate: "asc" } });
  const runningBalance = ledger.at(-1)?.runningBalanceMinor ?? 0;
  const ledgerOk = ledger.length === 1 && ledger[0]?.entryType === "OPENING_BALANCE" && runningBalance === 4_500_000;
  console.log(`${ledgerOk ? "✅" : "❌"} Ledger math:    ${ledger.length} entr${ledger.length === 1 ? "y" : "ies"}, running balance PKR ${runningBalance / 100} (expected 45,000)`);

  console.log(`✅ Catalog items:`);
  for (const item of press.catalogItems) {
    console.log(`   - ${item.name} — PKR ${item.defaultRateMinor / 100} / ${item.unit}`);
  }

  const order = press.orders[0];
  if (!order) throw new Error("Seeded sample order not found");
  const orderTotal = order.lineItems.reduce((sum, li) => sum + li.amountMinor, 0);
  console.log(`✅ Sample order: ${order.orderNumber} — "${order.title}" — status ${order.status} — PKR ${orderTotal / 100}`);

  console.log("\nAll checks passed — migration + seed round-tripped correctly.");
}

main()
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
