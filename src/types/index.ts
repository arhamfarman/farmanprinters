import type { Order, OrderLineItem, Client } from "@prisma/client";

/** Shape returned by `listOrders()` — kept in one place so the Kanban board,
 * table view, and detail panel all type against the same query result. */
export type OrderWithRelations = Order & {
  client: Pick<Client, "id" | "name" | "companyName">;
  lineItems: OrderLineItem[];
  designer: { id: string; name: string } | null;
  productionStaff: { id: string; name: string } | null;
};
