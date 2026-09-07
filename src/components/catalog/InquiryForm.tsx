"use client";

import { useMemo, useRef, useState } from "react";
import { createInquiry } from "@/server/actions/inquiry-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@/lib/currency";

export type InquiryCatalogItem = {
  id: string;
  name: string;
  unit: string;
  defaultRateMinor: number;
  category: { id: string; name: string } | null;
};

type Selection = { quantity: string; notes: string };

/**
 * Posts to the `createInquiry` server action via the form's `action` prop
 * (native progressive-enhancement submission) so file attachments work
 * without client-side upload plumbing. Catalog-item selections don't map
 * onto plain form fields (a variable number of repeating rows), so
 * they're collected in local state and serialized to a single hidden
 * `items` JSON field right before submit — inquiry-actions.ts parses and
 * re-validates that JSON server-side, never trusts it as-is.
 */
export function InquiryForm({ catalogItems, categoryId }: { catalogItems: InquiryCatalogItem[]; categoryId?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [selections, setSelections] = useState<Record<string, Selection>>({});

  const grouped = useMemo(() => {
    const byCategory = new Map<string, { label: string; items: InquiryCatalogItem[] }>();
    for (const item of catalogItems) {
      const key = item.category?.id ?? "uncategorized";
      const label = item.category?.name ?? "Other";
      if (!byCategory.has(key)) byCategory.set(key, { label, items: [] });
      byCategory.get(key)!.items.push(item);
    }
    return [...byCategory.values()];
  }, [catalogItems]);

  function updateSelection(itemId: string, patch: Partial<Selection>) {
    setSelections((prev) => ({ ...prev, [itemId]: { quantity: "", notes: "", ...prev[itemId], ...patch } }));
  }

  async function handleSubmit(formData: FormData) {
    const items = Object.entries(selections)
      .filter(([, sel]) => Number(sel.quantity) > 0)
      .map(([catalogItemId, sel]) => ({
        catalogItemId,
        quantity: Number(sel.quantity),
        notes: sel.notes || undefined,
      }));
    formData.set("items", JSON.stringify(items));

    await createInquiry(formData);
    formRef.current?.reset();
    setSelections({});
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="rounded-md border border-border bg-muted/40 p-4 text-sm">
        Thanks — we&apos;ve received your request and will be in touch shortly.
      </p>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
      {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">What would you like a quote for?</span>
        <div className="flex flex-col divide-y divide-border rounded-md border border-border">
          {grouped.map((group) => (
            <div key={group.label} className="p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{group.label}</p>
              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_90px_1fr] items-center gap-2 text-sm">
                    <span>
                      {item.name}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({formatPKR(item.defaultRateMinor)} / {item.unit})
                      </span>
                    </span>
                    <Input
                      type="number"
                      min={0}
                      placeholder={`Qty (${item.unit})`}
                      value={selections[item.id]?.quantity ?? ""}
                      onChange={(e) => updateSelection(item.id, { quantity: e.target.value })}
                    />
                    <Input
                      placeholder="Notes / dimensions (optional)"
                      value={selections[item.id]?.notes ?? ""}
                      onChange={(e) => updateSelection(item.id, { notes: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="text-sm">
        Name
        <Input name="contactName" required />
      </label>
      <label className="text-sm">
        Company (optional)
        <Input name="companyName" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Phone
          <Input name="phone" type="tel" />
        </label>
        <label className="text-sm">
          Email
          <Input name="email" type="email" />
        </label>
      </div>
      <label className="text-sm">
        Anything else? (required if you didn&apos;t pick an item above)
        <textarea name="message" rows={4} className="w-full rounded-md border border-border bg-background p-2 text-sm" />
      </label>
      <label className="text-sm">
        Reference artwork / photos (optional)
        <input type="file" name="attachments" multiple accept="image/*,.pdf,.ai,.cdr,.psd" className="block w-full text-sm" />
      </label>
      <Button type="submit" className="self-start">Submit Request</Button>
    </form>
  );
}
