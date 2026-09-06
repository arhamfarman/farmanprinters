import Link from "next/link";
import { getOrder } from "@/server/actions/order-actions";
import { OrderDetailPanel } from "@/components/orders/OrderDetailPanel";
import { formatPKR, sumMinor } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

/**
 * Order detail: server component fetches once via the shared `getOrder`
 * action (same data shape a PDF export or the client portal's read-only
 * view would use), client components below handle the interactive bits
 * (status stepper, future: asset uploads, quotation/invoice generation).
 */
export default async function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const order = await getOrder(params.orderId);
  const totalMinor = sumMinor(order.lineItems.map((li) => li.amountMinor));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/orders" className="text-xs text-muted-foreground hover:underline">← Back to Orders</Link>
          <h1 className="mt-1 text-xl font-semibold">{order.title}</h1>
          <p className="text-sm text-muted-foreground">
            {order.orderNumber} · {order.client.companyName ?? order.client.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Generate Quotation</Button>
          <Button variant="outline">Generate Delivery Challan</Button>
          <Button>Generate Invoice</Button>
        </div>
      </div>

      <OrderDetailPanel order={order} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Line Items</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Particulars</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.particulars}</TableCell>
                <TableCell>{item.qty.toString()} {item.unit}</TableCell>
                <TableCell>{formatPKR(item.rateMinor)}</TableCell>
                <TableCell>{formatPKR(item.amountMinor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-2 text-right text-sm font-semibold">Total: {formatPKR(totalMinor)}</p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Pipeline History</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {order.statusEvents.map((event) => (
            <li key={event.id} className="flex justify-between text-muted-foreground">
              <span>{event.fromStatus ? `${event.fromStatus} → ${event.toStatus}` : `Created as ${event.toStatus}`}{event.note ? ` — ${event.note}` : ""}</span>
              <span>{new Date(event.createdAt).toLocaleString("en-PK")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
