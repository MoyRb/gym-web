-- =============================================================================
-- CORTE MONETIZATION 4: Multi-period Pro + Gym Referrals
--
-- ADITIVA / SEGURA. No destruye datos existentes.
--
-- Changes to existing tables:
--   billing_customers:     add id PK, livemode. Existing rows → livemode=false (Test/Sandbox).
--   billing_subscriptions: add livemode, billing_period. Existing rows → livemode=false.
--   billing_webhook_events: add livemode (nullable, existing rows have null = unknown/Test).
--
-- New tables:
--   gym_partners:           Gym affiliates with commission config.
--   referral_attributions:  One attribution per user (first Pro purchase).
--   referral_commissions:   Commission ledger, internal-only, no auto-transfers.
--
-- IMPORTANT: Existing billing data (billing_customers, billing_subscriptions,
-- billing_webhook_events) was created in Stripe Test/Sandbox mode.
-- All existing rows are set to livemode=false to reflect this.
-- Live Stripe operations will create new rows with livemode=true, isolated
-- from Sandbox data via the UNIQUE(user_id, livemode) constraint.
--
-- DO NOT execute until code review is complete and approved.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: billing_customers — Add livemode + new surrogate PK
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Current schema: user_id uuid PRIMARY KEY, stripe_customer_id text UNIQUE
-- Target schema:  id uuid PRIMARY KEY, UNIQUE(user_id, livemode), stripe_customer_id UNIQUE
--
-- Rationale: A user can have one Test customer AND one Live customer simultaneously.
-- The old PRIMARY KEY on user_id would block creating the second mapping.
--
-- All existing rows receive livemode=false (they were created with Stripe Test keys).

-- Step 1: Add surrogate PK column (nullable first, then fill, then not-null + PK)
ALTER TABLE public.billing_customers
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Fill id for any pre-existing rows that might have null (safety)
UPDATE public.billing_customers SET id = gen_random_uuid() WHERE id IS NULL;

-- Step 2: Drop the existing PRIMARY KEY on user_id
--         The FK (user_id → auth.users) and the NOT NULL constraint on user_id remain.
ALTER TABLE public.billing_customers
  DROP CONSTRAINT billing_customers_pkey;

-- Step 3: Add livemode column — default false = Test/Sandbox
ALTER TABLE public.billing_customers
  ADD COLUMN IF NOT EXISTS livemode boolean NOT NULL DEFAULT false;

-- Step 4: Add the new PK on id
ALTER TABLE public.billing_customers
  ADD CONSTRAINT billing_customers_pkey PRIMARY KEY (id);

-- Step 5: Add UNIQUE(user_id, livemode) — allows one Test + one Live per user
--         Existing rows all have livemode=false and unique user_ids, no conflict.
ALTER TABLE public.billing_customers
  ADD CONSTRAINT billing_customers_user_livemode_key UNIQUE (user_id, livemode);

-- Note: stripe_customer_id UNIQUE already exists from migration 20260826000000.
-- Note: user_id FK to auth.users(id) ON DELETE CASCADE already exists.
-- Note: updated_at trigger already exists.

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: billing_subscriptions — Add livemode and billing_period
-- ─────────────────────────────────────────────────────────────────────────────
--
-- livemode:      Comes from Stripe subscription object (sub.livemode).
--                Existing rows = false (were Sandbox). Live will be true.
-- billing_period: One of 'monthly', 'semiannual', 'annual'.
--                 Nullable: existing rows didn't have this concept;
--                 will be populated on next sync event.

ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS livemode boolean NOT NULL DEFAULT false;

ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS billing_period text
    CHECK (billing_period IN ('monthly', 'semiannual', 'annual'));

-- Index for livemode-filtered queries (portal, duplicate sub check, account deletion)
CREATE INDEX IF NOT EXISTS billing_subscriptions_user_livemode_idx
  ON public.billing_subscriptions (user_id, livemode);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: billing_webhook_events — Add livemode
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Nullable: existing rows were processed before this column existed.
-- New events will be set from event.livemode.
-- This is purely informational — idempotency is still enforced by stripe_event_id PK.

ALTER TABLE public.billing_webhook_events
  ADD COLUMN IF NOT EXISTS livemode boolean;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: gym_partners
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Gym affiliates. Commission percentages stored in basis points (bps).
-- 10000 bps = 100%, 5000 bps = 50%, 1500 bps = 15%.
-- Using bps (integer) prevents float precision errors in commission math.
--
-- code: public-facing URL code (e.g. "POWERFIT" in alphatrainer.net/r/POWERFIT).
--       Always uppercase, alphanumeric only.
--
-- Writes: service_role only (admin API routes, webhook).
-- Reads:  service_role only (referral route, commission processor).
-- Browser: no direct access (RLS fail-closed).

CREATE TABLE IF NOT EXISTS public.gym_partners (
  id                       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text         NOT NULL,
  code                     text         UNIQUE NOT NULL,
  -- 'active' | 'inactive'
  status                   text         NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  -- Commission rates in basis points: 0–10000 (0%–100%)
  monthly_commission_bps   integer      NOT NULL DEFAULT 5000
    CHECK (monthly_commission_bps >= 0 AND monthly_commission_bps <= 10000),
  long_term_commission_bps integer      NOT NULL DEFAULT 1500
    CHECK (long_term_commission_bps >= 0 AND long_term_commission_bps <= 10000),
  created_at               timestamptz  NOT NULL DEFAULT now(),
  updated_at               timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_partners_code_idx ON public.gym_partners (code);
CREATE INDEX IF NOT EXISTS gym_partners_status_idx ON public.gym_partners (status);

CREATE TRIGGER set_gym_partners_updated_at
  BEFORE UPDATE ON public.gym_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.gym_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_partners_no_browser_access"
  ON public.gym_partners FOR ALL TO authenticated, anon
  USING (false);

REVOKE ALL PRIVILEGES ON TABLE public.gym_partners FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gym_partners TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: referral_attributions
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Records which partner originated a user's FIRST successful Pro purchase.
-- UNIQUE(user_id): one attribution per user, ever.
-- Created on invoice.paid (billing_reason='subscription_create') with a valid referral.
-- Never deleted — historical record.
--
-- ON DELETE SET NULL for user_id so admin can see attribution even after account deletion.
-- ON DELETE CASCADE for gym_partner_id not applicable (partners should not be deleted).

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  gym_partner_id         uuid        NOT NULL REFERENCES public.gym_partners(id),
  stripe_subscription_id text        NOT NULL,
  billing_period         text        NOT NULL
    CHECK (billing_period IN ('monthly', 'semiannual', 'annual')),
  attributed_at          timestamptz NOT NULL DEFAULT now(),
  -- One attribution per user (first purchase wins)
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS referral_attributions_partner_idx
  ON public.referral_attributions (gym_partner_id);

ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_attributions_no_browser_access"
  ON public.referral_attributions FOR ALL TO authenticated, anon
  USING (false);

REVOKE ALL PRIVILEGES ON TABLE public.referral_attributions FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.referral_attributions TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: referral_commissions
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Internal commission ledger. No automatic transfers.
-- "paid" status only means Alpha Trainer manually recorded that the gym was paid
-- through some external mechanism (bank transfer, etc.).
--
-- stripe_invoice_id UNIQUE: idempotency guard against duplicate webhook delivery.
-- All monetary amounts stored as integer cents (minor units) — never decimal float.
--
-- commission_bps is a SNAPSHOT of the partner's rate at sale time.
-- Changing partner settings after a sale does NOT retroactively change old commissions.
--
-- TODO (not in V1): Handle charge.refunded / charge.dispute.created to void commissions.
-- Until that webhook is implemented, do NOT approve/pay commissions before manually
-- checking for refunds/disputes in Stripe Dashboard.

CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id                             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_partner_id                 uuid        NOT NULL REFERENCES public.gym_partners(id),
  -- SET NULL on user delete so commission history survives account deletion
  user_id                        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_subscription_id         text        NOT NULL,
  -- UNIQUE: one commission row per invoice (idempotency)
  stripe_invoice_id              text        UNIQUE NOT NULL,
  billing_period                 text        NOT NULL
    CHECK (billing_period IN ('monthly', 'semiannual', 'annual')),
  -- Snapshot of bps at time of sale (survives future partner edits)
  commission_bps                 integer     NOT NULL,
  -- Invoice subtotal (after discounts, before tax) in minor units (cents)
  commission_basis_amount_cents  bigint      NOT NULL,
  -- Calculated: floor(basis * bps / 10000) — integer arithmetic, no floats
  commission_amount_cents        bigint      NOT NULL,
  currency                       text        NOT NULL DEFAULT 'mxn',
  -- 'pending' | 'approved' | 'paid' | 'void'
  status                         text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'void')),
  created_at                     timestamptz NOT NULL DEFAULT now(),
  -- Populated when status transitions to the corresponding state
  approved_at                    timestamptz,
  paid_at                        timestamptz,
  voided_at                      timestamptz
);

CREATE INDEX IF NOT EXISTS referral_commissions_partner_idx
  ON public.referral_commissions (gym_partner_id);

CREATE INDEX IF NOT EXISTS referral_commissions_status_idx
  ON public.referral_commissions (status);

CREATE INDEX IF NOT EXISTS referral_commissions_invoice_idx
  ON public.referral_commissions (stripe_invoice_id);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_commissions_no_browser_access"
  ON public.referral_commissions FOR ALL TO authenticated, anon
  USING (false);

REVOKE ALL PRIVILEGES ON TABLE public.referral_commissions FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.referral_commissions TO service_role;

-- =============================================================================
-- END OF MIGRATION
--
-- EXECUTION CHECKLIST (review before running):
--   1. Verify existing billing_customers rows all belong to Stripe Test/Sandbox
--      (check stripe_customer_id prefix: cus_ created during test — all should
--       be acceptable to mark livemode=false)
--   2. Verify existing billing_subscriptions rows all belong to Test/Sandbox
--   3. Confirm no duplicate user_ids would conflict when livemode=false is added
--      (they can't — user_id was the PRIMARY KEY before, guaranteeing uniqueness)
--   4. Run migration in a transaction on a staging DB first
--   5. After approval: supabase db push --project-ref <ref>
--
-- POST-MIGRATION:
--   Set STRIPE_LIVE_MODE=true in Production Vercel env only.
--   Set all three price IDs in Vercel env (see docs/stripe-live-launch.md).
-- =============================================================================
