import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/server/db";
import { BillPdf } from "@/components/documents/BillPdf";
import { QuotationPdf } from "@/components/documents/QuotationPdf";
import { ChallanPdf } from "@/components/documents/ChallanPdf";

const PRESS_SELECT = {
  name: true,
  ntnNumber: true,
  headOfficeAddress: true,
  branchOfficeAddress: true,
  phones: true,
  email: true,
  website: true,
} as const;

/**
 * Fetches one document + its press/client/line items and renders it to a
 * PDF buffer — the only place that turns a DB row into printable bytes, so
 * api/documents/[type]/[id]/pdf/route.ts stays a thin auth-then-stream
 * wrapper. Each function re-checks pressId itself (rather than trusting
 * the caller already did) since a signed/shared link may reach here
 * without having gone through a server action's requireRole() first.
 */
export async function renderInvoicePdf(invoiceId: string, pressId: string): Promise<Buffer> {
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { client: true, press: { select: PRESS_SELECT } , lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (invoice.pressId !== pressId) throw new Error("Invoice does not belong to your press");

  return renderToBuffer(
    BillPdf({
      press: invoice.press,
      invoice,
      client: invoice.client,
      lineItems: invoice.lineItems,
    }),
  );
}

export async function renderQuotationPdf(quotationId: string, pressId: string): Promise<Buffer> {
  const quotation = await db.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { client: true, press: { select: PRESS_SELECT }, lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (quotation.pressId !== pressId) throw new Error("Quotation does not belong to your press");

  return renderToBuffer(
    QuotationPdf({
      press: quotation.press,
      quotation,
      client: quotation.client,
      lineItems: quotation.lineItems,
    }),
  );
}

export async function renderChallanPdf(challanId: string, pressId: string): Promise<Buffer> {
  const challan = await db.deliveryChallan.findUniqueOrThrow({
    where: { id: challanId },
    include: { client: true, press: { select: PRESS_SELECT }, items: { orderBy: { sortOrder: "asc" } } },
  });
  if (challan.pressId !== pressId) throw new Error("Challan does not belong to your press");

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
export function renderDocumentPdf(type: PdfDocumentType, id: string, pressId: string): Promise<Buffer> {
  switch (type) {
    case "invoice":
      return renderInvoicePdf(id, pressId);
    case "quotation":
      return renderQuotationPdf(id, pressId);
    case "challan":
      return renderChallanPdf(id, pressId);
  }
}
