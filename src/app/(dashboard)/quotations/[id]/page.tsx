import Link from "next/link";
import { getQuotation } from "@/server/actions/quotation-actions";
import { QuotationStatusActions } from "@/components/quotations/QuotationStatusActions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { formatPKR } from "@/lib/currency";

export default async function QuotationDetailPage({ params }: { params: { id: string } }) {
  const quotation = await getQuotation(params.id);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/quotations" className="text-xs text-muted-foreground hover:underline">← Back to Quotations</Link>
          <h1 className="mt-1 text-xl font-semibold">{quotation.quotationNumber}</h1>
          <p className="text-sm text-muted-foreground">{quotation.client.companyName ?? quotation.client.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <QuotationStatusActions quotationId={quotation.id} status={quotation.status} />
          <a href={`/api/documents/quotation/${quotation.id}/pdf`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
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
          {quotation.lineItems.map((item) => (
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
        <span>Subtotal: {formatPKR(quotation.subtotalMinor)}</span>
        {quotation.discountMinor > 0 && <span>Discount: -{formatPKR(quotation.discountMinor)}</span>}
        {quotation.taxMinor > 0 && <span>Tax: {formatPKR(quotation.taxMinor)}</span>}
        <span className="font-semibold">Total: {formatPKR(quotation.totalMinor)}</span>
      </div>

      {quotation.notes && <p className="text-sm text-muted-foreground">{quotation.notes}</p>}
    </div>
  );
}
