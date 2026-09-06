"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getSession, requireRole, ALL_STAFF, FINANCE_ROLES } from "@/server/auth";
import {
  createClientSchema,
  grantClientPortalAccessSchema,
  type CreateClientInput,
  type GrantClientPortalAccessInput,
} from "@/lib/validation";

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

/**
 * The only way a CLIENT-role User row ever gets created (see
 * auth-options.ts: the Email provider's Adapter has createUser disabled,
 * so an unprovisioned email can never sign itself up). Finance-gated
 * since it's effectively granting account access, the same trust level as
 * recording a payment.
 */
export async function grantClientPortalAccess(input: GrantClientPortalAccessInput) {
  const session = requireRole(await getSession(), FINANCE_ROLES);
  const data = grantClientPortalAccessSchema.parse(input);

  const client = await db.client.findUniqueOrThrow({ where: { id: data.clientId } });
  if (client.pressId !== session.pressId) throw new Error("Client does not belong to your press");

  const user = await db.user.create({
    data: {
      pressId: session.pressId,
      clientId: client.id,
      name: data.name,
      email: data.email,
      role: "CLIENT",
      // passwordHash stays null on purpose — CLIENT accounts sign in via
      // the Email (magic-link) provider only, never Credentials.
    },
  });

  revalidatePath(`/dashboard/clients/${client.id}/ledger`);
  return user;
}
