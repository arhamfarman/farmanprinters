"use client";

import { useState } from "react";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rupeesToMinor } from "@/lib/currency";
import { useRecordPayment } from "@/hooks/use-ledger";
import type { PaymentMethod } from "@prisma/client";

const METHODS: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CHEQUE", "EASYPAISA", "JAZZCASH", "CARD", "OTHER"];

export function RecordPaymentDialog({
  clientId,
  invoiceId,
  open,
  onOpenChange,
}: {
  clientId: string;
  invoiceId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const recordPayment = useRecordPayment(clientId);

  async function handleSubmit() {
    await recordPayment.mutateAsync({
      clientId,
      invoiceId,
      amountMinor: rupeesToMinor(Number(amount)),
      method,
      reference: reference || undefined,
    });
    setAmount("");
    setReference("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Record Payment</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <label className="text-sm">
          Amount (PKR)
          <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>

        <label className="text-sm">
          Method
          <select
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>{m.replace("_", " ")}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Reference / Cheque No. (optional)
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={recordPayment.isPending || !amount}>
          {recordPayment.isPending ? "Saving…" : "Save Payment"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
