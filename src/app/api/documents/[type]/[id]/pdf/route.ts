import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/server/auth";
import { renderDocumentPdf, type PdfDocumentType } from "@/server/services/pdf/render";

const VALID_TYPES: PdfDocumentType[] = ["invoice", "quotation", "challan"];

/**
 * Streams the printable PDF for a Bill/Quotation/Challan — this is what
 * every "Download PDF" button in the dashboard (any staff) and the client
 * portal (their own documents only) links to directly (a plain <a href>,
 * not a fetch()), so the browser's native PDF viewer/download handles it
 * instead of the app buffering the whole file in JS. Any signed-in
 * session may reach this handler; render.ts's assertAccess() is what
 * actually enforces "your press" / "your own documents only".
 */
export async function GET(_request: NextRequest, { params }: { params: { type: string; id: string } }) {
  if (!VALID_TYPES.includes(params.type as PdfDocumentType)) {
    return NextResponse.json({ error: `Unknown document type: ${params.type}` }, { status: 400 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const buffer = await renderDocumentPdf(params.type as PdfDocumentType, params.id, session);

  // Response's BodyInit doesn't include Node's Buffer type, just its
  // underlying Uint8Array — a no-op at runtime, just satisfies tsc.
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${params.type}-${params.id}.pdf"`,
    },
  });
}
