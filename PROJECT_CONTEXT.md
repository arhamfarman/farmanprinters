# FarmanPrinters — Project Context & Session Ledger

> **App Name:** FarmanPrinters
> **Target Audience:** Small to Medium Printing Press Businesses in Pakistan (Islamabad/Rawalpindi & nationwide)
> **Primary Use Cases:** ERP, Digital Bill Book / Cash Memos, Quotations, Delivery Challans, Customer Ledgers, Asset/Design File Sharing (.cdr, .pdf, .ai), and B2B Inter-Press Collaboration.
> **Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Shadcn UI, Prisma ORM, PostgreSQL (Supabase/Local), NextAuth.js (Credentials + Magic Link), AWS S3 / Supabase Storage, `@react-pdf/renderer`.

---

## 1. High-Level Architecture & Tech Stack

- **Framework:** Next.js 14 (React 18 / App Router)
- **Database & ORM:** PostgreSQL with Prisma ORM
- **Auth & RBAC:** NextAuth.js JWT-based session with roles (`ADMIN`, `DESIGNER`, `PRODUCTION`, `ACCOUNTANT`, `CLIENT`) — CLIENT is a role on the same `User` table, not a separate login system; a CLIENT user's `clientId` links it to its `Client` business record.
- **Storage Driver:** Dual driver in `server/services/storage.ts` supporting AWS S3 and Supabase Storage (REST) for large CDR/PDF design files.
- **Document Generation:** Server-side rendering using `@react-pdf/renderer` (`components/documents/*`).
- **Server Actions:** All data mutations follow strict `requireRole()` / `requireClientSession()` authorization and `revalidatePath()` rehydration patterns.

---

## 2. Directory & Route Map

> Corrected against the actual repo below — everything lives under `src/`
> (see `tsconfig.json`'s `@/*` → `./src/*` alias), there's no `(auth)` route
> group (NextAuth's own `/api/auth/*` pages cover sign-in), and dashboard
> catalog/pricing management is still a placeholder inside `settings/`,
> not its own `catalog/` folder yet.

```
farmanprinters/
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # Internal Staff ERP (staff roles only, see middleware.ts)
│   │   │   ├── orders/         # ⭐ Kanban/table job pipeline
│   │   │   ├── quotations/     # Quote builder & list
│   │   │   ├── invoices/       # Bill Book / Cash Memos + Ledger posting
│   │   │   ├── challans/       # Delivery Challans
│   │   │   ├── clients/        # Client list & ⭐ Client Ledger pages
│   │   │   ├── network/        # Inter-press partnership + asset sharing
│   │   │   └── settings/       # Placeholder — press profile / catalog pricing TBD
│   │   ├── (portal)/           # Client-facing portal (NGOs & Companies), role=CLIENT only
│   │   ├── (public)/           # Landing page, catalog, and Quote Inquiry form
│   │   └── api/                # REST API routes + NextAuth ([...nextauth]) endpoint
│   ├── components/
│   │   ├── documents/          # React-PDF printable documents (Bill, Quotation, Challan)
│   │   └── ui/                 # Dependency-free stand-in primitives (swap for shadcn CLI later)
│   ├── server/
│   │   ├── actions/            # Server actions (orders, quotations, invoices, challans,
│   │   │                       #   clients, assets, network, catalog, inquiry, portal)
│   │   └── services/           # storage.ts (S3/Supabase) + pdf/render.ts drivers
│   └── lib/                    # currency, order-status, validation (zod), press-code
├── prisma/                     # schema.prisma & seed.ts
└── PROJECT_CONTEXT.md          # <--- THIS LIVING CONTEXT FILE
```

---

## 3. Data Model Summary (Prisma Schema Overview)

- **User / Account / Session / VerificationToken:** NextAuth Prisma Adapter models. `User` carries `pressId`, `role`, and an optional `clientId` (set only for role=`CLIENT`) alongside the standard NextAuth fields.
- **Press:** Multi-tenancy entity representing a printing press workspace.
- **Client:** Corporate/NGO clients linked with ledger tracking (address, `ntnNumber`, `strnNumber`, phone). `Client.users` holds any portal logins granted against it.
- **CatalogItem:** Print items with a free-text `unit` field (e.g. `"sq ft"` for Panaflex, `"piece"` for Shields/Mugs/Stamps, `"1000 pcs"` for Letterheads) and a `defaultRateMinor` — there's no `unit` enum today, just a plain string, so keep casing/spelling consistent per press.
- **Order / Job:** Workflow pipeline: `INQUIRY` ➔ `QUOTATION` ➔ `APPROVED` ➔ `IN_PRODUCTION` ➔ `READY` ➔ `DELIVERED` ➔ `COMPLETED` (+ `CANCELLED` off any stage). Invoice/Challan issuance is deliberately decoupled from this pipeline — see `order-status.ts`.
- **Invoice & ClientLedgerEntry:** Cash memo records linked to client ledger debit/credit transactions with local PKR payment methods (`CASH`, `BANK_TRANSFER`, `CHEQUE`, `EASYPAISA`, `JAZZCASH`, `CARD`, `OTHER`).
- **Asset / PressPartnership / SharedAsset:** Heavy design files (.cdr, .ai, .pdf) attached to an Order, shared cross-press once two presses have an `ACTIVE` `PressPartnership` — there's no separate `NetworkShare` model, sharing is `SharedAsset` scoped to one partnership + one asset.

---

## 4. Current Progress & Completed Features

### Session Milestone 1 (Scaffold & Build Verification)
- ✅ Initial runnable scaffold created with root layout, HSL color tokens, and NextAuth route handlers.
- ✅ Middleware RBAC gate configured for `/dashboard/*` and `/client/*`.
- ✅ Storage service abstraction built for S3 and Supabase REST.
- ✅ `@react-pdf/renderer` templates implemented (`BillPdf`, `QuotationPdf`, `ChallanPdf`).
- ✅ All core server actions implemented with Zod validation and role checks.
- ✅ Clean `next build`, `tsc --noEmit`, and `eslint` validation verified.
- ✅ Git initialized and pushed clean first commit to repo.

### Session Milestone 2 (Schema Rework, RBAC + Magic-Link Auth)
- ✅ `UserRole` migrated to `ADMIN | DESIGNER | PRODUCTION | ACCOUNTANT | CLIENT`; `OrderStatus` migrated to `INQUIRY | QUOTATION | APPROVED | IN_PRODUCTION | READY | DELIVERED | COMPLETED | CANCELLED`; `ServiceItem` renamed to `CatalogItem`.
- ✅ Added the standard NextAuth Prisma Adapter models (`Account`, `Session`, `VerificationToken`) and wired `@next-auth/prisma-adapter` into `auth-options.ts`.
- ✅ Client portal auth is real: NextAuth Email (magic-link) provider, gated so only a pre-provisioned `role=CLIENT` user can sign in — the Adapter's `createUser` is overridden to always throw, so nobody can self-register a login. Staff create a portal login via `grantClientPortalAccess` (`client-actions.ts`).
- ✅ Collapsed `StaffSession`/`ClientPortalSession` into one `Session` shape (`{ userId, pressId, role, clientId }`) in `server/auth.ts`; `middleware.ts` and every server action updated to match.
- ✅ Document numbering prefix for bills changed `BILL` → `INV` (e.g. `FPP-INV-2026-001`), padding `6` → `3` digits.
- ✅ `Client.strnNumber` added; `prisma/seed.ts` rewritten for "Farman Printing Press - Islamabad", an ADMIN + DESIGNER staff login, the "Society for Education & Development" NGO client with a PKR 45,000 opening ledger balance, and the 6 requested catalog items.
- ✅ Re-verified clean `prisma validate`, `tsc --noEmit`, `eslint`, and `next build` after the refactor.

### Session Milestone 3 (Live Database Provisioned, Migrated & Seeded)
- ✅ Connected to a real Supabase Postgres project (`xjgfslpifpndchbdpowx`); `fpp-erp/.env` populated with `DATABASE_URL`/`DIRECT_URL` (password percent-encoded — it contains `+ # %`, each of which breaks URI parsing unencoded), `SUPABASE_URL`, and the correct `SUPABASE_SERVICE_ROLE_KEY` (had to catch and correct two mismatched-project key pastes along the way — always decode/verify a Supabase JWT's `ref` claim against the confirmed project before trusting it).
- ✅ Deleted the stale hand-authored `prisma/migrations/0001_init` (predated this session's schema rework, never applied anywhere) and generated a fresh one straight from current `schema.prisma` via `npx prisma migrate dev --name init` — applied cleanly.
- ✅ `npm run db:seed` populated the live DB successfully.
- ✅ Added `prisma/verify.ts` (`npm run db:verify`) — a keeper smoke-test script, not scratch: joins Press → User → Client → CatalogItem → Order → ClientLedgerEntry and bcrypt-checks the seeded admin password the same way `auth-options.ts`'s Credentials provider does. All checks pass against the live DB.

---

## 5. Next Immediate Objectives & Open Tasks

1. **Paperwork UI Testing:** Verify interactive creation of Bills/Invoices and automatic posting to Client Ledger against the now-live DB (`npm run dev`).
2. **Magic-link email delivery:** The Email provider is wired correctly but `EMAIL_SERVER`/`EMAIL_FROM` in `.env` are still placeholders — need real SMTP creds (Ethereal/Mailtrap for dev, a real transactional provider for prod) before a magic link actually sends. `SUPABASE_STORAGE_BUCKET="fpp-assets"` also still needs to actually exist in the Supabase project's Storage tab before uploads work.
3. **Inter-Press Sharing:** End-to-end testing of B2B design file sharing between partner presses — needs a second seeded Press + an `ACTIVE` `PressPartnership` to test against.
4. **Dashboard catalog management UI:** `settings/page.tsx` is still a placeholder — no staff-facing CRUD for `ProductCategory`/`CatalogItem` pricing yet.

---

## 6. Guidelines for AI Assistants (Claude Instructions)

When resuming work on this repository:
1. **Read this entire file first** to understand the state of the codebase.
2. **Never break type-checking or linting:** Always run `npx tsc --noEmit` and `npm run lint` before claiming a task is done.
3. **Update this file at the end of every task/session:** Add completed items under Section 4 (as a new "Session Milestone" entry) and update Section 5 so the next session — or engineer — doesn't have to re-derive context from scratch by re-reading the whole diff history.
4. **Treat this file as a snapshot to verify, not a source of truth to trust blindly:** cross-check its claims (roles, statuses, model names, directory paths) against the actual schema/code before acting on them, and correct this file if it's drifted out of sync — don't propagate a stale claim into new work.
