"use client";

import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ORDER_PIPELINE, nextAllowedStatuses } from "@/lib/order-status";
import { formatPKR, sumMinor } from "@/lib/currency";
import { useOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import { OrderStatusBadge } from "./OrderStatusBadge";
import type { OrderWithRelations } from "@/types";
import type { OrderStatus } from "@prisma/client";

/**
 * The visual pipeline: Inquiry -> Quotation -> Design Approval ->
 * In Production -> Ready for Delivery -> Invoiced -> Completed.
 * Dropping a card only succeeds if the target column is a legal next step
 * for that order (see lib/order-status.ts) — dropping two stages ahead
 * snaps back and surfaces why via the mutation's onError.
 */
export function OrderKanbanBoard({ clientId }: { clientId?: string }) {
  const { data: orders, isLoading } = useOrders({ clientId });
  const updateStatus = useUpdateOrderStatus();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = useMemo(() => {
    const byStatus = new Map<OrderStatus, OrderWithRelations[]>();
    for (const stage of ORDER_PIPELINE) byStatus.set(stage.status, []);
    for (const order of orders ?? []) {
      if (order.status === "CANCELLED") continue; // surfaced elsewhere, not as a column
      byStatus.get(order.status)?.push(order as OrderWithRelations);
    }
    return byStatus;
  }, [orders]);

  function handleDragEnd(event: DragEndEvent) {
    const orderId = event.active.id as string;
    const toStatus = event.over?.id as OrderStatus | undefined;
    if (!toStatus) return;

    const order = orders?.find((o) => o.id === orderId);
    if (!order || order.status === toStatus) return;

    if (!nextAllowedStatuses(order.status).includes(toStatus)) {
      // TODO: surface via toast — kept as console for the skeleton.
      console.warn(`Cannot move ${order.orderNumber} from ${order.status} to ${toStatus} directly`);
      return;
    }

    updateStatus.mutate({ orderId, toStatus });
  }

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Loading pipeline…</p>;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ORDER_PIPELINE.map((stage) => {
          const stageOrders = columns.get(stage.status) ?? [];
          return (
            <KanbanColumn
              key={stage.status}
              status={stage.status}
              label={stage.label}
              totalMinor={sumMinor(stageOrders.flatMap((o) => o.lineItems.map((li) => li.amountMinor)))}
            >
              {stageOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </KanbanColumn>
          );
        })}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  label,
  totalMinor,
  children,
}: {
  status: OrderStatus;
  label: string;
  totalMinor: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30 p-2 ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">{formatPKR(totalMinor)}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderWithRelations }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: order.id });
  const amountMinor = sumMinor(order.lineItems.map((li) => li.amountMinor));

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className="cursor-grab rounded-md border border-border bg-background p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-muted-foreground">{order.orderNumber}</span>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="text-sm font-medium">{order.title}</p>
      <p className="text-xs text-muted-foreground">{order.client.companyName ?? order.client.name}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span>{formatPKR(amountMinor)}</span>
        {order.dueDate && <span className="text-muted-foreground">Due {new Date(order.dueDate).toLocaleDateString("en-PK")}</span>}
      </div>
    </div>
  );
}
