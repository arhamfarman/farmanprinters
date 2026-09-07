"use server";

import { db } from "@/server/db";
import { getPublicPress } from "@/server/actions/catalog-actions";
import { assetStorageKey, uploadAsset as putObject } from "@/server/services/storage";
import { createInquirySchema } from "@/lib/validation";

/**
 * The one write path in the whole app with no session at all — anyone can
 * submit the public "Request a Quote" form. Takes FormData (not a typed
 * object) because it carries reference-artwork files and a JSON-encoded
 * `items` field (repeating catalog-item selections don't map cleanly onto
 * flat form fields) alongside the plain text ones.
 *
 * Deliberately creates an `Inquiry`, never an `Order` directly — Order is
 * the RBAC-gated production/billing pipeline (every mutation in
 * order-actions.ts requires ALL_STAFF), and letting anonymous public
 * traffic write straight into it would mean anyone on the internet can
 * post rows onto the staff Kanban board with no qualification step. A
 * staff member reviews the Inquiry (+ its items/attachments) and converts
 * it to an Order once there's a matched Client and a sanity-checked scope
 * — see Order.inquirySource / Inquiry.convertedOrderId in schema.prisma.
 * (Conversion itself isn't wired up yet — tracked in PROJECT_CONTEXT.md.)
 */
export async function createInquiry(formData: FormData) {
  const rawItems = formData.get("items");
  let parsedItems: unknown = [];
  if (typeof rawItems === "string" && rawItems.trim().length > 0) {
    try {
      parsedItems = JSON.parse(rawItems);
    } catch {
      throw new Error("Malformed item selection");
    }
  }

  const data = createInquirySchema.parse({
    contactName: formData.get("contactName"),
    companyName: formData.get("companyName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    message: formData.get("message"),
    categoryId: formData.get("categoryId") || undefined,
    items: parsedItems,
  });

  const press = await getPublicPress();

  // Validate every selected catalog item actually belongs to this press
  // before writing — a forged catalogItemId shouldn't silently succeed or
  // (worse) attach another press's item to this press's inquiry.
  if (data.items.length > 0) {
    const validCount = await db.catalogItem.count({
      where: { pressId: press.id, id: { in: data.items.map((i) => i.catalogItemId) } },
    });
    if (validCount !== new Set(data.items.map((i) => i.catalogItemId)).size) {
      throw new Error("One or more selected items are invalid");
    }
  }

  const inquiry = await db.inquiry.create({
    data: {
      pressId: press.id,
      contactName: data.contactName,
      companyName: data.companyName,
      phone: data.phone,
      email: data.email || undefined,
      message: data.message,
      status: "NEW",
      items: {
        create: data.items.map((item, sortOrder) => ({
          catalogItemId: item.catalogItemId,
          quantity: item.quantity,
          notes: item.notes,
          sortOrder,
        })),
      },
    },
    include: { items: { include: { catalogItem: true } } },
  });

  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    const storageKey = assetStorageKey(press.id, null, file.name);
    const bytes = Buffer.from(await file.arrayBuffer());
    await putObject(storageKey, bytes, file.type || "application/octet-stream");
    await db.asset.create({
      data: {
        pressId: press.id,
        inquiryId: inquiry.id,
        fileName: file.name,
        fileType: "OTHER",
        storageKey,
        sizeBytes: bytes.byteLength,
        isRawArtwork: true,
      },
    });
  }

  return inquiry;
}
