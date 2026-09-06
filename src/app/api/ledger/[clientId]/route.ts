import { NextResponse, type NextRequest } from "next/server";
import { getClientLedger } from "@/server/actions/ledger-actions";

export async function GET(_request: NextRequest, { params }: { params: { clientId: string } }) {
  const ledger = await getClientLedger(params.clientId);
  return NextResponse.json(ledger);
}
