"use client"

import { useQuery } from "@tanstack/react-query"
import { BillingAPI } from "@/lib/api"
import type { Plan } from "@/lib/entitlements"
import { FEATURE_FLAGS } from "./feature-flags"

export type { Plan }

/**
 * Returns the current user's plan.
 *
 * MVP:
 * - No auth required — unauthenticated users get plan = "free"
 * - All features are enabled on "free" during MVP phase
 * - Hook never throws; falls back silently to "free"
 */
export function usePlan() {
  const q = useQuery({
    queryKey: ["billing", "me"],
    queryFn: async () => {
      // If subscriptions are disabled, skip API call
      if (!FEATURE_FLAGS.enableSubscriptions) {
        return { plan: "free" as Plan }
      }
      
      try {
        return await BillingAPI.me()
      } catch {
        // Guest / unauthenticated — treat as free, never block the UI
        return { plan: "free" as Plan }
      }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: false, // don't hammer the backend on auth failures
    enabled: FEATURE_FLAGS.enableSubscriptions, // Don't fetch if subscriptions disabled
  })

  return {
    ...q,
    plan: ((q.data?.plan as Plan) || "free") as Plan,
    isGuest: !q.data?.plan,
  }
}

