"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RecordPaymentDialog } from "@/components/ledger/RecordPaymentDialog";
import { voidInvoice } from "@/server/actions/invoice-actions";
import type { InvoiceStatus } from "@prisma/client";

/** Record Payment reuses the same dialog the client ledger page uses — one payment flow, invoice-scoped or unallocated. */
export function InvoiceActions({ invoiceId, clientId, status }: { invoiceId: string; clientId: string; status: InvoiceStatus }) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const queryClient = useQueryClient();
  const voidMutation = useMutation({
    mutationFn: (reason: string) => voidInvoice({ invoiceId, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const canRecordPayment = status !== "PAID" && status !== "VOID";

  return (
    <div className="flex gap-2">
      {canRecordPayment && <Button onClick={() => setPaymentOpen(true)}>Record Payment</Button>}
      {status !== "VOID" && (
        <Button
          variant="destructive"
          disabled={voidMutation.isPending}
          onClick={() => {
            const reason = window.prompt("Reason for voiding this bill?");
            if (reason) voidMutation.mutate(reason);
          }}
        >
          Void Bill
        </Button>
      )}
      <RecordPaymentDialog clientId={clientId} invoiceId={invoiceId} open={paymentOpen} onOpenChange={setPaymentOpen} />
    </div>
  );
}
