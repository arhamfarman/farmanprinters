import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/server/db";
import { BillPdf } from "@/components/documents/BillPdf";
import { QuotationPdf } from "@/components/documents/QuotationPdf";
import { ChallanPdf } from "@/components/documents/ChallanPdf";
import type { Session } from "@/server/auth";

const PRESS_SELECT = {
  name: true,
  ntnNumber: true,
  headOfficeAddress: true,
  branchOfficeAddress: true,
  phones: true,
  email: true,
  website: true,
} as const;

/** A staff session may fetch any document in its press; a CLIENT session only its own client's documents. */
function assertAccess(session: Session, doc: { pressId: string; clientId: string }) {
  if (doc.pressId !== session.pressId) throw new Error("Document does not belong to your press");
  if (session.role === "CLIENT" && doc.clientId !== session.clientId) {
    throw new Error("Document does not belong to you");
  }
}

/**
 * Fetches one document + its press/client/line items and renders it to a
 * PDF buffer — the only place that turns a DB row into printable bytes, so
 * api/documents/[type]/[id]/pdf/route.ts stays a thin auth-then-stream
 * wrapper. Each function re-checks ownership itself (rather than trusting
 * the caller already did) since this is reachable by both a staff session
 * (any document in its press) and a CLIENT portal session (only its own).
 */
export async function renderInvoicePdf(invoiceId: string, session: Session): Promise<Buffer> {
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { client: true, press: { select: PRESS_SELECT } , lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  assertAccess(session, invoice);

  return renderToBuffer(
    BillPdf({
      press: invoice.press,
      invoice,
      client: invoice.client,
      lineItems: invoice.lineItems,
    }),
  );
}

export async function renderQuotationPdf(quotationId: string, session: Session): Promise<Buffer> {
  const quotation = await db.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { client: true, press: { select: PRESS_SELECT }, lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  assertAccess(session, quotation);

  return renderToBuffer(
    QuotationPdf({
      press: quotation.press,
      quotation,
      client: quotation.client,
      lineItems: quotation.lineItems,
    }),
  );
}

export async function renderChallanPdf(challanId: string, session: Session): Promise<Buffer> {
  const challan = await db.deliveryChallan.findUniqueOrThrow({
    where: { id: challanId },
    include: { client: true, press: { select: PRESS_SELECT }, items: { orderBy: { sortOrder: "asc" } } },
  });
  assertAccess(session, challan);

  return renderToBuffer(
    ChallanPdf({
      press: challan.press,
      challan,
      client: challan.client,
      items: challan.items,
    }),
  );
}

export type PdfDocumentType = "invoice" | "quotation" | "challan";

/** Dispatcher used by the generic `/api/documents/[type]/[id]/pdf` route. */
export function renderDocumentPdf(type: PdfDocumentType, id: string, session: Session): Promise<Buffer> {
  switch (type) {
    case "invoice":
      return renderInvoicePdf(id, session);
    case "quotation":
      return renderQuotationPdf(id, session);
    case "challan":
      return renderChallanPdf(id, session);
  }
}
