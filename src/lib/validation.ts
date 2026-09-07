import { z } from "zod";

export const lineItemInputSchema = z.object({
  particulars: z.string().min(1, "Required"),
  qty: z.coerce.number().positive(),
  rateMinor: z.coerce.number().int().nonnegative(),
});
export type LineItemInput = z.infer<typeof lineItemInputSchema>;

export const createOrderSchema = z.object({
  clientId: z.string().min(1),
  categoryId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  lineItems: z.array(lineItemInputSchema).min(1, "Add at least one line item"),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  toStatus: z.enum([
    "INQUIRY",
    "QUOTATION",
    "APPROVED",
    "IN_PRODUCTION",
    "READY",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
  ]),
  note: z.string().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const recordPaymentSchema = z.object({
  clientId: z.string().min(1),
  invoiceId: z.string().optional(),
  amountMinor: z.coerce.number().int().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "EASYPAISA", "JAZZCASH", "CARD", "OTHER"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

// -----------------------------------------------------------------------
// Quotation / Invoice / Delivery Challan — each keeps its own line-item
// copy (see schema.prisma) so a signed quotation or issued bill never
// silently changes if the underlying order's scope does.
// -----------------------------------------------------------------------

export const createQuotationSchema = z.object({
  clientId: z.string().min(1),
  orderId: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  discountMinor: z.coerce.number().int().nonnegative().default(0),
  taxMinor: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemInputSchema).min(1, "Add at least one line item"),
});
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export const updateQuotationStatusSchema = z.object({
  quotationId: z.string().min(1),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]),
});
export type UpdateQuotationStatusInput = z.infer<typeof updateQuotationStatusSchema>;

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1),
  orderId: z.string().optional(),
  discountMinor: z.coerce.number().int().nonnegative().default(0),
  taxMinor: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemInputSchema).min(1, "Add at least one line item"),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const voidInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().min(1, "A reason is required to void a bill"),
});
export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>;

export const challanItemInputSchema = z.object({
  particulars: z.string().min(1, "Required"),
  quantity: z.coerce.number().positive(),
});
export type ChallanItemInput = z.infer<typeof challanItemInputSchema>;

export const createChallanSchema = z.object({
  clientId: z.string().min(1),
  orderId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(challanItemInputSchema).min(1, "Add at least one item"),
});
export type CreateChallanInput = z.infer<typeof createChallanSchema>;

export const markChallanDeliveredSchema = z.object({
  challanId: z.string().min(1),
  deliveredBy: z.string().min(1),
  receivedBy: z.string().min(1),
});
export type MarkChallanDeliveredInput = z.infer<typeof markChallanDeliveredSchema>;

// -----------------------------------------------------------------------
// Public inquiry form (no auth — rate-limit/captcha at the route level)
// -----------------------------------------------------------------------

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  ntnNumber: z.string().optional(),
  strnNumber: z.string().optional(),
  openingBalanceMinor: z.coerce.number().int().default(0),
  notes: z.string().optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

/** Staff-initiated — see auth-options.ts's createUser override: a CLIENT can only sign in after this creates their User row. */
export const grantClientPortalAccessSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
});
export type GrantClientPortalAccessInput = z.infer<typeof grantClientPortalAccessSchema>;

export const inquiryItemInputSchema = z.object({
  catalogItemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  notes: z.string().optional(), // dimensions/specs, e.g. "20ft x 6ft"
});
export type InquiryItemInput = z.infer<typeof inquiryItemInputSchema>;

export const createInquirySchema = z
  .object({
    contactName: z.string().min(1, "Name is required"),
    companyName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    message: z.string().optional(),
    categoryId: z.string().optional(),
    // Structured catalog selections are optional — a request that's
    // easier to describe in prose than pick off a price list (a one-off
    // custom job) can still submit with just `message` and no items.
    items: z.array(inquiryItemInputSchema).default([]),
  })
  // ...but at least one of the two has to carry the actual request, or
  // staff would get a blank inquiry with nothing to act on.
  .refine((data) => (data.message && data.message.trim().length > 0) || data.items.length > 0, {
    message: "Describe what you need, or select at least one catalog item",
    path: ["message"],
  });
export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
