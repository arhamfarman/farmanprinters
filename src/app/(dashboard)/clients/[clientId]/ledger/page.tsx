import Link from "next/link";
import { getClientLedger } from "@/server/actions/ledger-actions";
import { LedgerSummaryCards } from "@/components/ledger/LedgerSummaryCards";
import { ClientLedgerView } from "@/components/ledger/ClientLedgerView";

/**
 * ⭐ Deliverable: the client ledger. Server component fetches the full
 * entry history + running balance once (getClientLedger already keeps
 * runningBalanceMinor authoritative, never re-summed here); the "Record
 * Payment" dialog lives in the client component below since it needs
 * local dialog-open state.
 */
export default async function ClientLedgerPage({ params }: { params: { clientId: string } }) {
  const { client, entries, currentBalanceMinor, totalReceivableMinor, totalPaidMinor } = await getClientLedger(
    params.clientId,
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Link href="/dashboard/clients" className="text-xs text-muted-foreground hover:underline">← Back to Clients</Link>
        <h1 className="mt-1 text-xl font-semibold">{client.companyName ?? client.name}</h1>
        <p className="text-sm text-muted-foreground">
          {client.companyName ? client.name : null} {client.phone ? `· ${client.phone}` : ""}
        </p>
      </div>

      <LedgerSummaryCards
        currentBalanceMinor={currentBalanceMinor}
        totalReceivableMinor={totalReceivableMinor}
        totalPaidMinor={totalPaidMinor}
      />

      <ClientLedgerView clientId={client.id} initialEntries={entries} />
    </div>
  );
}
