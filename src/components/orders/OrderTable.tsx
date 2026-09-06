"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { formatPKR, sumMinor } from "@/lib/currency";
import { useOrders } from "@/hooks/use-orders";

/**
 * Dense, sortable/searchable list view — the fallback for staff who prefer
 * scanning a table over dragging Kanban cards (accountants reconciling a
 * day's jobs, mostly). Same data source (`useOrders`) as the board, so the
 * two views never disagree.
 */
export function OrderTable({ search }: { search?: string }) {
  const { data: orders, isLoading } = useOrders({ search });

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Loading orders…</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders?.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-mono text-xs">
              <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">
                {order.orderNumber}
              </Link>
            </TableCell>
            <TableCell>{order.client.companyName ?? order.client.name}</TableCell>
            <TableCell>{order.title}</TableCell>
            <TableCell><OrderStatusBadge status={order.status} /></TableCell>
            <TableCell>{formatPKR(sumMinor(order.lineItems.map((li) => li.amountMinor)))}</TableCell>
            <TableCell>{order.dueDate ? new Date(order.dueDate).toLocaleDateString("en-PK") : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
