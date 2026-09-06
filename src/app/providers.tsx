"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * One QueryClient per browser tab, created inside useState so it survives
 * re-renders but not a full page reload — the server actions it wraps
 * (src/hooks/use-*.ts) are the source of truth, this is just a client cache
 * in front of them.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1 } },
  }));

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
