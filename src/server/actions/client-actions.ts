"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getSession, requireRole, ALL_STAFF } from "@/server/auth";
import { createClientSchema, type CreateClientInput } from "@/lib/validation";

/**
 * openingBalanceMinor seeds the ledger for a client migrated from the
 * paper books — recordPayment/postInvoiceToLedger (ledger-actions.ts) fall
 * back to it as the starting balance whenever no ClientLedgerEntry exists
 * yet, so a brand-new digital client with prior paper history isn't
 * misread as starting from zero.
 */
export async function createClient(input: CreateClientInput) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const data = createClientSchema.parse(input);

  const client = await db.client.create({
    data: { ...data, email: data.email || undefined, pressId: session.pressId },
  });

  revalidatePath("/dashboard/clients");
  return client;
}

export async function listClients(search?: string) {
  const session = requireRole(await getSession(), ALL_STAFF);
  return db.client.findMany({
    where: {
      pressId: session.pressId,
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { companyName: { contains: search, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getClient(clientId: string) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  if (client.pressId !== session.pressId) throw new Error("Client does not belong to your press");
  return client;
}
