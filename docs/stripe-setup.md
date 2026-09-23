# Stripe Setup — Alpha Trainer

## Products / Prices

**Product:** Alpha Trainer Pro (one product, three prices)

| Period | Price | Stripe config |
|---|---|---|
| Mensual | $99 MXN | interval=month, interval_count=1 |
| 6 meses | $499 MXN | interval=month, interval_count=6 |
| Anual | $899 MXN | interval=year, interval_count=1 |

All three prices grant the same `plan = pro` entitlement. The period only affects
billing frequency, savings display, and commission group.

---

## Environment Variables

```
# Stripe secret — server-only (NEVER use NEXT_PUBLIC_)
STRIPE_SECRET_KEY=sk_test_...

# Explicit mode flag (required for production Live)
STRIPE_LIVE_MODE=false          # false for Preview/Development, true for Production

# Price IDs — all three required for full functionality
STRIPE_PRO_MONTHLY_PRICE_ID=price_test_...
STRIPE_PRO_SEMIANNUAL_PRICE_ID=price_test_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_test_...

# Webhook signing secret
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Consistency validation:** `isLiveMode()` throws at startup if:
- `STRIPE_LIVE_MODE=true` + `sk_test_` key → config error
- `STRIPE_LIVE_MODE=false` + `sk_live_` key → config error

**Security rules:**
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are **server-only**. Never `NEXT_PUBLIC_` prefix.
- Price IDs are server-only. The browser sends only `billingPeriod: "monthly"|"semiannual"|"annual"`.
- The server resolves Price ID from env — never from request body.

---

## Billing Period → Checkout Flow

Browser sends:
```json
POST /api/billing/checkout
{ "billingPeriod": "monthly" }
```

Server:
1. Validates `billingPeriod` is one of `["monthly", "semiannual", "annual"]` — 400 on invalid.
2. Resolves Price ID from env via `resolvePriceIdForPeriod(period)` — 503 if env var missing.
3. Reads referral cookie `alpha_ref` (HttpOnly) — server-only, never client-supplied.
4. Creates Stripe Customer (filtered by livemode) if not exists.
5. Creates Checkout Session with resolved Price ID.

**The browser NEVER sends a Stripe Price ID, userId, email, or partnerId.**

---

## Referral Cookie

Cookie name: `alpha_ref`
- HttpOnly, Secure (production), SameSite=Lax, path=/, maxAge=30 days
- Contains only the partner code (e.g. `POWERFIT`)
- Set by `/r/[CODE]` route on valid active partner
- Read by `/api/billing/checkout` server-side and re-validated against DB

---

## Endpoints

| Endpoint | Method | Function |
|---|---|---|
| `/api/billing/checkout` | POST | Crea Stripe Checkout Session |
| `/api/billing/portal` | POST | Crea Stripe Customer Portal Session |
| `/api/stripe/webhook` | POST | Recibe eventos Stripe |
| `/r/[code]` | GET | Referral redirect, sets cookie |
| `/api/admin/partners` | GET, POST | Admin: list/create gym partners |
| `/api/admin/partners/[id]` | PATCH | Admin: update gym partner |
| `/api/admin/commissions/[id]` | PATCH | Admin: update commission status |

---

## Webhook Configuration

Configure these events in Stripe Dashboard → Webhooks:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Webhook URL: `https://alphatrainer.net/api/stripe/webhook`

### Webhook Processing Order (per event)

1. **Phase 1 — Subscription sync (entitlement-critical):** Any error → 5xx → Stripe retries.
2. **Phase 2 — Referral commission (best-effort):** Only on `invoice.paid`. Errors are logged
   but do NOT fail the webhook. Entitlement is always set first.

### For development (Stripe CLI):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Billing Tables

| Table | Description |
|---|---|
| `billing_customers` | user_id + livemode → stripe_customer_id. One Test + one Live per user. |
| `billing_subscriptions` | Mirrors Stripe subscription state. Has livemode + billing_period columns. |
| `billing_webhook_events` | Idempotency log for webhook events. Has status, retry tracking, livemode. |
| `gym_partners` | Gym affiliates with commission config (bps). |
| `referral_attributions` | One per user: which partner originated first Pro purchase. |
| `referral_commissions` | Commission ledger (pending → approved → paid). No auto-transfers. |

---

## Commission Logic

Commission is created on the FIRST invoice only (`billing_reason = "subscription_create"`).
Renewals do NOT generate commissions.

| Period | Standard commission |
|---|---|
| monthly | 50% (5000 bps) |
| semiannual | 15% (1500 bps) |
| annual | 15% (1500 bps) |

Partners can have custom bps (e.g. launch promo: 10000 bps = 100% for monthly).
The commission row stores a **snapshot** of the bps at sale time — changing partner
settings after a sale does NOT retroactively change past commissions.

All amounts in integer cents (MXN). Rounding: `Math.floor` (conservative, Alpha Trainer's favor).

Example:
```
9900 cents × 5000 bps / 10000 = 4950 cents ($49.50 MXN)
49900 × 1500 / 10000 = 7485 cents ($74.85 MXN)
89900 × 1500 / 10000 = 13485 cents ($134.85 MXN)
```

---

## Test/Live Separation

| Data | Test/Sandbox | Live |
|---|---|---|
| billing_customers.livemode | false | true |
| billing_subscriptions.livemode | false | true |
| UNIQUE(user_id, livemode) | user can have BOTH simultaneously | — |

- A Sandbox subscription does NOT block Live checkout.
- A Live subscription does NOT block Sandbox checkout.
- Portal route filters by `isLiveMode()` — Test customers never open Live portal.

---

## Entitlements

All three billing periods grant `plan = pro`. No sub-plans (pro_monthly, pro_annual, etc.).
`valid_until` comes from `current_period_end` (authoritative from Stripe, not calculated manually).

Precedence:
1. `founder_grant` / `manual_test` (never overridden by Stripe sync)
2. Stripe Pro active (source = "stripe")
3. Free (no row in user_access)

---

## Vercel Environment Variables

| Variable | Production | Preview | Development |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | `sk_test_...` | `sk_test_...` |
| `STRIPE_LIVE_MODE` | `true` | `false` | `false` |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Live price ID | Test price ID | Test price ID |
| `STRIPE_PRO_SEMIANNUAL_PRICE_ID` | Live price ID | Test price ID | Test price ID |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Live price ID | Test price ID | Test price ID |
| `STRIPE_WEBHOOK_SECRET` | Live secret | Test secret | (use Stripe CLI) |
