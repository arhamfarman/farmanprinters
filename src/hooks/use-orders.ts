"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrder, listOrders, updateOrderStatus } from "@/server/actions/order-actions";
import type { CreateOrderInput, UpdateOrderStatusInput } from "@/lib/validation";

export const orderKeys = {
  all: ["orders"] as const,
  list: (filters: Record<string, unknown>) => [...orderKeys.all, "list", filters] as const,
};

/**
 * Server Actions are plain async functions, so React Query can call them
 * directly as the query/mutation fn — no separate `/api/orders` fetch
 * wrapper needed for the dashboard itself. `api/orders/route.ts` still
 * exists for anything that isn't a Next.js client component (mobile app,
 * partner press integrations, webhooks).
 */
export function useOrders(filters: { status?: string; clientId?: string; search?: string } = {}) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => listOrders(filters),
    staleTime: 15_000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrderStatusInput) => updateOrderStatus(input),
    // Optimistic move on the Kanban board: update the cached list immediately,
    // then reconcile with the server response (or roll back on error).
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.all });
      const previous = queryClient.getQueriesData({ queryKey: orderKeys.all });
      queryClient.setQueriesData({ queryKey: orderKeys.all }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((order) =>
          order.id === input.orderId ? { ...order, status: input.toStatus } : order,
        );
      });
      return { previous };
    },
    onError: (_err, _input, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}
