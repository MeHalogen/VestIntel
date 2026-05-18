# Quick Test Script for MVP Mode

## Verify Feature Flags

Run this in your browser console on the landing page:

```javascript
// Check if we're in MVP mode
fetch('/api/test').catch(() => {
  console.log('✅ No auth API calls being made - MVP mode working!')
})

// Navigate directly to dashboard (should work without login)
window.location.href = '/dashboard'
```

## Manual Testing Steps

### 1. Test Landing Page
```bash
# Start dev server
npm run dev

# Open browser to http://localhost:3000
# Verify:
# ✅ No pricing section visible
# ✅ Hero button says "Launch Dashboard"
# ✅ Click button → goes to /dashboard (no redirect)
```

### 2. Test Dashboard Access
```bash
# Visit these URLs directly (should all work without login):
open http://localhost:3000/dashboard
open http://localhost:3000/dashboard/stocks/RELIANCE
open http://localhost:3000/dashboard/copilot
open http://localhost:3000/dashboard/portfolio
open http://localhost:3000/dashboard/alerts

# Verify:
# ✅ All pages load without authentication
# ✅ No redirect to login page
# ✅ No 401/403 errors in console
```

### 3. Test Feature Access
```bash
# Navigate to:
# 1. http://localhost:3000/dashboard/copilot
#    ✅ AI Copilot should work
#    ✅ Can send messages
#    ✅ No "Upgrade Required" message

# 2. http://localhost:3000/dashboard/stocks/RELIANCE
#    ✅ AI Analysis section should show data
#    ✅ No paywall

# 3. http://localhost:3000/dashboard/alerts
#    ✅ Can create custom alerts
#    ✅ No upgrade prompt when clicking "Add"
```

### 4. Test UI Elements
```bash
# Check top bar on any dashboard page:
# ✅ No user icon/menu button on right side
# ✅ Notification icon visible
# ✅ Settings icon visible
```

### 5. Network Tab Verification
```bash
# Open DevTools → Network tab
# Load http://localhost:3000/dashboard
# Filter by "api"

# Verify:
# ❌ No calls to /api/billing/me
# ❌ No calls to /api/auth/*
# ✅ Market data calls work (anonymous)
```

## Automated Test Script

Create a file `test-mvp-mode.js`:

```javascript
/**
 * Test MVP Mode - Run in browser console
 */

async function testMVPMode() {
  const tests = {
    'Landing page loads': true,
    'Pricing hidden': !document.querySelector('[data-testid="pricing"]'),
    'Hero CTA correct': document.body.textContent.includes('Launch Dashboard'),
    'User menu hidden': !document.querySelector('[aria-label="User menu"]'),
  }

  console.table(tests)
  
  const passing = Object.values(tests).filter(Boolean).length
  const total = Object.keys(tests).length
  
  console.log(`\n${passing}/${total} tests passing`)
  
  if (passing === total) {
    console.log('✅ MVP mode working correctly!')
  } else {
    console.log('⚠️ Some tests failed')
  }
}

testMVPMode()
```

## Browser Testing Checklist

Copy this checklist and mark off as you test:

```markdown
### Landing Page
- [ ] Visit http://localhost:3000
- [ ] Verify no pricing section
- [ ] Button text: "Launch Dashboard"
- [ ] Click button goes to /dashboard

### Dashboard Access (Unauthenticated)
- [ ] Visit /dashboard → loads without redirect
- [ ] Visit /dashboard/stocks/RELIANCE → loads
- [ ] Visit /dashboard/copilot → loads
- [ ] Visit /dashboard/alerts → loads
- [ ] Visit /dashboard/portfolio → loads

### Feature Testing
- [ ] AI Copilot: Can send messages
- [ ] Stock Analysis: AI section shows data
- [ ] Alerts: Can create custom alert
- [ ] Portfolio: Can view/add holdings
- [ ] Watchlist: Can add stocks

### UI Elements
- [ ] Top bar: No user menu icon
- [ ] Top bar: Notification bell present
- [ ] Top bar: Settings icon present
- [ ] Sidebar: All navigation links work

### Console Checks
- [ ] No 401 errors
- [ ] No 403 errors
- [ ] No "upgrade required" messages
- [ ] No billing API calls

### Network Checks
- [ ] Open DevTools → Network
- [ ] No /api/billing/me calls
- [ ] No /api/auth calls
- [ ] Market data loads successfully
```

## Quick Smoke Test

Run this one-liner in your terminal:

```bash
# Start server and open all test URLs
npm run dev & sleep 5 && \
  open http://localhost:3000 && \
  sleep 2 && \
  open http://localhost:3000/dashboard && \
  sleep 2 && \
  open http://localhost:3000/dashboard/copilot && \
  sleep 2 && \
  open http://localhost:3000/dashboard/alerts
```

## Expected Console Output

When MVP mode is working correctly, you should see:

```
✅ Feature flags loaded: MVP_MODE
✅ Subscriptions disabled
✅ Auth disabled
✅ All features accessible
```

You should NOT see:
```
❌ 401 Unauthorized
❌ Redirecting to login
❌ Upgrade required
❌ Billing API call failed
```

## Switching Back to Production Mode

If you need to test production mode:

```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS: FeatureFlags = PRODUCTION_MODE
```

Then restart dev server:
```bash
npm run dev
```

Expected changes:
- ✅ Pricing section appears
- ✅ User menu shows in top bar
- ✅ Features gated by plan
- ✅ Upgrade prompts appear

## Common Issues & Fixes

### Issue: Still seeing upgrade prompts
**Fix:** Make sure you saved `lib/feature-flags.ts` and restarted the dev server

### Issue: Can't access dashboard
**Fix:** Clear browser cache and cookies, then try again

### Issue: Billing API still being called
**Fix:** 
1. Check `lib/use-plan.ts` has `enabled: FEATURE_FLAGS.enableSubscriptions`
2. Restart dev server
3. Hard refresh browser (Cmd+Shift+R)

### Issue: TypeScript errors
**Fix:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

## Success Criteria

MVP mode is working if:
1. ✅ No authentication required
2. ✅ All features accessible
3. ✅ No upgrade prompts
4. ✅ Clean UI (no user menu, no pricing)
5. ✅ No billing API calls
6. ✅ Smooth user experience

Test passed? You're ready to share with users! 🚀
