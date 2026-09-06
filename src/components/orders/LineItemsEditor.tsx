"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPKR, rupeesToMinor, sumMinor } from "@/lib/currency";
import type { LineItemInput } from "@/lib/validation";

/**
 * Shared "Particulars / Qty / Rate / Amount" grid used by the order form,
 * the quotation builder, and the invoice builder — this is the digital
 * equivalent of the boxed table on the physical bill/quotation pad, with
 * Amount computed instead of hand-multiplied.
 */
export function LineItemsEditor({
  value,
  onChange,
}: {
  value: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
}) {
  const [draft, setDraft] = useState<LineItemInput>({ particulars: "", qty: 1, rateMinor: 0 });

  function addItem() {
    if (!draft.particulars.trim()) return;
    onChange([...value, draft]);
    setDraft({ particulars: "", qty: 1, rateMinor: 0 });
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  const totalMinor = sumMinor(value.map((item) => Math.round(item.qty * item.rateMinor)));

  return (
    <div className="rounded-md border border-border">
      <div className="grid grid-cols-[1fr_80px_120px_120px_40px] gap-2 border-b border-border bg-muted/40 p-2 text-xs font-medium text-muted-foreground">
        <span>Particulars</span>
        <span>Qty</span>
        <span>Rate</span>
        <span>Amount</span>
        <span />
      </div>

      {value.map((item, index) => (
        <div key={index} className="grid grid-cols-[1fr_80px_120px_120px_40px] items-center gap-2 border-b border-border p-2 text-sm">
          <span>{item.particulars}</span>
          <span>{item.qty}</span>
          <span>{formatPKR(item.rateMinor)}</span>
          <span>{formatPKR(Math.round(item.qty * item.rateMinor))}</span>
          <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="grid grid-cols-[1fr_80px_120px_120px_40px] items-center gap-2 p-2">
        <Input
          placeholder="e.g. Employee ID Card - PVC"
          value={draft.particulars}
          onChange={(e) => setDraft({ ...draft, particulars: e.target.value })}
        />
        <Input type="number" min={0} value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })} />
        <Input
          type="number"
          min={0}
          placeholder="Rate (PKR)"
          value={draft.rateMinor ? draft.rateMinor / 100 : ""}
          onChange={(e) => setDraft({ ...draft, rateMinor: rupeesToMinor(Number(e.target.value)) })}
        />
        <span className="text-sm text-muted-foreground">{formatPKR(Math.round(draft.qty * draft.rateMinor))}</span>
        <Button variant="outline" size="icon" onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-end border-t border-border p-2 text-sm font-semibold">
        Total: {formatPKR(totalMinor)}
      </div>
    </div>
  );
}
