import type { OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { statusColorClass, statusLabel } from "@/lib/order-status";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={statusColorClass(status)}>{statusLabel(status)}</Badge>;
}
