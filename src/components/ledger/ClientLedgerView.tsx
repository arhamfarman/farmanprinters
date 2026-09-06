"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LedgerTable } from "./LedgerTable";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { useClientLedger } from "@/hooks/use-ledger";
import type { getClientLedger } from "@/server/actions/ledger-actions";

/** Client half of the ledger page: owns the "Record Payment" dialog's open state and re-fetches after a save. */
export function ClientLedgerView({
  clientId,
  initialEntries,
}: {
  clientId: string;
  initialEntries: Awaited<ReturnType<typeof getClientLedger>>["entries"];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data } = useClientLedger(clientId);
  const entries = data?.entries ?? initialEntries;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Record Payment
        </Button>
      </div>

      <LedgerTable entries={entries} />

      <RecordPaymentDialog clientId={clientId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
