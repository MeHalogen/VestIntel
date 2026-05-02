/**
 * VestIntel — Client-side entitlement system
 *
 * MVP: ALL features are enabled for ALL plans (including "free").
 *
 * Future monetization:
 *   Change the free entry below — e.g. set ai_copilot: false.
 *   The upgrade wall renders automatically everywhere canUse() is called.
 *   Zero other code changes needed.
 */

export type Plan = "free" | "pro" | "pro_plus"

export type Feature =
  | "market_pulse"
  | "signals"
  | "risk_engine"
  | "portfolio"
  | "watchlist"
  | "ai_copilot"
  | "ai_stock_analysis"
  | "advanced_analytics"
  | "alerts"
  | "custom_alerts"
  | "news_sentiment"
  | "momentum_screener"
  | "institutional_flow"
  | "backtesting"

// ─── Plan feature matrix ─────────────────────────────────────────────────────
// MVP: everything true → flip to false when monetizing.

const PLAN_FEATURES: Record<Plan, Record<Feature, boolean>> = {
  free: {
    market_pulse:        true,
    signals:             true,
    risk_engine:         true,
    portfolio:           true,
    watchlist:           true,
    ai_copilot:          true,   // ← flip false when launching Pro
    ai_stock_analysis:   true,   // ← flip false when launching Pro
    advanced_analytics:  true,
    alerts:              true,
    custom_alerts:       true,   // ← flip false when launching Pro
    news_sentiment:      true,
    momentum_screener:   true,
    institutional_flow:  true,
    backtesting:         true,
  },
  pro: {
    market_pulse:        true,
    signals:             true,
    risk_engine:         true,
    portfolio:           true,
    watchlist:           true,
    ai_copilot:          true,
    ai_stock_analysis:   true,
    advanced_analytics:  true,
    alerts:              true,
    custom_alerts:       true,
    news_sentiment:      true,
    momentum_screener:   true,
    institutional_flow:  true,
    backtesting:         true,
  },
  pro_plus: {
    market_pulse:        true,
    signals:             true,
    risk_engine:         true,
    portfolio:           true,
    watchlist:           true,
    ai_copilot:          true,
    ai_stock_analysis:   true,
    advanced_analytics:  true,
    alerts:              true,
    custom_alerts:       true,
    news_sentiment:      true,
    momentum_screener:   true,
    institutional_flow:  true,
    backtesting:         true,
  },
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns true if the given plan can access the feature. */
export function canUse(plan: Plan | null | undefined, feature: Feature): boolean {
  const p = (plan || "free") as Plan
  return PLAN_FEATURES[p]?.[feature] ?? false
}

/** Human-readable upgrade message for a gated feature. */
export function upgradeMessage(feature: Feature): string {
  const messages: Partial<Record<Feature, string>> = {
    ai_copilot:         "AI Copilot is part of VestIntel Pro.",
    ai_stock_analysis:  "AI Stock Analysis is part of VestIntel Pro.",
    custom_alerts:      "Custom Alerts are part of VestIntel Pro.",
    institutional_flow: "Institutional Flow data is part of VestIntel Pro+.",
    backtesting:        "Backtesting is part of VestIntel Pro+.",
  }
  return messages[feature] ?? "This feature is part of VestIntel Pro."
}

