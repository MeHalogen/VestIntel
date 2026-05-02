"use client"

import { useQuery } from "@tanstack/react-query"
import { BillingAPI } from "@/lib/api"
import type { Plan } from "@/lib/entitlements"

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
  })

  return {
    ...q,
    plan: ((q.data?.plan as Plan) || "free") as Plan,
    isGuest: !q.data?.plan,
  }
}

