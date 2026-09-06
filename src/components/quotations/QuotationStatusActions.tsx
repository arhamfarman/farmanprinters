"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { updateQuotationStatus } from "@/server/actions/quotation-actions";
import type { QuotationStatus } from "@prisma/client";

const NEXT_STEPS: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};

const LABEL: Record<QuotationStatus, string> = {
  DRAFT: "Draft",
  SENT: "Mark as Sent",
  ACCEPTED: "Mark Accepted",
  REJECTED: "Mark Rejected",
  EXPIRED: "Mark Expired",
};

export function QuotationStatusActions({ quotationId, status }: { quotationId: string; status: QuotationStatus }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (toStatus: QuotationStatus) => updateQuotationStatus({ quotationId, status: toStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quotations"] }),
  });

  const nextSteps = NEXT_STEPS[status];
  if (nextSteps.length === 0) return null;

  return (
    <div className="flex gap-2">
      {nextSteps.map((next) => (
        <Button
          key={next}
          variant={next === "REJECTED" || next === "EXPIRED" ? "outline" : "default"}
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(next)}
        >
          {LABEL[next]}
        </Button>
      ))}
    </div>
  );
}
