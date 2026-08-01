# Kaho Ferments CRM

A customer database and editable, timed post-purchase email sequence for
Kaho Ferments' yogurt/kefir orders (sold via `hitpay.shop/kaho`). Next.js
App Router + Supabase + Gmail SMTP.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **SQL Editor**, run in order:
   - [`supabase/schema.sql`](supabase/schema.sql) — base `orders`/`order_items` tables.
   - [`supabase/migrations/002_crm.sql`](supabase/migrations/002_crm.sql) — `customers`, `sequence_steps` (seeded with the 3-step sequence + a birthday step), `sequence_sends`, links `orders` to `customers`.
   - [`supabase/migrations/003_hitpay_source.sql`](supabase/migrations/003_hitpay_source.sql) — allows `orders.source = 'hitpay_store'` for the real webhook.
3. **Project Settings > API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

## 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in:
- Supabase values from step 1.
- `GMAIL_USER`/`GMAIL_APP_PASSWORD` — Google Account > Security > 2-Step Verification > App passwords (requires 2FA). Until `GMAIL_APP_PASSWORD` is set, emails log to the console instead of sending — everything else still works.
- `CRON_SECRET` — any random string, protects `/api/cron/run-sequences`.
- `ADMIN_PASSWORD` — password for `/admin/sequences`.
- `APP_BASE_URL` — used to build the birthday-capture link in emails.
- `HITPAY_WEBHOOK_SALT` — see step 4.

## 3. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/admin/sequences`.

## 4. Order intake

Two ways orders reach this app, both funnel into `lib/crm/order-received.ts`'s `handleOrderReceived()`:

- **Mock webhook** (`POST /api/webhooks/mock-store-order`) — for quick local testing without touching HitPay at all. Try it with `./scripts/send-mock-order.sh [email]`. Accepts the `MockOrderPayload` shape from `lib/types.ts` directly.
- **Real HitPay webhook** (`POST /api/webhooks/hitpay`) — HitPay's Event Webhook (`order.created`/`order.updated`), HMAC-signature-verified. To set up:
  1. In your HitPay dashboard (production or [sandbox](https://dashboard.sandbox.hit-pay.com) — sandbox has its own store at `sandbox.hitpay.shop/<your-store>` that mirrors production), go to **API Keys > Event Webhook > Add webhook**.
  2. Tick **Order > Created** and **Order > Updated**.
  3. Webhook URL needs to be publicly reachable — HitPay rejects `localhost`. Use a tunnel (e.g. ngrok: `ngrok http 3000`, then `<forwarding-url>/api/webhooks/hitpay`) for local testing, or your deployed URL (e.g. Vercel) once deployed — deploying is simpler since you get a permanent public URL.
  4. Save, copy the webhook's **salt** into `HITPAY_WEBHOOK_SALT`.
  5. Place a test order (sandbox PayNow auto-simulates a successful payment, no real bank needed) and confirm it flows through: customer + order created in Supabase, confirmation email sent/logged.

Either path is idempotent on `order_reference` — safe if HitPay retries or fires both `created` and `updated` for the same paid order.

## 5. Scheduled sends

`GET /api/cron/run-sequences` (needs `Authorization: Bearer $CRON_SECRET`) sends any due sequence steps and today's birthday rewards, each with a dedup guard. Run it manually in dev, or point a scheduler at it daily once deployed.

**On Vercel**: [`vercel.json`](vercel.json) already schedules this daily. Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on cron calls when the env var is named exactly `CRON_SECRET`, so no extra wiring is needed — just set `CRON_SECRET` (and the rest of the env vars) in the project's Vercel settings.

## 6. Editing the sequence

Visit `/admin/sequences` (password-gated by `ADMIN_PASSWORD`) to change subject/body/delay/active per step — this is the "simple email editor." Merge tags available: `{{first_name}}`, `{{flavor}}`, `{{order_reference}}`, `{{birthday_link}}`.

## 7. Birthday capture

The review-request email includes `{{birthday_link}}`, pointing to `/birthday/[token]` (public, no login — the token is the auth), which saves the customer's birthday for the yearly birthday-reward email.

## How it fits together

- `lib/crm/order-received.ts` — the shared core: upserts the customer, records the order, schedules the active sequence steps, sends any `delay_days = 0` step immediately.
- `lib/email/mailer.ts` / `render.ts` — Gmail SMTP sending + `{{merge_tag}}` templating.
- `lib/admin/auth.ts` + `proxy.ts` — password-gates `/admin/**` via a signed session cookie.
- `lib/hitpay.ts` — HMAC verification for the real webhook (`Hitpay-Signature` header, HMAC-SHA256 with the webhook's salt).
- `lib/supabase/admin.ts` — service-role Supabase client, used by every Route Handler (bypasses RLS; never imported into a Client Component).

## Not built yet, by design

Buy-9-get-1-free purchase loyalty, glass-bottle-return tracking, WhatsApp as a channel, and a visual (non-text) email editor — all parked for later.

## Optional: dropping leftover dine-in schema

This project started from a generic dine-in F&B ordering scaffold that's since been removed from the codebase. If your Supabase project still has its `menu_items` table and the `orders`/`order_items` columns that only that flow used, [`supabase/migrations/004_drop_dine_in.sql`](supabase/migrations/004_drop_dine_in.sql) removes them. It's destructive (drops a table), so it's optional and not run automatically — review it before running.
