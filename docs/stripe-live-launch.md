# Stripe Live Launch — Manual Steps

## Preconditions

1. **Stripe account activated**: Business details, bank account, and identity verification
   must be complete in Stripe Dashboard before any live payments can be processed.
   All fiscal/banking data stays in Stripe — never stored in Alpha Trainer.

2. **Live data is completely separate from Sandbox/Test data.**
   - Sandbox `cus_`, `sub_`, `price_`, `prod_` objects are NOT usable in Live.
   - Live webhook secret (`whsec_live_...`) is different from Sandbox.
   - Do not attempt to reuse any Sandbox IDs.

3. **Database migration applied:** Run `supabase/migrations/20260923000000_monetization4.sql`
   against the production DB before switching keys. This migration:
   - Adds `livemode` column to billing tables (existing rows → `false` = Test)
   - Creates gym_partners, referral_attributions, referral_commissions tables

---

## Step 1 — Create Live Product in Stripe Dashboard

Stripe Dashboard → Products (Live mode) → Add product:

- **Name:** `Alpha Trainer Pro`

Create **three prices** on this product:

**Price A — Monthly**
- Currency: MXN
- Amount: $99.00
- Billing: Recurring — Every month (interval=month, interval_count=1)
- Copy the Price ID: `price_LIVE_MONTHLY_...` → this is `STRIPE_PRO_MONTHLY_PRICE_ID`

**Price B — Semiannual (6 months)**
- Currency: MXN
- Amount: $499.00
- Billing: Recurring — Every 6 months (interval=month, interval_count=6)
- Copy the Price ID: `price_LIVE_SEMIANNUAL_...` → this is `STRIPE_PRO_SEMIANNUAL_PRICE_ID`

**Price C — Annual**
- Currency: MXN
- Amount: $899.00
- Billing: Recurring — Every year (interval=year, interval_count=1)
- Copy the Price ID: `price_LIVE_ANNUAL_...` → this is `STRIPE_PRO_ANNUAL_PRICE_ID`

---

## Step 2 — Create Live Webhook Endpoint

Stripe Dashboard → Developers → Webhooks (Live mode) → Add endpoint:

- **Endpoint URL:** `https://alphatrainer.net/api/stripe/webhook`
- **Listen to events:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Copy the signing secret (`whsec_live_...`) → this is `STRIPE_WEBHOOK_SECRET` for Production.

---

## Step 3 — Configure Stripe Customer Portal (Live)

Stripe Dashboard → Settings → Billing → Customer Portal (Live mode):

**CRITICAL:** Sandbox and Live portal configurations are INDEPENDENT. Configure Live separately.

- ✅ Allow customers to update payment methods
- ✅ Allow customers to view invoice history / receipts
- ✅ Allow customers to cancel subscriptions
- Set cancellation behavior: **cancel at period end** (not immediate)
- Products: Add **Alpha Trainer Pro** and enable all three prices (monthly, semiannual, annual)
  so customers can switch periods within the portal
- Branding: add Alpha Trainer logo and colors

---

## Step 4 — Vercel Environment Variables (PRODUCTION only)

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value | Environment |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | **Production only** |
| `STRIPE_LIVE_MODE` | `true` | **Production only** |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | `price_LIVE_MONTHLY_...` | **Production only** |
| `STRIPE_PRO_SEMIANNUAL_PRICE_ID` | `price_LIVE_SEMIANNUAL_...` | **Production only** |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | `price_LIVE_ANNUAL_...` | **Production only** |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_...` | **Production only** |

**CRITICAL rules:**
- `sk_live_` keys MUST NOT be set in Preview or Development environments.
- Preview and Development use `sk_test_` keys (Sandbox).
- `STRIPE_LIVE_MODE=true` MUST NOT be set in Preview or Development.
- Never set `NEXT_PUBLIC_STRIPE_*` — keys must never be exposed to the browser.
- If `STRIPE_LIVE_MODE` and key prefix are inconsistent, the app throws on startup.

---

## Step 5 — Apply Database Migration

Apply to production Supabase:

```bash
supabase db push --project-ref <your-production-ref>
```

Review the SQL in `supabase/migrations/20260923000000_monetization4.sql` before pushing.

---

## Step 6 — Reconciliation / Recovery

If a webhook event fails and needs manual re-sync:

```typescript
// Server-side only — requires service_role access
import { syncStripeSubscription } from "@/lib/stripe/sync"
await syncStripeSubscription("sub_LIVE_...")
```

Also available via: Stripe Dashboard → Webhooks → find the failed event → Resend.

**DO NOT create a public endpoint that accepts arbitrary subscription IDs.**

---

## Vercel Environment Summary

| Variable | Production | Preview | Development |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | `sk_test_...` | `sk_test_...` |
| `STRIPE_LIVE_MODE` | `true` | `false` | `false` |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Live ID | Test ID | Test ID |
| `STRIPE_PRO_SEMIANNUAL_PRICE_ID` | Live ID | Test ID | Test ID |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Live ID | Test ID | Test ID |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_...` | `whsec_test_...` | (Stripe CLI) |

---

## Commission Setup (post-launch)

After first live sale, review admin dashboard:
`/dashboard/admin/partners` → verify partners are created
`/dashboard/admin/partners/commissions` → review pending commissions

**Commission approval workflow:**
1. Verify in Stripe Dashboard: no refunds or disputes on the invoice
2. In admin commissions page: pending → approved
3. After external payment to gym: approved → paid

Never mark commissions "paid" without verifying externally first.
