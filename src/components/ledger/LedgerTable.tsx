import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPKR } from "@/lib/currency";
import type { ClientLedgerEntry, Invoice, Payment } from "@prisma/client";

type LedgerRow = ClientLedgerEntry & {
  invoice: Pick<Invoice, "invoiceNumber"> | null;
  payment: Pick<Payment, "method"> | null;
};

/**
 * Renders exactly like a paper ledger page: running balance in the last
 * column, debits (invoices) and credits (payments) in their own columns —
 * an accountant used to the physical books can read this without training.
 */
export function LedgerTable({ entries }: { entries: LedgerRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Debit</TableHead>
          <TableHead>Credit</TableHead>
          <TableHead>Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{new Date(entry.entryDate).toLocaleDateString("en-PK")}</TableCell>
            <TableCell>
              {entry.description}
              {entry.invoice && <span className="ml-1 text-xs text-muted-foreground">({entry.invoice.invoiceNumber})</span>}
            </TableCell>
            <TableCell>{entry.debitMinor > 0 ? formatPKR(entry.debitMinor) : "—"}</TableCell>
            <TableCell>{entry.creditMinor > 0 ? formatPKR(entry.creditMinor) : "—"}</TableCell>
            <TableCell className="font-medium">{formatPKR(entry.runningBalanceMinor)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
