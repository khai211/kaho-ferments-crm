# F&B Ordering App

Customer-facing dine-in ordering app: browse menu → cart → checkout → pay via
HitPay (SG PayNow) → confirmation page. Next.js App Router + Supabase.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (any region close to you).
2. Once it's provisioned, open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql) — creates `menu_items`, `orders`, `order_items`, and RLS policies.
3. Optionally run [`supabase/seed.sql`](supabase/seed.sql) for sample menu items, or add your own via **Table Editor**.
4. Go to **Project Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret — server-side only)

## 2. Set up HitPay (sandbox)

1. Create a sandbox account at [HitPay](https://www.hitpayapp.com) (or use an existing business account's sandbox mode).
2. Go to **Payment Gateway > API Keys**. Copy the API key → `HITPAY_API_KEY`.
3. Leave `HITPAY_ENV=sandbox` for testing; switch to `production` (with live keys) when you go live.
4. For sandbox PayNow payments, HitPay provides a mock payment simulator on the hosted checkout page — no real bank required.

No webhook setup needed, and this works the same on `localhost` as in production — see "How it fits together" below.

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the values from steps 1 and 2.

## 4. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it fits together

- **`app/page.tsx`** — Server Component, reads `menu_items` with the anon key (RLS: public read-only).
- **`app/checkout/page.tsx`** — Client Component; cart lives in `lib/cart-context.tsx` (localStorage-backed).
- **`app/api/checkout/route.ts`** — Route Handler. Uses the service-role key to write `orders`/`order_items` (browser has no direct write access), re-prices the cart from the DB (never trusts client-sent prices), then calls HitPay's `POST /v1/payment-requests` and returns the hosted checkout URL to redirect to. An `idempotencyKey` generated once per checkout attempt makes double-taps / retried submissions return the same order instead of creating duplicates.
- **`app/api/order/[reference]/route.ts`** — Route Handler polled by the confirmation page. While an order is `pending`, it calls HitPay's `GET /v1/payment-requests/{id}` (an outbound call our server makes — no public webhook endpoint required) and persists the result. This, not the customer's browser redirect, is the source of truth for payment status.
- **`app/order/[reference]/page.tsx`** + **`components/StatusPoller.tsx`** — confirmation page the customer lands on after paying (`redirect_url`). Polls `/api/order/[reference]` every few seconds while `pending` and refreshes once it changes.

**Why polling instead of a webhook:** HitPay validates the `webhook` field as a publicly reachable URL and rejects `localhost` outright, which breaks local development entirely. Querying `GET /v1/payment-requests/{id}` on demand needs no public endpoint at all, so it behaves identically in dev and production. Trade-off: status only updates while something is actively polling — fine here since the confirmation page does that automatically, but if you need status to update with nobody viewing that page (e.g. a kitchen display), you'd want a periodic server-side job hitting the same endpoint, or to reintroduce a webhook once you have a stable public domain.

## Mini CRM + post-purchase email sequence (Kaho Ferments)

Separate from the dine-in ordering flow above: a customer database and an
editable, timed email sequence for Kaho Ferments' real yogurt/kefir orders
(currently sold via `hitpay.shop/kaho`, not through this app's checkout).

1. Run [`supabase/migrations/002_crm.sql`](supabase/migrations/002_crm.sql) in the Supabase SQL editor (after `schema.sql`) — adds `customers`, `sequence_steps` (seeded with the 3-step sequence + a birthday step), `sequence_sends`, and links `orders` to `customers`.
2. Fill in the new block in `.env.local`: `GMAIL_USER`/`GMAIL_APP_PASSWORD` (Google Account > Security > 2-Step Verification > App passwords), `CRON_SECRET`, `ADMIN_PASSWORD`, `APP_BASE_URL`. Until `GMAIL_APP_PASSWORD` is set, emails log to the console instead of sending — everything else still works.
3. **Order intake**: `POST /api/webhooks/mock-store-order` stands in for HitPay's real online-store order webhook (undocumented payload — this is our own contract, see `lib/types.ts`'s `MockOrderPayload`). Try it with `./scripts/send-mock-order.sh [email]`. It upserts the customer, records the order, and immediately sends the day-0 confirmation; the day-5/day-10 steps are scheduled for later.
4. **Scheduled sends**: `GET /api/cron/run-sequences` (needs `Authorization: Bearer $CRON_SECRET`) sends any due sequence steps and today's birthday rewards. Run it manually in dev, or point a real scheduler (e.g. Vercel Cron) at it daily once deployed.
5. **Editing the sequence**: visit `/admin/sequences` (password-gated by `ADMIN_PASSWORD`) to change subject/body/delay/active per step. Merge tags: `{{first_name}}`, `{{flavor}}`, `{{order_reference}}`, `{{birthday_link}}`.
6. **Birthday capture**: the review-request email includes a `{{birthday_link}}` to `/birthday/[token]` (public, no login — the token is the auth), which saves the customer's birthday.

Not built yet, by design: buy-9-get-1-free purchase loyalty, glass-bottle-return tracking, WhatsApp, and a real (non-mock) HitPay store webhook — all parked for later.

## Scope notes / deviations from a generic spec

- **Order type**: dine-in only, so checkout collects an optional table number instead of an order-type selector.
- **Modifiers**: no separate modifiers table — the menu's suggested data model only has `notes` on `order_items`, so per-item customization is a free-text "special requests" field, matching that schema exactly.
- **Currency/market**: SGD, HitPay's `paynow_online` payment method (left unrestricted in `lib/hitpay.ts` — HitPay shows whichever methods are enabled on your dashboard; pass `payment_methods: ["paynow_online"]` in the `createPaymentRequest` call if you want to force PayNow only).
- Menu photos use `next/image` with `unoptimized` since seed data uses placeholder URLs; configure `images.remotePatterns` in `next.config.ts` and drop `unoptimized` once you're using your own image host, for real optimization.
