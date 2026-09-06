import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPKR } from "@/lib/currency";

export function LedgerSummaryCards({
  currentBalanceMinor,
  totalReceivableMinor,
  totalPaidMinor,
}: {
  currentBalanceMinor: number;
  totalReceivableMinor: number;
  totalPaidMinor: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Outstanding Balance</CardTitle></CardHeader>
        <CardContent className={`text-xl font-bold ${currentBalanceMinor > 0 ? "text-destructive" : "text-emerald-600"}`}>
          {formatPKR(currentBalanceMinor)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Total Invoiced</CardTitle></CardHeader>
        <CardContent className="text-xl font-bold">{formatPKR(totalReceivableMinor)}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Total Received</CardTitle></CardHeader>
        <CardContent className="text-xl font-bold">{formatPKR(totalPaidMinor)}</CardContent>
      </Card>
    </div>
  );
}
