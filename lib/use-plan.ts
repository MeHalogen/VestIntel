"use client"

import { useQuery } from "@tanstack/react-query"
import { BillingAPI } from "@/lib/api"

export type Plan = "free" | "pro" | "pro_plus"

export function usePlan() {
  const q = useQuery({
    queryKey: ["billing", "me"],
    queryFn: BillingAPI.me,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  return {
    ...q,
    plan: (q.data?.plan || "free") as Plan,
  }
}
