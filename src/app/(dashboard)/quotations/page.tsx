import Link from "next/link";
import { listQuotations } from "@/server/actions/quotation-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/currency";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-slate-100 text-slate-500",
};

export default async function QuotationsPage() {
  const quotations = await listQuotations();

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Quotations</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quotation #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotations.map((q) => (
            <TableRow key={q.id}>
              <TableCell className="font-mono text-xs">
                <Link href={`/dashboard/quotations/${q.id}`} className="hover:underline">{q.quotationNumber}</Link>
              </TableCell>
              <TableCell>{q.client.companyName ?? q.client.name}</TableCell>
              <TableCell>{new Date(q.issueDate).toLocaleDateString("en-PK")}</TableCell>
              <TableCell><Badge className={STATUS_COLOR[q.status]}>{q.status}</Badge></TableCell>
              <TableCell>{formatPKR(q.totalMinor)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
