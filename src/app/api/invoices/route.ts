import { NextResponse, type NextRequest } from "next/server";
import { createInvoice, listInvoices } from "@/server/actions/invoice-actions";
import { createInvoiceSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const invoices = await listInvoices({
    clientId: searchParams.get("clientId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const invoice = await createInvoice(parsed.data);
  return NextResponse.json(invoice, { status: 201 });
}
