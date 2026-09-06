"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { nextAllowedStatuses, statusLabel } from "@/lib/order-status";
import { useUpdateOrderStatus } from "@/hooks/use-orders";
import type { Order } from "@prisma/client";

/** Status stepper + advance/cancel actions for the order detail page. */
export function OrderDetailPanel({ order }: { order: Order }) {
  const updateStatus = useUpdateOrderStatus();
  const [note, setNote] = useState("");
  const nextSteps = nextAllowedStatuses(order.status);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Current stage</span>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
            placeholder="Optional note (e.g. client approved artwork by phone)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {nextSteps.map((status) => (
              <Button
                key={status}
                variant={status === "CANCELLED" ? "destructive" : "default"}
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ orderId: order.id, toStatus: status, note: note || undefined })}
              >
                {status === "CANCELLED" ? "Cancel Order" : `Move to ${statusLabel(status)}`}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
