"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getClientLedger, recordPayment } from "@/server/actions/ledger-actions";
import type { RecordPaymentInput } from "@/lib/validation";

export function useClientLedger(clientId: string) {
  return useQuery({
    queryKey: ["ledger", clientId],
    queryFn: () => getClientLedger(clientId),
    enabled: Boolean(clientId),
  });
}

export function useRecordPayment(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentInput) => recordPayment(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger", clientId] }),
  });
}
