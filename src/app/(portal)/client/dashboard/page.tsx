import Link from "next/link";
import { listMyOrders, getMyLedger, getMyInvoices } from "@/server/actions/portal-actions";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { LedgerSummaryCards } from "@/components/ledger/LedgerSummaryCards";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { formatPKR, sumMinor } from "@/lib/currency";

/**
 * Landing page after a client signs in (see (auth)/magic-link/page.tsx's
 * callbackUrl) — a single overview of active jobs, outstanding balance,
 * and downloadable bills, with links out to the full /client/orders and
 * /client/ledger pages for the complete history.
 */
export default async function ClientDashboardPage() {
  const [orders, ledger, invoices] = await Promise.all([listMyOrders(), getMyLedger(), getMyInvoices()]);

  const activeOrders = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");
  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1 className="text-xl font-semibold">Welcome, {ledger.client.companyName ?? ledger.client.name}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s where your jobs and account stand today.</p>
      </div>

      <LedgerSummaryCards
        currentBalanceMinor={ledger.currentBalanceMinor}
        totalReceivableMinor={ledger.totalReceivableMinor}
        totalPaidMinor={ledger.totalPaidMinor}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Active Orders</h2>
          <Link href="/client/orders" className="text-xs text-muted-foreground hover:underline">View all →</Link>
        </div>
        {activeOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active orders right now.</p>
        ) : (
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
              {activeOrders.map((order) => (
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
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Recent Bills</h2>
          <Link href="/client/ledger" className="text-xs text-muted-foreground hover:underline">View ledger →</Link>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bills issued yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Balance Due</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{new Date(invoice.issueDate).toLocaleDateString("en-PK")}</TableCell>
                  <TableCell>{formatPKR(invoice.totalMinor)}</TableCell>
                  <TableCell>{formatPKR(invoice.totalMinor - invoice.amountPaidMinor)}</TableCell>
                  <TableCell>
                    <a
                      href={`/api/documents/invoice/${invoice.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Download PDF
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
