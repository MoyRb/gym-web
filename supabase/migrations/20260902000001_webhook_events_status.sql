-- =============================================================================
-- CORTE MONETIZATION 2.1: webhook event status tracking
--
-- Additive migration — does NOT modify existing rows destructively.
--
-- New semantics for billing_webhook_events:
--   processing → event claimed, sync in progress
--   processed  → sync completed successfully (entitlement granted/revoked)
--   failed     → sync failed, eligible for Stripe retry (handler returns 5xx)
--
-- Existing rows (inserted before this migration) are treated as 'processed'
-- (DEFAULT 'processed') to preserve backward compatibility.
--
-- This migration also grants UPDATE to service_role so the webhook handler
-- can transition events from processing → processed | failed.
-- =============================================================================

-- Add status column.
-- Default is 'processed' so all pre-existing rows are considered complete.
ALTER TABLE public.billing_webhook_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'processed'
    CHECK (status IN ('processing', 'processed', 'failed'));

-- Add attempt_count for observability (not used for retry gating logic).
ALTER TABLE public.billing_webhook_events
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 1;

-- Add last_error_code — populated on sync failure for debugging.
ALTER TABLE public.billing_webhook_events
  ADD COLUMN IF NOT EXISTS last_error_code text;

-- Add updated_at for audit trail.
ALTER TABLE public.billing_webhook_events
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Make processed_at nullable: new events inserted with status='processing'
-- do not have a processed_at yet.
ALTER TABLE public.billing_webhook_events
  ALTER COLUMN processed_at DROP NOT NULL;

ALTER TABLE public.billing_webhook_events
  ALTER COLUMN processed_at DROP DEFAULT;

-- Grant UPDATE to service_role so the webhook handler can transition event status.
-- Previously only SELECT and INSERT were granted.
GRANT UPDATE ON TABLE public.billing_webhook_events TO service_role;
