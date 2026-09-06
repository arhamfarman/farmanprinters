import Link from "next/link";
import { getMyOrder } from "@/server/actions/portal-actions";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPKR, sumMinor } from "@/lib/currency";

export default async function MyOrderDetailPage({ params }: { params: { orderId: string } }) {
  const order = await getMyOrder(params.orderId);
  const totalMinor = sumMinor(order.lineItems.map((li) => li.amountMinor));

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <Link href="/client/orders" className="text-xs text-muted-foreground hover:underline">← Back to My Orders</Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-xl font-semibold">{order.title}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-sm text-muted-foreground">{order.orderNumber}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Particulars</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lineItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.particulars}</TableCell>
              <TableCell>{item.qty.toString()} {item.unit}</TableCell>
              <TableCell>{formatPKR(item.amountMinor)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-right text-sm font-semibold">Total: {formatPKR(totalMinor)}</p>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Progress</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {order.statusEvents.map((event) => (
            <li key={event.id} className="flex justify-between text-muted-foreground">
              <span>{event.fromStatus ? `${event.fromStatus} → ${event.toStatus}` : `Created as ${event.toStatus}`}</span>
              <span>{new Date(event.createdAt).toLocaleDateString("en-PK")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
