import { getMyLedger } from "@/server/actions/portal-actions";
import { LedgerSummaryCards } from "@/components/ledger/LedgerSummaryCards";
import { LedgerTable } from "@/components/ledger/LedgerTable";

/** Read-only mirror of the dashboard's client ledger — same LedgerTable, no Record Payment button (that's staff-only). */
export default async function MyLedgerPage() {
  const { entries, currentBalanceMinor, totalReceivableMinor, totalPaidMinor } = await getMyLedger();

  return (
    <div className="flex flex-col gap-6 py-4">
      <h1 className="text-xl font-semibold">My Ledger</h1>
      <LedgerSummaryCards
        currentBalanceMinor={currentBalanceMinor}
        totalReceivableMinor={totalReceivableMinor}
        totalPaidMinor={totalPaidMinor}
      />
      <LedgerTable entries={entries} />
    </div>
  );
}
