"use client";

import { useState } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderKanbanBoard } from "@/components/orders/OrderKanbanBoard";
import { OrderTable } from "@/components/orders/OrderTable";

/**
 * Central job-tracking pipeline. Toggles between the Kanban board (default,
 * matches the required Inquiry -> ... -> Completed flow) and a dense table
 * for search/reconciliation — both read from the same `useOrders` cache.
 */
export default function OrdersPage() {
  const [view, setView] = useState<"board" | "table">("board");
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Job Orders</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Search orders…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Button variant={view === "board" ? "default" : "outline"} size="icon" onClick={() => setView("board")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === "table" ? "default" : "outline"} size="icon" onClick={() => setView("table")}>
            <List className="h-4 w-4" />
          </Button>
          <Button>
            <Plus className="mr-1 h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      {view === "board" ? <OrderKanbanBoard /> : <OrderTable search={search} />}
    </div>
  );
}
