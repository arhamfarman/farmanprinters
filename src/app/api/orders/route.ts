import { NextResponse, type NextRequest } from "next/server";
import { createOrder, listOrders } from "@/server/actions/order-actions";
import { createOrderSchema } from "@/lib/validation";

/**
 * REST surface for orders. The dashboard itself calls the server actions
 * in src/server/actions/order-actions.ts directly (see ARCHITECTURE.md) —
 * this route exists for callers outside the Next.js request/response
 * cycle: a future mobile app, a partner press integration, a webhook.
 * Auth is the same requireRole() guard the actions already enforce, so
 * there's no separate API-key scheme to keep in sync.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orders = await listOrders({
    status: searchParams.get("status") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });
  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const order = await createOrder(parsed.data);
  return NextResponse.json(order, { status: 201 });
}
