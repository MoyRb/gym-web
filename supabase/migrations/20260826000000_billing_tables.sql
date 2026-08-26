-- =============================================================================
-- CORTE MONETIZATION 2: billing tables
--
-- billing_customers: maps Supabase user_id → Stripe customer_id (1:1)
-- billing_subscriptions: mirrors Stripe subscription state (source of truth = Stripe)
-- billing_webhook_events: idempotency log for processed Stripe webhook events
--
-- Writes come exclusively from the Stripe webhook handler via service_role.
-- Authenticated browsers cannot INSERT, UPDATE, or DELETE any billing row.
-- =============================================================================

-- ── billing_customers ─────────────────────────────────────────────────────────

CREATE TABLE public.billing_customers (
  user_id              uuid  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id   text  UNIQUE NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_billing_customers_updated_at
  BEFORE UPDATE ON public.billing_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;

-- No SELECT grant to authenticated — all reads go through service_role API routes.
-- RLS enforces this even if SELECT were accidentally granted.
CREATE POLICY "billing_customers_no_browser_access"
  ON public.billing_customers FOR ALL TO authenticated, anon
  USING (false);

REVOKE ALL PRIVILEGES ON TABLE public.billing_customers FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_customers TO service_role;

-- ── billing_subscriptions ─────────────────────────────────────────────────────

CREATE TABLE public.billing_subscriptions (
  stripe_subscription_id  text  PRIMARY KEY,
  user_id                 uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id      text  NOT NULL,
  stripe_price_id         text  NOT NULL,
  -- Mirrors Stripe subscription.status:
  -- active | trialing | past_due | canceled | unpaid | incomplete | incomplete_expired
  status                  text  NOT NULL,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX billing_subscriptions_user_id_idx
  ON public.billing_subscriptions (user_id);

CREATE TRIGGER set_billing_subscriptions_updated_at
  BEFORE UPDATE ON public.billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_subscriptions_no_browser_access"
  ON public.billing_subscriptions FOR ALL TO authenticated, anon
  USING (false);

REVOKE ALL PRIVILEGES ON TABLE public.billing_subscriptions FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_subscriptions TO service_role;

-- ── billing_webhook_events ────────────────────────────────────────────────────
-- Idempotency log: each Stripe event ID is stored once. Duplicate events are
-- detected by unique constraint (23505) and skipped without re-processing.

CREATE TABLE public.billing_webhook_events (
  stripe_event_id  text  PRIMARY KEY,
  event_type       text  NOT NULL,
  processed_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_webhook_events_no_browser_access"
  ON public.billing_webhook_events FOR ALL TO authenticated, anon
  USING (false);

REVOKE ALL PRIVILEGES ON TABLE public.billing_webhook_events FROM anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.billing_webhook_events TO service_role;

-- =============================================================================
-- CASCADE BEHAVIOR:
--
-- billing_customers.user_id → auth.users(id) ON DELETE CASCADE
-- billing_subscriptions.user_id → auth.users(id) ON DELETE CASCADE
--
-- When an auth user is deleted, all billing data is automatically removed.
-- The Stripe webhook server MUST cancel active subscriptions BEFORE deleting
-- the auth user to avoid orphaned Stripe subscriptions that keep charging.
-- See: src/app/api/account/delete/route.ts
-- =============================================================================
