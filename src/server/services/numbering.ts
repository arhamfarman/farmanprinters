import type { DocumentType } from "@prisma/client";
import { db } from "@/server/db";

const PREFIX: Record<DocumentType, string> = {
  BILL: "INV",
  QUOTATION: "QUO",
  CHALLAN: "DC",
  ORDER: "JOB",
};

/**
 * Atomically issues the next sequential number for a press + document type
 * + calendar year, e.g. "FPP-INV-2026-001" — continuing the same idea as
 * the printed bill/quotation/challan pads, just per-press instead of
 * per-physical-book. Uses an upsert inside a serializable transaction so
 * two staff finalizing a bill at the same instant never get the same
 * number, which a plain "SELECT max + 1" would risk under concurrency.
 * padStart(3) only pads up to 3 digits — a press writing a 4th-digit's
 * worth of bills in one year (999+) just gets a longer number, nothing
 * is truncated or wraps.
 */
export async function nextDocumentNumber(
  pressId: string,
  pressCode: string,
  documentType: DocumentType,
  date: Date = new Date(),
): Promise<string> {
  const year = date.getFullYear();

  const sequence = await db.$transaction(
    async (tx) => {
      const existing = await tx.documentSequence.findUnique({
        where: { pressId_documentType_year: { pressId, documentType, year } },
      });

      if (existing) {
        return tx.documentSequence.update({
          where: { id: existing.id },
          data: { lastNumber: { increment: 1 } },
        });
      }

      return tx.documentSequence.create({
        data: { pressId, documentType, year, lastNumber: 1 },
      });
    },
    { isolationLevel: "Serializable" },
  );

  const padded = String(sequence.lastNumber).padStart(3, "0");
  return `${pressCode}-${PREFIX[documentType]}-${year}-${padded}`;
}
