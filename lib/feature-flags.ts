/**
 * VestIntel — Feature Flags Configuration
 * 
 * Control which features are enabled in the application.
 * Use this to manage MVP launch, staged rollouts, and A/B testing.
 */

export interface FeatureFlags {
  /** Enable authentication and login system */
  enableAuth: boolean
  
  /** Enable subscription/billing system and plan restrictions */
  enableSubscriptions: boolean
  
  /** Enable upgrade prompts and paywalls */
  enableUpgradePrompts: boolean
  
  /** Show pricing page on landing */
  showPricing: boolean
  
  /** Show user profile/account menu */
  showUserMenu: boolean
}

/**
 * MVP Launch Configuration
 * - All features accessible without authentication
 * - No subscription/billing system
 * - Perfect for testing and feedback collection
 */
const MVP_MODE: FeatureFlags = {
  enableAuth: false,
  enableSubscriptions: false,
  enableUpgradePrompts: false,
  showPricing: false,
  showUserMenu: false,
}

/**
 * Production Configuration
 * - Full authentication required
 * - Subscription system active
 * - Feature gating based on plans
 */
const PRODUCTION_MODE: FeatureFlags = {
  enableAuth: true,
  enableSubscriptions: true,
  enableUpgradePrompts: true,
  showPricing: true,
  showUserMenu: true,
}

// ─── Active Configuration ─────────────────────────────────────────────────────
// Switch between MVP_MODE and PRODUCTION_MODE here

export const FEATURE_FLAGS: FeatureFlags = MVP_MODE

// ─── Helper Functions ─────────────────────────────────────────────────────────

/** Check if a specific feature is enabled */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return FEATURE_FLAGS[feature]
}

/** Get all current feature flags */
export function getAllFeatureFlags(): FeatureFlags {
  return { ...FEATURE_FLAGS }
}

/** Check if app is in MVP mode (no auth, no subscriptions) */
export function isMVPMode(): boolean {
  return !FEATURE_FLAGS.enableAuth && !FEATURE_FLAGS.enableSubscriptions
}

/** Check if app is in production mode (full features) */
export function isProductionMode(): boolean {
  return FEATURE_FLAGS.enableAuth && FEATURE_FLAGS.enableSubscriptions
}
