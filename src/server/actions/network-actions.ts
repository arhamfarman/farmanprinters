"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getSession, requireRole, ALL_STAFF, FINANCE_ROLES } from "@/server/auth";

/**
 * Two presses become collaborators via PressPartnership (PENDING -> ACTIVE),
 * never by sharing logins — this is what SharedAsset (asset-actions.ts)
 * checks before signing a download link for an outsourced job's files.
 */
export async function requestPartnership(partnerPressId: string) {
  const session = requireRole(await getSession(), FINANCE_ROLES);
  if (partnerPressId === session.pressId) throw new Error("A press cannot partner with itself");

  const partnership = await db.pressPartnership.create({
    data: { pressAId: session.pressId, pressBId: partnerPressId, status: "PENDING" },
  });
  revalidatePath("/dashboard/network");
  return partnership;
}

export async function acceptPartnership(partnershipId: string) {
  const session = requireRole(await getSession(), FINANCE_ROLES);
  const partnership = await db.pressPartnership.findUniqueOrThrow({ where: { id: partnershipId } });
  if (partnership.pressAId !== session.pressId && partnership.pressBId !== session.pressId) {
    throw new Error("This partnership does not involve your press");
  }

  const updated = await db.pressPartnership.update({ where: { id: partnershipId }, data: { status: "ACTIVE" } });
  revalidatePath("/dashboard/network");
  return updated;
}

export async function revokePartnership(partnershipId: string) {
  const session = requireRole(await getSession(), FINANCE_ROLES);
  const partnership = await db.pressPartnership.findUniqueOrThrow({ where: { id: partnershipId } });
  if (partnership.pressAId !== session.pressId && partnership.pressBId !== session.pressId) {
    throw new Error("This partnership does not involve your press");
  }

  const updated = await db.pressPartnership.update({ where: { id: partnershipId }, data: { status: "REVOKED" } });
  revalidatePath("/dashboard/network");
  return updated;
}

/** Partnerships this press is party to, plus what's been shared each direction — the data for the Network page. */
export async function listNetwork() {
  const session = requireRole(await getSession(), ALL_STAFF);

  const partnerships = await db.pressPartnership.findMany({
    where: { OR: [{ pressAId: session.pressId }, { pressBId: session.pressId }] },
    include: { pressA: { select: { id: true, name: true } }, pressB: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const sharedByMe = await db.sharedAsset.findMany({
    where: { sharedByPressId: session.pressId, revokedAt: null },
    include: { asset: { select: { fileName: true } }, sharedWithPress: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const sharedWithMe = await db.sharedAsset.findMany({
    where: { sharedWithPressId: session.pressId, revokedAt: null },
    include: { asset: { select: { fileName: true } }, sharedByPress: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return { partnerships, sharedByMe, sharedWithMe };
}
