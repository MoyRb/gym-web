# Stripe Live Launch — Manual Steps

## Preconditions

1. **Stripe account activated**: Business details, bank account, and identity verification
   must be complete in Stripe Dashboard before any live payments can be processed.
   All fiscal/banking data stays in Stripe — never stored in Alpha Trainer.

2. **Live data is completely separate from Sandbox/Test data.**
   - Sandbox `cus_`, `sub_`, `price_`, `prod_` objects are NOT usable in Live.
   - Live webhook secret (`whsec_live_...`) is different from Sandbox.
   - Do not attempt to reuse any Sandbox IDs.

---

## Step 1 — Create Live Product in Stripe Dashboard

Stripe Dashboard → Products (Live mode) → Add product:

- Name: `Alpha Trainer Pro`
- Billing: Recurring, $99 MXN, Monthly
- Copy the resulting `price_LIVE_...` ID — this is your `STRIPE_PRO_MONTHLY_PRICE_ID`.

---

## Step 2 — Create Live Webhook Endpoint

Stripe Dashboard → Developers → Webhooks (Live mode) → Add endpoint:

- Endpoint URL: `https://alphatrainer.net/api/stripe/webhook`
- Listen to events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Copy the signing secret (`whsec_live_...`) — this is your `STRIPE_WEBHOOK_SECRET`.

---

## Step 3 — Configure Stripe Customer Portal (Live)

Stripe Dashboard → Settings → Billing → Customer Portal (Live mode):

The Sandbox and Live portal configurations are INDEPENDENT. You must configure Live separately:

- ✅ Allow customers to update payment methods
- ✅ Allow customers to view invoice history / receipts
- ✅ Allow customers to cancel subscriptions
- Set cancellation behavior: cancel at period end (not immediate)
- Branding: add Alpha Trainer logo and colors

---

## Step 4 — Vercel Environment Variables (PRODUCTION only)

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value | Environment |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production only |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | `price_LIVE_...` | Production only |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_...` | Production only |

**CRITICAL rules:**
- `sk_live_` keys MUST NOT be set in Preview or Development environments.
- Preview and Development use `sk_test_` keys (Sandbox).
- Never set `NEXT_PUBLIC_STRIPE_SECRET_KEY` — keys must never be exposed to the browser.
- Stripe-hosted Checkout requires no publishable key for V1.

---

## Step 5 — Apply Billing Webhook Status Migration

Before going live, apply this migration to Production (remote Supabase):

```
supabase/migrations/20260902000001_webhook_events_status.sql
```

Command (review SQL first):
```bash
supabase db push --project-ref <your-ref>
```

This migration adds `status`, `attempt_count`, `last_error_code`, `updated_at` to
`billing_webhook_events` and grants `UPDATE` to service_role.

---

## Step 6 — livemode Note

Stripe Live webhook events have `livemode: true`. Our webhook signing secret for Live
automatically isolates Live from Test events (different secrets, different endpoints).

The current code does not explicitly reject `livemode: false` events, but the signing
secret provides the isolation guarantee. No code change needed for V1.

---

## Reconciliation / Recovery

If a webhook event ever fails and needs manual re-sync:

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
| `STRIPE_PRO_MONTHLY_PRICE_ID` | `price_LIVE_...` | `price_test_...` | `price_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_...` | `whsec_test_...` | `whsec_test_...` |
