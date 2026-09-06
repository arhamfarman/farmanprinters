-- =============================================================================
-- 0001_init: Farman Printing Press ERP schema
-- Generated to match prisma/schema.prisma. Regenerate with
-- `npx prisma migrate dev` against a real DATABASE_URL once Postgres is
-- provisioned — this file is the reviewable, hand-checked baseline for it.
-- =============================================================================

-- ---------- Enums ----------
CREATE TYPE "UserRole" AS ENUM ('OWNER_ADMIN', 'ACCOUNTANT', 'GRAPHIC_DESIGNER', 'PRODUCTION_STAFF', 'SALES');
CREATE TYPE "VendorCategory" AS ENUM ('RAW_MATERIAL_SUPPLIER', 'OUTSOURCE_PARTNER_PRESS', 'EQUIPMENT_SERVICE', 'OTHER');
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED');
CREATE TYPE "OrderStatus" AS ENUM ('INQUIRY', 'QUOTATION', 'DESIGN_APPROVAL', 'IN_PRODUCTION', 'READY_FOR_DELIVERY', 'INVOICED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "OrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID');
CREATE TYPE "ChallanStatus" AS ENUM ('PENDING', 'DELIVERED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'EASYPAISA', 'JAZZCASH', 'CARD', 'OTHER');
CREATE TYPE "LedgerEntryType" AS ENUM ('OPENING_BALANCE', 'INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'ADJUSTMENT');
CREATE TYPE "DocumentType" AS ENUM ('BILL', 'QUOTATION', 'CHALLAN', 'ORDER');
CREATE TYPE "AssetFileType" AS ENUM ('CDR', 'AI', 'PSD', 'PDF', 'PNG', 'JPG', 'OTHER');
CREATE TYPE "PartnershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');
CREATE TYPE "SharePermission" AS ENUM ('VIEW', 'DOWNLOAD');

-- ---------- Tenancy & identity ----------
CREATE TABLE "presses" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "ntn_number" TEXT,
  "logo_url" TEXT,
  "website" TEXT,
  "email" TEXT,
  "head_office_address" TEXT,
  "branch_office_address" TEXT,
  "phones" TEXT[] NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "users_press_id_idx" ON "users"("press_id");

-- ---------- Parties ----------
CREATE TABLE "clients" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "company_name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "city" TEXT,
  "ntn_number" TEXT,
  "opening_balance_minor" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "clients_press_id_idx" ON "clients"("press_id");

CREATE TABLE "vendors" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "category" "VendorCategory" NOT NULL DEFAULT 'OTHER',
  "is_partner_press" BOOLEAN NOT NULL DEFAULT false,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "vendors_press_id_idx" ON "vendors"("press_id");

-- ---------- Catalog ----------
CREATE TABLE "product_categories" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "icon_name" TEXT,
  "image_url" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  UNIQUE ("press_id", "slug")
);

CREATE TABLE "service_items" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "category_id" TEXT REFERENCES "product_categories"("id"),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'pcs',
  "default_rate_minor" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX "service_items_press_id_idx" ON "service_items"("press_id");

-- ---------- Orders (jobs) ----------
CREATE TABLE "orders" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "order_number" TEXT NOT NULL,
  "client_id" TEXT NOT NULL REFERENCES "clients"("id"),
  "category_id" TEXT REFERENCES "product_categories"("id"),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'INQUIRY',
  "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
  "due_date" TIMESTAMPTZ,
  "created_by_id" TEXT REFERENCES "users"("id"),
  "designer_id" TEXT REFERENCES "users"("id"),
  "production_staff_id" TEXT REFERENCES "users"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("press_id", "order_number")
);
CREATE INDEX "orders_press_id_status_idx" ON "orders"("press_id", "status");

CREATE TABLE "order_status_events" (
  "id" TEXT PRIMARY KEY,
  "order_id" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "from_status" "OrderStatus",
  "to_status" "OrderStatus" NOT NULL,
  "changed_by_id" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "order_status_events_order_id_idx" ON "order_status_events"("order_id");

CREATE TABLE "order_line_items" (
  "id" TEXT PRIMARY KEY,
  "order_id" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "particulars" TEXT NOT NULL,
  "qty" DECIMAL(12,2) NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'pcs',
  "rate_minor" INTEGER NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "order_line_items_order_id_idx" ON "order_line_items"("order_id");

-- ---------- Inquiries ----------
CREATE TABLE "inquiries" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "client_id" TEXT REFERENCES "clients"("id"),
  "contact_name" TEXT NOT NULL,
  "company_name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "message" TEXT NOT NULL,
  "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
  "converted_order_id" TEXT UNIQUE REFERENCES "orders"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "inquiries_press_id_status_idx" ON "inquiries"("press_id", "status");

-- ---------- Quotations ----------
CREATE TABLE "quotations" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "quotation_number" TEXT NOT NULL,
  "order_id" TEXT REFERENCES "orders"("id"),
  "client_id" TEXT NOT NULL REFERENCES "clients"("id"),
  "issue_date" TIMESTAMPTZ NOT NULL,
  "valid_until" TIMESTAMPTZ,
  "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal_minor" INTEGER NOT NULL DEFAULT 0,
  "discount_minor" INTEGER NOT NULL DEFAULT 0,
  "tax_minor" INTEGER NOT NULL DEFAULT 0,
  "total_minor" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by_id" TEXT REFERENCES "users"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("press_id", "quotation_number")
);
CREATE INDEX "quotations_press_id_client_id_idx" ON "quotations"("press_id", "client_id");

CREATE TABLE "quotation_line_items" (
  "id" TEXT PRIMARY KEY,
  "quotation_id" TEXT NOT NULL REFERENCES "quotations"("id") ON DELETE CASCADE,
  "particulars" TEXT NOT NULL,
  "qty" DECIMAL(12,2) NOT NULL,
  "rate_minor" INTEGER NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "quotation_line_items_quotation_id_idx" ON "quotation_line_items"("quotation_id");

-- ---------- Invoices (Bill / Cash Memo) ----------
CREATE TABLE "invoices" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "invoice_number" TEXT NOT NULL,
  "order_id" TEXT REFERENCES "orders"("id"),
  "client_id" TEXT NOT NULL REFERENCES "clients"("id"),
  "issue_date" TIMESTAMPTZ NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
  "subtotal_minor" INTEGER NOT NULL DEFAULT 0,
  "discount_minor" INTEGER NOT NULL DEFAULT 0,
  "tax_minor" INTEGER NOT NULL DEFAULT 0,
  "total_minor" INTEGER NOT NULL DEFAULT 0,
  "amount_paid_minor" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by_id" TEXT REFERENCES "users"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("press_id", "invoice_number")
);
CREATE INDEX "invoices_press_id_client_id_idx" ON "invoices"("press_id", "client_id");

CREATE TABLE "invoice_line_items" (
  "id" TEXT PRIMARY KEY,
  "invoice_id" TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "particulars" TEXT NOT NULL,
  "qty" DECIMAL(12,2) NOT NULL,
  "rate_minor" INTEGER NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- ---------- Delivery Challans ----------
CREATE TABLE "delivery_challans" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "challan_number" TEXT NOT NULL,
  "order_id" TEXT REFERENCES "orders"("id"),
  "client_id" TEXT NOT NULL REFERENCES "clients"("id"),
  "issue_date" TIMESTAMPTZ NOT NULL,
  "status" "ChallanStatus" NOT NULL DEFAULT 'PENDING',
  "delivered_by" TEXT,
  "received_by" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("press_id", "challan_number")
);
CREATE INDEX "delivery_challans_press_id_client_id_idx" ON "delivery_challans"("press_id", "client_id");

CREATE TABLE "delivery_challan_items" (
  "id" TEXT PRIMARY KEY,
  "challan_id" TEXT NOT NULL REFERENCES "delivery_challans"("id") ON DELETE CASCADE,
  "particulars" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "delivery_challan_items_challan_id_idx" ON "delivery_challan_items"("challan_id");

-- ---------- Payments & ledgers ----------
CREATE TABLE "payments" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "client_id" TEXT NOT NULL REFERENCES "clients"("id"),
  "invoice_id" TEXT REFERENCES "invoices"("id"),
  "amount_minor" INTEGER NOT NULL,
  "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  "reference" TEXT,
  "paid_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "received_by_id" TEXT REFERENCES "users"("id"),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "payments_press_id_client_id_idx" ON "payments"("press_id", "client_id");

CREATE TABLE "client_ledger_entries" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "client_id" TEXT NOT NULL REFERENCES "clients"("id"),
  "entry_type" "LedgerEntryType" NOT NULL,
  "invoice_id" TEXT REFERENCES "invoices"("id"),
  "payment_id" TEXT REFERENCES "payments"("id"),
  "debit_minor" INTEGER NOT NULL DEFAULT 0,
  "credit_minor" INTEGER NOT NULL DEFAULT 0,
  "running_balance_minor" INTEGER NOT NULL,
  "description" TEXT,
  "entry_date" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "client_ledger_entries_press_client_date_idx" ON "client_ledger_entries"("press_id", "client_id", "entry_date");

CREATE TABLE "vendor_ledger_entries" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "vendor_id" TEXT NOT NULL REFERENCES "vendors"("id"),
  "entry_type" "LedgerEntryType" NOT NULL,
  "debit_minor" INTEGER NOT NULL DEFAULT 0,
  "credit_minor" INTEGER NOT NULL DEFAULT 0,
  "running_balance_minor" INTEGER NOT NULL,
  "description" TEXT,
  "entry_date" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "vendor_ledger_entries_press_vendor_date_idx" ON "vendor_ledger_entries"("press_id", "vendor_id", "entry_date");

-- ---------- Document numbering ----------
CREATE TABLE "document_sequences" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "document_type" "DocumentType" NOT NULL,
  "year" INTEGER NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 0,
  UNIQUE ("press_id", "document_type", "year")
);

-- ---------- Assets & cross-press sharing ----------
CREATE TABLE "assets" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "order_id" TEXT REFERENCES "orders"("id"),
  "inquiry_id" TEXT REFERENCES "inquiries"("id"),
  "file_name" TEXT NOT NULL,
  "file_type" "AssetFileType" NOT NULL,
  "storage_key" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_raw_artwork" BOOLEAN NOT NULL DEFAULT false,
  "uploaded_by_id" TEXT REFERENCES "users"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "assets_press_id_order_id_idx" ON "assets"("press_id", "order_id");

CREATE TABLE "press_partnerships" (
  "id" TEXT PRIMARY KEY,
  "press_a_id" TEXT NOT NULL REFERENCES "presses"("id"),
  "press_b_id" TEXT NOT NULL REFERENCES "presses"("id"),
  "status" "PartnershipStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("press_a_id", "press_b_id")
);

CREATE TABLE "shared_assets" (
  "id" TEXT PRIMARY KEY,
  "asset_id" TEXT NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
  "press_partnership_id" TEXT NOT NULL REFERENCES "press_partnerships"("id"),
  "shared_by_press_id" TEXT NOT NULL REFERENCES "presses"("id"),
  "shared_with_press_id" TEXT NOT NULL REFERENCES "presses"("id"),
  "order_id" TEXT REFERENCES "orders"("id"),
  "permission" "SharePermission" NOT NULL DEFAULT 'VIEW',
  "shared_by_id" TEXT REFERENCES "users"("id"),
  "expires_at" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "shared_assets_shared_with_press_id_idx" ON "shared_assets"("shared_with_press_id");
CREATE INDEX "shared_assets_asset_id_idx" ON "shared_assets"("asset_id");

-- ---------- Audit ----------
CREATE TABLE "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "press_id" TEXT NOT NULL REFERENCES "presses"("id") ON DELETE CASCADE,
  "user_id" TEXT REFERENCES "users"("id"),
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "audit_logs_press_entity_idx" ON "audit_logs"("press_id", "entity_type", "entity_id");
