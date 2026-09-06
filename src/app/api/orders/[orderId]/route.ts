import { NextResponse, type NextRequest } from "next/server";
import { getOrder, updateOrderStatus } from "@/server/actions/order-actions";
import { updateOrderStatusSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: { orderId: string } }) {
  const order = await getOrder(params.orderId);
  return NextResponse.json(order);
}

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  const body = await request.json();
  const parsed = updateOrderStatusSchema.safeParse({ ...body, orderId: params.orderId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const order = await updateOrderStatus(parsed.data);
  return NextResponse.json(order);
}
