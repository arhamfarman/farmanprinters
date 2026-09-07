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

### Deployment (Netlify)

- **Build:** `netlify.toml` runs `npx prisma generate && npm run build`, publishes `.next`, and loads `@netlify/plugin-nextjs` — the plugin adapts the *standard* Next.js build output into Netlify Functions/Edge Functions for SSR, API routes, middleware, and Server Actions itself; that's why `next.config.mjs` deliberately does **not** set `output: "standalone"` (or `"export"`, which would break all of that outright) — forcing standalone would conflict with the plugin's own tracing rather than help it.
- **Belt-and-suspenders Prisma generation:** both `package.json`'s `build` script (`prisma generate && next build`) and its `postinstall` hook (`prisma generate`) run generation independently of `netlify.toml`'s command string, so the Prisma Client can never be stale/missing regardless of which exact command a given CI step invokes.
- **Environment variables** (Site settings → Environment variables in the Netlify UI — see the full checklist below): `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `EMAIL_SERVER`, `EMAIL_FROM`, `STORAGE_DRIVER` + its matching Supabase/S3 creds. None of these are committed — `.env` is gitignored, `.env.example` documents the shape.
- **Multi-environment auth caveat:** next-auth v4 (not v5/Auth.js) has no "trust any host" option, so `NEXTAUTH_URL` needs to be set per Netlify deploy context (Production gets the real domain). Ephemeral per-PR deploy-preview URLs can't be predicted ahead of time, so sign-in flows on those specifically are a known rough edge unless that branch's `NEXTAUTH_URL` is overridden manually.
- **Function timeout:** `@react-pdf/renderer` PDF generation runs inside whatever Netlify Function `api/documents/[type]/[id]/pdf` gets traced into. Netlify does not expose a configurable timeout for standard Functions anywhere (not `netlify.toml`, not the UI) — it's a hard platform limit tied to plan (10s Starter, 26s Pro+). A single-page Bill/Quotation/Challan renders in well under a second today, so this is comfortably fine; it's noted here because "just set the timeout to 26s" isn't actually an available knob if a future document gets big enough to need it (a Background Function or external render worker would be the real fix).

**Netlify UI setup checklist** (first-time site setup):
1. **New site from Git** → connect the `farmanprinters` GitHub repo → branch `main`. Base directory: leave blank (the Next.js app is the repo root, not a monorepo subfolder — confirmed via `git status`/`.git` location).
2. Build settings should auto-populate from `netlify.toml` (command, publish dir, plugin) — verify they show up rather than re-typing them.
3. **Site settings → Environment variables → Add a variable**, one at a time:
   - `DATABASE_URL`, `DIRECT_URL` — the same Supabase connection strings as local `.env` (percent-encode the password if it has `+ # %` or other reserved URI characters — see Session Milestone 3). Mark as sensitive/secret values.
   - `NEXTAUTH_URL` — scope this one **by deploy context**: Production = your real Netlify/custom domain (`https://<site>.netlify.app` or your domain); leave branch/preview contexts unset unless you're actively testing auth on a specific branch (see the caveat above).
   - `NEXTAUTH_SECRET` — generate a fresh one for production (`openssl rand -base64 32`), don't reuse a value that's ever sat in a local `.env` file.
   - `EMAIL_SERVER`, `EMAIL_FROM` — real SMTP creds so magic-link emails actually send in production (without these, `auth-options.ts` falls back to console-logging the link, which nobody can see on a deployed site's server logs in practice).
   - `STORAGE_DRIVER` (`supabase` or `s3`) + the matching credential set (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_STORAGE_BUCKET`, or `AWS_S3_BUCKET`/`AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`).
   - `DEFAULT_CURRENCY`/`DEFAULT_TIMEZONE` from `.env.example` are currently unread by any code (`grep` confirms zero references) — safe to skip until something actually consumes them, don't treat their presence in `.env.example` as a requirement.
4. **Deploy** and watch the build log for the `prisma generate` step succeeding before `next build` starts.
5. Post-deploy: run `npm run db:verify` **locally** (against the same `DATABASE_URL`) to confirm the deployed app and your local checks are looking at the same live data, since there's only one Supabase database, not a separate one per environment yet.

---

## 2. Directory & Route Map

> Corrected against the actual repo below — everything lives under `src/`
> (see `tsconfig.json`'s `@/*` → `./src/*` alias), and dashboard
> catalog/pricing management is still a placeholder inside `settings/`,
> not its own `catalog/` folder yet.

```
farmanprinters/
├── src/
│   ├── app/
│   │   ├── (auth)/             # /auth/magic-link — client-portal-branded sign-in request page
│   │   ├── (dashboard)/        # Internal Staff ERP (staff roles only, see middleware.ts)
│   │   │   ├── orders/         # ⭐ Kanban/table job pipeline
│   │   │   ├── quotations/     # Quote builder & list
│   │   │   ├── invoices/       # Bill Book / Cash Memos + Ledger posting
│   │   │   ├── challans/       # Delivery Challans
│   │   │   ├── clients/        # Client list & ⭐ Client Ledger pages
│   │   │   ├── network/        # Inter-press partnership + asset sharing
│   │   │   └── settings/       # Placeholder — press profile / catalog pricing TBD
│   │   ├── (portal)/           # Client-facing portal (NGOs & Companies), role=CLIENT only
│   │   │   └── client/dashboard, orders, ledger
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
├── prisma/                     # schema.prisma, seed.ts, verify.ts, verify-e2e.ts
└── PROJECT_CONTEXT.md          # <--- THIS LIVING CONTEXT FILE
```

---

## 3. Data Model Summary (Prisma Schema Overview)

- **User / Account / Session / VerificationToken:** NextAuth Prisma Adapter models. `User` carries `pressId`, `role`, and an optional `clientId` (set only for role=`CLIENT`) alongside the standard NextAuth fields.
- **Press:** Multi-tenancy entity representing a printing press workspace.
- **Client:** Corporate/NGO clients linked with ledger tracking (address, `ntnNumber`, `strnNumber`, phone). `Client.users` holds any portal logins granted against it.
- **CatalogItem:** Print items with a free-text `unit` field (e.g. `"sq ft"` for Panaflex, `"piece"` for Shields/Mugs/Stamps, `"1000 pcs"` for Letterheads) and a `defaultRateMinor` — there's no `unit` enum today, just a plain string, so keep casing/spelling consistent per press.
- **Order / Job:** Workflow pipeline: `INQUIRY` ➔ `QUOTATION` ➔ `APPROVED` ➔ `IN_PRODUCTION` ➔ `READY` ➔ `DELIVERED` ➔ `COMPLETED` (+ `CANCELLED` off any stage). Invoice/Challan issuance is deliberately decoupled from this pipeline — see `order-status.ts`. An `Order` is only ever created by staff (`requireRole(ALL_STAFF)` in `order-actions.ts`) — the public site never writes one directly.
- **Inquiry / InquiryItem:** The public "Request a Quote" form's actual write target — unauthenticated, so it deliberately targets this staff-triage table instead of `Order` (see `inquiry-actions.ts`'s file comment). `InquiryItem` holds structured catalog-item selections (`catalogItemId`, `quantity`, free-text `notes` for dimensions/specs); `Inquiry.message` is optional now that items can carry the request instead of prose. Nothing converts an `Inquiry` to an `Order` yet — `convertedOrderId` is ready for it, but the action doesn't exist.
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

### Session Milestone 4 (Public Inquiry → live DB, Magic-Link UX, Live Ledger Verification)
- ⚠️ **Deviated from the literal task on one point, deliberately:** the public inquiry form writes an `Inquiry` (+ new `InquiryItem` rows), not an `Order`. Order is the RBAC-gated production/billing pipeline every dashboard action guards with `requireRole(ALL_STAFF)`; letting anonymous internet traffic write directly into it would mean anyone can post rows onto the staff Kanban board with zero qualification — a spam/data-integrity risk, and a reversal of the Inquiry-first design `ARCHITECTURE.md` already documented. Kept the staff-triage step; made the Inquiry itself structured instead (see below) so it carries as much of the original ask as safely possible. Converting an Inquiry to an Order is still a manual/future step — not built this session.
- ✅ Added `InquiryItem` model (catalog-item selection + qty + notes) and made `Inquiry.message` optional; two new migrations applied live (`add_inquiry_items`, `inquiry_message_optional`).
- ✅ Rebuilt `InquiryForm.tsx` with a catalog-item picker (grouped by category, qty + dimensions/notes per item) backed by a new `listCatalogItemsForInquiry()` in `catalog-actions.ts`; `createInquiry` now validates every selected `catalogItemId` actually belongs to the press before writing.
- ✅ Magic-link auth has a real environment fallback: `auth-options.ts`'s `EmailProvider` uses a custom `sendVerificationRequest` that sends via `nodemailer` when `EMAIL_SERVER` is set, otherwise logs the sign-in link to the server console — local dev needs zero SMTP setup now.
- ✅ New `(auth)/magic-link` route — a client-portal-branded sign-in request page (`signIn("email", ...)` from `next-auth/react`), deliberately vague about whether an email actually has access either way, to avoid leaking which emails are provisioned. `middleware.ts` now bounces unauthenticated `/client/*` requests here instead of NextAuth's generic provider-list page.
- ✅ New `/client/dashboard` (portal landing page after sign-in): active orders, ledger summary, recent bills with PDF download links. Needed a real fix to get there: `api/documents/[type]/[id]/pdf/route.ts` and `pdf/render.ts` were staff-only (`requireRole(ALL_STAFF)`) — reworked to accept any signed-in session and enforce ownership inside `render.ts` (`assertAccess`: staff = same press, CLIENT = same press *and* same `clientId`), so a client can now fetch their own invoice PDFs but not another client's.
- ✅ `invoice-actions.ts`'s `createInvoice` now posts its `ClientLedgerEntry` inside the *same* `$transaction` as the `Invoice` create, not two separate transactions afterward — extracted `postInvoiceToLedgerTx(tx, invoiceId)` in `ledger-actions.ts` so both the standalone `postInvoiceToLedger` and `createInvoice` share one code path.
- ✅ Added `prisma/verify-e2e.ts` (`npm run db:verify:e2e`) — an actual **live** round-trip test, not just a build check: calls the real `createInquiry` action and the real `postInvoiceToLedgerTx` transaction against the live Supabase DB, asserts the ledger math (`45,000 → 45,525` for a 15 sq ft Panaflex test invoice), then deletes everything it created. Ran successfully; `db:verify` re-run afterward confirmed zero residue.
- ✅ Re-verified clean `tsc --noEmit`, `eslint`, and `next build` (against the live `.env`, not a dummy one this time).

### Session Milestone 5 (Netlify Deployment Configuration)
- ✅ Added `netlify.toml`: build command (`npx prisma generate && npm run build`), `publish = ".next"`, `@netlify/plugin-nextjs` (also added as a devDependency, `^5.15.13`).
- ✅ `package.json`'s `build` script now runs `prisma generate` itself (`prisma generate && next build`), and a new `postinstall` hook (`prisma generate`) runs it again independently — belt-and-suspenders so the client can't go stale/missing regardless of which exact command a CI step invokes.
- ⚠️ **Corrected two parts of the literal task spec that don't actually exist/work as asked, rather than shipping fake-but-compiling config:**
  - *Function timeout:* Netlify has no configurable timeout for standard Functions anywhere — not `netlify.toml`, not the UI. It's a hard platform limit by plan (10s Starter / 26s Pro+). `netlify.toml`'s `[functions]` block documents this instead of setting a `timeout` key that Netlify would just silently ignore.
  - *`trustHost`:* not a real field on next-auth v4's `AuthOptions` (that's a v5/Auth.js-only option) — adding it failed `tsc --noEmit` immediately. Removed it; documented the real fix instead (scope `NEXTAUTH_URL` per Netlify deploy context — see Section 1).
- ✅ `next.config.mjs` deliberately still doesn't set `output: "standalone"` — documented why: `@netlify/plugin-nextjs` adapts the standard `.next` build output itself, and standalone mode would conflict with its own tracing rather than help it.
- ✅ `.gitignore` gained `.netlify` (the CLI's local site-link/cache state).
- ✅ Full Netlify UI setup checklist (env vars, per-context `NEXTAUTH_URL`, post-deploy verification) written into Section 1 above.
- ✅ Re-verified clean `tsc --noEmit`, `eslint`, and a full `npm run build` (which now also exercises the new `prisma generate && next build` script for the first time).
- ⚠️ **Not verified:** no actual Netlify deploy was run — this environment has no Netlify CLI/account access, so `netlify.toml` is written from documented, well-established `@netlify/plugin-nextjs` conventions but genuinely untested end-to-end, unlike the Supabase work in earlier milestones which ran against a live database. Watch the first real deploy's build log closely.

---

## 5. Next Immediate Objectives & Open Tasks

1. **First real Netlify deploy:** connect the repo, set env vars per the Section 1 checklist, and watch the build — this session's `netlify.toml`/script changes are unverified against the actual platform.
2. **Inquiry → Order conversion:** No staff-facing action/UI turns a qualified `Inquiry` (with its `InquiryItem`s) into an `Order` yet — `Order.inquirySource`/`Inquiry.convertedOrderId` are ready for it in the schema, just unwired.
3. **Magic-link email delivery:** `EMAIL_SERVER`/`EMAIL_FROM` in `.env` are still placeholders — the dev console-log fallback works today, but real SMTP creds (Ethereal/Mailtrap for dev, a real transactional provider for prod) are needed before a client actually receives an email. `SUPABASE_STORAGE_BUCKET="fpp-assets"` also still needs to actually exist in the Supabase project's Storage tab before uploads work.
4. **Inter-Press Sharing:** End-to-end testing of B2B design file sharing between partner presses — needs a second seeded Press + an `ACTIVE` `PressPartnership` to test against.
5. **Dashboard catalog management UI:** `settings/page.tsx` is still a placeholder — no staff-facing CRUD for `ProductCategory`/`CatalogItem` pricing yet.
6. **Manual UI click-through:** everything above is verified at the code/data layer (`tsc`, `eslint`, `next build`, and live DB round-trips) but nobody has clicked through the actual rendered pages in a browser yet.

---

## 6. Guidelines for AI Assistants (Claude Instructions)

When resuming work on this repository:
1. **Read this entire file first** to understand the state of the codebase.
2. **Never break type-checking or linting:** Always run `npx tsc --noEmit` and `npm run lint` before claiming a task is done.
3. **Update this file at the end of every task/session:** Add completed items under Section 4 (as a new "Session Milestone" entry) and update Section 5 so the next session — or engineer — doesn't have to re-derive context from scratch by re-reading the whole diff history.
4. **Treat this file as a snapshot to verify, not a source of truth to trust blindly:** cross-check its claims (roles, statuses, model names, directory paths) against the actual schema/code before acting on them, and correct this file if it's drifted out of sync — don't propagate a stale claim into new work.
