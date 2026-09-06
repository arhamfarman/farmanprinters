"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markChallanDelivered } from "@/server/actions/challan-actions";

/** The "Delivered by / Received by" signature block, made interactive — recording it flips the challan from PENDING to DELIVERED. */
export function ChallanDeliveryForm({ challanId }: { challanId: string }) {
  const [deliveredBy, setDeliveredBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => markChallanDelivered({ challanId, deliveredBy, receivedBy }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["challans"] }),
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Delivered by
          <Input value={deliveredBy} onChange={(e) => setDeliveredBy(e.target.value)} />
        </label>
        <label className="text-sm">
          Received by
          <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
        </label>
      </div>
      <Button
        className="self-end"
        disabled={mutation.isPending || !deliveredBy || !receivedBy}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Saving…" : "Mark Delivered"}
      </Button>
    </div>
  );
}
