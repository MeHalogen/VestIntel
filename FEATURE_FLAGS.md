# Feature Flags System

VestIntel uses a feature flag system to control authentication, subscriptions, and premium features. This allows for easy toggling between MVP mode (open access) and Production mode (gated features).

## Quick Start

### Switch to MVP Mode (Current Default)
All features accessible, no authentication or subscriptions required.

```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS: FeatureFlags = MVP_MODE
```

### Switch to Production Mode
Full authentication and subscription system enabled.

```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS: FeatureFlags = PRODUCTION_MODE
```

## Feature Flags

| Flag | MVP Mode | Production Mode | Description |
|------|----------|-----------------|-------------|
| `enableAuth` | `false` | `true` | Enable authentication and login system |
| `enableSubscriptions` | `false` | `true` | Enable subscription/billing system and plan restrictions |
| `enableUpgradePrompts` | `false` | `true` | Show upgrade prompts and paywalls |
| `showPricing` | `false` | `true` | Show pricing section on landing page |
| `showUserMenu` | `false` | `true` | Show user profile/account menu in top bar |

## What Changes in MVP Mode?

### ✅ What's Enabled
- **All Features Accessible**: Every feature works without restrictions
- **No Login Required**: Users can access the dashboard directly
- **No Subscription Checks**: `canUse()` always returns `true`
- **No API Authentication**: Billing API calls are skipped
- **Clean UI**: No user menu, no pricing page, no upgrade prompts

### 🎯 Perfect For
- MVP launches and beta testing
- Collecting user feedback
- Demonstrating full functionality
- Internal testing and development

## Implementation Details

### Entitlements System
The `canUse()` function in `lib/entitlements.ts` automatically respects feature flags:

```typescript
export function canUse(plan: Plan | null | undefined, feature: Feature): boolean {
  // If subscriptions are disabled (MVP mode), all features are accessible
  if (!FEATURE_FLAGS.enableSubscriptions) {
    return true
  }
  
  const p = (plan || "free") as Plan
  return PLAN_FEATURES[p]?.[feature] ?? false
}
```

### Plan Hook
The `usePlan()` hook skips API calls in MVP mode:

```typescript
export function usePlan() {
  const q = useQuery({
    queryKey: ["billing", "me"],
    queryFn: async () => {
      // If subscriptions are disabled, skip API call
      if (!FEATURE_FLAGS.enableSubscriptions) {
        return { plan: "free" as Plan }
      }
      // ... normal flow
    },
    enabled: FEATURE_FLAGS.enableSubscriptions, // Don't fetch if disabled
  })
  // ...
}
```

### UI Components
Components automatically hide based on flags:

```typescript
// Top Bar - User menu hidden in MVP mode
{FEATURE_FLAGS.showUserMenu && (
  <Button variant="ghost" size="icon">
    <User className="w-5 h-5" />
  </Button>
)}

// Landing Page - Pricing section hidden in MVP mode
{FEATURE_FLAGS.showPricing && <PricingSection />}
```

## Helper Functions

```typescript
import { isFeatureEnabled, isMVPMode, isProductionMode } from '@/lib/feature-flags'

// Check specific feature
if (isFeatureEnabled('enableAuth')) {
  // Show login button
}

// Check mode
if (isMVPMode()) {
  console.log('Running in MVP mode - all features open!')
}

if (isProductionMode()) {
  console.log('Running in production mode - authentication required')
}
```

## Migration Path: MVP → Production

When you're ready to launch with authentication and subscriptions:

1. **Update Feature Flag**
   ```typescript
   // lib/feature-flags.ts
   export const FEATURE_FLAGS: FeatureFlags = PRODUCTION_MODE
   ```

2. **Configure Backend**
   - Set up authentication endpoints
   - Configure billing/subscription system
   - Update database schema if needed

3. **Test Authentication Flow**
   - User registration/login
   - Session management
   - Plan entitlements

4. **Update Plan Matrix** (if needed)
   ```typescript
   // lib/entitlements.ts
   const PLAN_FEATURES: Record<Plan, Record<Feature, boolean>> = {
     free: {
       ai_copilot: false,  // ← Disable premium features on free plan
       // ...
     },
     // ...
   }
   ```

5. **Deploy & Monitor**
   - Deploy changes
   - Monitor authentication success rates
   - Watch for entitlement-related errors

## Environment-Based Flags (Optional)

You can make feature flags environment-aware:

```typescript
// lib/feature-flags.ts
const isDevelopment = process.env.NODE_ENV === 'development'
const isMVP = process.env.NEXT_PUBLIC_MVP_MODE === 'true'

export const FEATURE_FLAGS: FeatureFlags = 
  isDevelopment || isMVP ? MVP_MODE : PRODUCTION_MODE
```

Then set in your `.env.local`:
```bash
NEXT_PUBLIC_MVP_MODE=true
```

## Testing

### Test MVP Mode
```typescript
// All features should work without authentication
describe('MVP Mode', () => {
  it('should allow all features without plan', () => {
    expect(canUse(null, 'ai_copilot')).toBe(true)
    expect(canUse(null, 'custom_alerts')).toBe(true)
  })
})
```

### Test Production Mode
```typescript
// Free users should be restricted
describe('Production Mode', () => {
  it('should restrict premium features on free plan', () => {
    // Temporarily switch to production mode for test
    expect(canUse('free', 'ai_copilot')).toBe(false) // if plan matrix updated
  })
})
```

## Architecture Benefits

1. **Zero Code Changes**: Switch modes by changing one line
2. **Gradual Rollout**: Enable features one by one
3. **A/B Testing Ready**: Easy to test different configurations
4. **Clean Separation**: Business logic separated from feature gating
5. **Type Safe**: All flags are typed and validated

## Current Status

**✅ MVP Mode Active**: All features open, no authentication required, ready for user testing and feedback collection.
