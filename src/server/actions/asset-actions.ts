"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getSession, requireRole, ALL_STAFF } from "@/server/auth";
import { assetStorageKey, uploadAsset as putObject, getSignedDownloadUrl, deleteAsset as removeObject } from "@/server/services/storage";
import type { AssetFileType, SharePermission } from "@prisma/client";

const EXTENSION_TO_FILE_TYPE: Record<string, AssetFileType> = {
  cdr: "CDR",
  ai: "AI",
  psd: "PSD",
  pdf: "PDF",
  png: "PNG",
  jpg: "JPG",
  jpeg: "JPG",
};

function inferFileType(fileName: string): AssetFileType {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_FILE_TYPE[ext] ?? "OTHER";
}

/**
 * Takes a raw FormData submission (client components can `action={uploadOrderAsset}`
 * directly on a <form>) rather than a JSON input, since this is the one
 * action that carries file bytes instead of typed fields. Physical bytes go
 * to Supabase/S3 (src/server/services/storage.ts); this row is only the
 * metadata + access-control anchor per schema.prisma's Asset model.
 */
export async function uploadOrderAsset(formData: FormData) {
  const session = requireRole(await getSession(), ALL_STAFF);

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");
  const orderId = (formData.get("orderId") as string | null) || null;
  const inquiryId = (formData.get("inquiryId") as string | null) || null;
  const isRawArtwork = formData.get("isRawArtwork") === "true";

  if (orderId) {
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.pressId !== session.pressId) throw new Error("Order does not belong to your press");
  }

  const storageKey = assetStorageKey(session.pressId, orderId, file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await putObject(storageKey, bytes, file.type || "application/octet-stream");

  const asset = await db.asset.create({
    data: {
      pressId: session.pressId,
      orderId,
      inquiryId,
      fileName: file.name,
      fileType: inferFileType(file.name),
      storageKey,
      sizeBytes: bytes.byteLength,
      isRawArtwork,
      uploadedById: session.userId,
    },
  });

  if (orderId) revalidatePath(`/dashboard/orders/${orderId}`);
  return asset;
}

export async function listOrderAssets(orderId: string) {
  const session = requireRole(await getSession(), ALL_STAFF);
  return db.asset.findMany({
    where: { orderId, pressId: session.pressId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Signs a download link for an asset — either because the caller's own
 * press owns it, or because it's been shared to them via an active
 * PressPartnership (schema.prisma's SharedAsset). This is the enforcement
 * point the storage layer's docstring points at: an expired/revoked share
 * throws here rather than ever reaching getSignedDownloadUrl.
 */
export async function getAssetDownloadUrl(assetId: string): Promise<string> {
  const session = requireRole(await getSession(), ALL_STAFF);
  const asset = await db.asset.findUniqueOrThrow({ where: { id: assetId } });

  if (asset.pressId !== session.pressId) {
    const share = await db.sharedAsset.findFirst({
      where: { assetId, sharedWithPressId: session.pressId, revokedAt: null },
    });
    if (!share) throw new Error("You do not have access to this asset");
    if (share.expiresAt && share.expiresAt < new Date()) throw new Error("This share has expired");
  }

  return getSignedDownloadUrl(asset.storageKey);
}

export async function deleteOrderAsset(assetId: string) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const asset = await db.asset.findUniqueOrThrow({ where: { id: assetId } });
  if (asset.pressId !== session.pressId) throw new Error("Asset does not belong to your press");

  await removeObject(asset.storageKey);
  await db.asset.delete({ where: { id: assetId } });
  if (asset.orderId) revalidatePath(`/dashboard/orders/${asset.orderId}`);
}

/**
 * Hands one asset to a partner press for an outsourced job. Requires an
 * ACTIVE PressPartnership first (see network-actions.ts) — sharing isn't
 * possible by exchanging logins, only by this explicit, revocable grant.
 */
export async function shareAssetWithPartner(input: {
  assetId: string;
  partnershipId: string;
  orderId?: string;
  permission: SharePermission;
  expiresAt?: Date;
}) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const asset = await db.asset.findUniqueOrThrow({ where: { id: input.assetId } });
  if (asset.pressId !== session.pressId) throw new Error("Asset does not belong to your press");

  const partnership = await db.pressPartnership.findUniqueOrThrow({ where: { id: input.partnershipId } });
  if (partnership.status !== "ACTIVE") throw new Error("Partnership is not active");
  const partnerPressId = partnership.pressAId === session.pressId ? partnership.pressBId : partnership.pressAId;
  if (partnership.pressAId !== session.pressId && partnership.pressBId !== session.pressId) {
    throw new Error("This partnership does not involve your press");
  }

  return db.sharedAsset.create({
    data: {
      assetId: asset.id,
      pressPartnershipId: partnership.id,
      sharedByPressId: session.pressId,
      sharedWithPressId: partnerPressId,
      orderId: input.orderId,
      permission: input.permission,
      sharedById: session.userId,
      expiresAt: input.expiresAt,
    },
  });
}

export async function revokeSharedAsset(sharedAssetId: string) {
  const session = requireRole(await getSession(), ALL_STAFF);
  const share = await db.sharedAsset.findUniqueOrThrow({ where: { id: sharedAssetId } });
  if (share.sharedByPressId !== session.pressId) throw new Error("Only the sharing press can revoke this");

  return db.sharedAsset.update({ where: { id: sharedAssetId }, data: { revokedAt: new Date() } });
}
