import Link from "next/link";
import { listMyOrders } from "@/server/actions/portal-actions";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPKR, sumMinor } from "@/lib/currency";

/** Read-only pipeline view — a client can see where their job sits, not move it. */
export default async function MyOrdersPage() {
  const orders = await listMyOrders();

  return (
    <div className="flex flex-col gap-4 py-4">
      <h1 className="text-xl font-semibold">My Orders</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">
                <Link href={`/client/orders/${order.id}`} className="hover:underline">{order.orderNumber}</Link>
              </TableCell>
              <TableCell>{order.title}</TableCell>
              <TableCell><OrderStatusBadge status={order.status} /></TableCell>
              <TableCell>{formatPKR(sumMinor(order.lineItems.map((li) => li.amountMinor)))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
