import Link from "next/link";
import { getInvoice } from "@/server/actions/invoice-actions";
import { InvoiceActions } from "@/components/invoices/InvoiceActions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { formatPKR } from "@/lib/currency";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = await getInvoice(params.id);
  const balanceDueMinor = invoice.totalMinor - invoice.amountPaidMinor;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/invoices" className="text-xs text-muted-foreground hover:underline">← Back to Invoices</Link>
          <h1 className="mt-1 text-xl font-semibold">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">{invoice.client.companyName ?? invoice.client.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <InvoiceActions invoiceId={invoice.id} clientId={invoice.clientId} status={invoice.status} />
          <a href={`/api/documents/invoice/${invoice.id}/pdf`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            Download PDF
          </a>
        </div>
      </div>

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
          {invoice.lineItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.particulars}</TableCell>
              <TableCell>{item.qty.toString()}</TableCell>
              <TableCell>{formatPKR(item.rateMinor)}</TableCell>
              <TableCell>{formatPKR(item.amountMinor)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col items-end gap-1 text-sm">
        <span>Subtotal: {formatPKR(invoice.subtotalMinor)}</span>
        {invoice.discountMinor > 0 && <span>Discount: -{formatPKR(invoice.discountMinor)}</span>}
        {invoice.taxMinor > 0 && <span>Tax: {formatPKR(invoice.taxMinor)}</span>}
        <span className="font-semibold">Total: {formatPKR(invoice.totalMinor)}</span>
        <span>Paid: {formatPKR(invoice.amountPaidMinor)}</span>
        <span className="font-semibold">Balance Due: {formatPKR(balanceDueMinor)}</span>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Payments</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{new Date(payment.paidAt).toLocaleDateString("en-PK")}</TableCell>
                <TableCell>{payment.method.replace("_", " ")}</TableCell>
                <TableCell>{payment.reference ?? "—"}</TableCell>
                <TableCell>{formatPKR(payment.amountMinor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {invoice.notes && <p className="text-sm text-muted-foreground">{invoice.notes}</p>}
    </div>
  );
}
