/**
 * Central billing period catalog — single source of truth for:
 *   - display prices, period labels, savings copy
 *   - commission group assignment
 *
 * No secrets here. Safe to import from both server and client code.
 * Actual Stripe Price ID resolution lives in env.ts (server-only).
 *
 * All prices in MXN. Savings calculated vs equivalent monthly billing:
 *   semiannual: $99 × 6 = $594 → $499 → saves $95
 *   annual:     $99 × 12 = $1,188 → $899 → saves $289
 */

export const BILLING_PERIODS = ["monthly", "semiannual", "annual"] as const
export type BillingPeriod = (typeof BILLING_PERIODS)[number]

export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return BILLING_PERIODS.includes(value as BillingPeriod)
}

/** MXN price in minor units (cents) for each billing period */
export const BILLING_PERIOD_PRICE_CENTS: Record<BillingPeriod, number> = {
  monthly: 9900,    // $99.00 MXN
  semiannual: 49900, // $499.00 MXN
  annual: 89900,    // $899.00 MXN
}

export interface BillingPeriodDisplay {
  id: BillingPeriod
  /** "$99 MXN" */
  displayPrice: string
  /** "por mes" / "cada 6 meses" / "al año" */
  periodLabel: string
  /** "~$83.17 / mes" or null for monthly (baseline) */
  monthlyEquivalent: string | null
  /** Savings in whole MXN vs monthly billing; null = baseline */
  savingsAmount: number | null
  /** CTA button label */
  ctaLabel: string
  /** Highlight "Mejor valor" badge on this period */
  isBestValue: boolean
}

export const BILLING_PERIOD_DISPLAY: Record<BillingPeriod, BillingPeriodDisplay> = {
  monthly: {
    id: "monthly",
    displayPrice: "$99 MXN",
    periodLabel: "por mes",
    monthlyEquivalent: null,
    savingsAmount: null,
    ctaLabel: "Suscribirme — $99/mes",
    isBestValue: false,
  },
  semiannual: {
    id: "semiannual",
    displayPrice: "$499 MXN",
    periodLabel: "cada 6 meses",
    monthlyEquivalent: "~$83.17 / mes",
    savingsAmount: 95,
    ctaLabel: "Elegir 6 meses — $499",
    isBestValue: false,
  },
  annual: {
    id: "annual",
    displayPrice: "$899 MXN",
    periodLabel: "al año",
    monthlyEquivalent: "~$74.92 / mes",
    savingsAmount: 289,
    ctaLabel: "Elegir anual — $899",
    isBestValue: true,
  },
}

/**
 * Commission group mapping — determines which bps column to read from gym_partners.
 *   "monthly"    → monthly_commission_bps   (default 5000 bps = 50%)
 *   "long_term"  → long_term_commission_bps (default 1500 bps = 15%)
 */
export type CommissionGroup = "monthly" | "long_term"

export const BILLING_PERIOD_COMMISSION_GROUP: Record<BillingPeriod, CommissionGroup> = {
  monthly: "monthly",
  semiannual: "long_term",
  annual: "long_term",
}
