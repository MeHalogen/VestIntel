import type { Plan } from "@/lib/use-plan"

export type UIProtectedFeature =
  | "ai_copilot"
  | "ai_stock_analysis"
  | "custom_alerts"

export function canUse(plan: Plan, feature: UIProtectedFeature): boolean {
  if (plan === "pro_plus") return true
  if (plan === "pro") {
    return feature !== "custom_alerts" // alerts are Pro-only in backend right now; keep tight.
  }
  // free
  return false
}

export function upgradeMessage(feature: UIProtectedFeature): string {
  if (feature === "ai_copilot" || feature === "ai_stock_analysis") {
    return "This feature is available in VestIntel Pro."
  }
  return "This feature is available in VestIntel Pro."
}
