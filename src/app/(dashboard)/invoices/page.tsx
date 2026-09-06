import Link from "next/link";
import { listInvoices } from "@/server/actions/invoice-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/currency";

const STATUS_COLOR: Record<string, string> = {
  UNPAID: "bg-amber-100 text-amber-800",
  PARTIALLY_PAID: "bg-blue-100 text-blue-800",
  PAID: "bg-emerald-100 text-emerald-800",
  VOID: "bg-red-100 text-red-800",
};

export default async function InvoicesPage() {
  const invoices = await listInvoices();

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Invoices</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bill #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Balance Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-mono text-xs">
                <Link href={`/dashboard/invoices/${inv.id}`} className="hover:underline">{inv.invoiceNumber}</Link>
              </TableCell>
              <TableCell>{inv.client.companyName ?? inv.client.name}</TableCell>
              <TableCell>{new Date(inv.issueDate).toLocaleDateString("en-PK")}</TableCell>
              <TableCell><Badge className={STATUS_COLOR[inv.status]}>{inv.status.replace("_", " ")}</Badge></TableCell>
              <TableCell>{formatPKR(inv.totalMinor)}</TableCell>
              <TableCell>{formatPKR(inv.totalMinor - inv.amountPaidMinor)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
