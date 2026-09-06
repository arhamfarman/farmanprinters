"use server";

import { db } from "@/server/db";
import { getPublicPress } from "@/server/actions/catalog-actions";
import { assetStorageKey, uploadAsset as putObject } from "@/server/services/storage";
import { createInquirySchema } from "@/lib/validation";

/**
 * The one write path in the whole app with no session at all — anyone can
 * submit the public "Request a Quote" form. Takes FormData (not a typed
 * object) because it optionally carries reference-artwork files alongside
 * the text fields; both the Inquiry row and any Asset rows are created
 * here so a staff member converting it to an Order later finds the
 * attachments already linked (see Order.inquirySource in schema.prisma).
 */
export async function createInquiry(formData: FormData) {
  const data = createInquirySchema.parse({
    contactName: formData.get("contactName"),
    companyName: formData.get("companyName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    message: formData.get("message"),
    categoryId: formData.get("categoryId") || undefined,
  });

  const press = await getPublicPress();

  const inquiry = await db.inquiry.create({
    data: {
      pressId: press.id,
      contactName: data.contactName,
      companyName: data.companyName,
      phone: data.phone,
      email: data.email || undefined,
      message: data.message,
      status: "NEW",
    },
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
