"use client"

import { useQuery } from "@tanstack/react-query"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { PulseAPI } from "@/lib/api"

const DIR_COLOR: Record<string, string> = {
  bullish: "text-bullish",
  bearish: "text-bearish",
  neutral: "text-muted-foreground",
}

const DIR_ICON = {
  bullish: TrendingUp,
  bearish: TrendingDown,
  neutral: Minus,
}

export function MarketHeadline() {
  const { data: pulse, isLoading } = useQuery({
    queryKey: ["pulse", "headline"],
    queryFn: PulseAPI.get,
    refetchInterval: 60_000,
  })

  // While loading, show static scaffold
  if (isLoading || !pulse) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground animate-pulse">Loading today's market story…</p>
      </div>
    )
  }

  const dir = pulse.market_direction
  const Icon = DIR_ICON[dir] ?? Minus
  const color = DIR_COLOR[dir] ?? "text-muted-foreground"

  // Build a tight headline from the narrative's first sentence
  const firstSentence = pulse.narrative?.split(/(?<=[.!?])\s/)[0] ?? pulse.summary

  // Supporting context: strongest sector up, weakest down
  const strongest = pulse.strongest_sector
  const weakest = pulse.weakest_sector
  let context = ""
  if (strongest && weakest) {
    const s = strongest.sector
    const sPct = strongest.performance >= 0 ? `+${strongest.performance.toFixed(1)}%` : `${strongest.performance.toFixed(1)}%`
    const w = weakest.sector
    const wPct = weakest.performance >= 0 ? `+${weakest.performance.toFixed(1)}%` : `${weakest.performance.toFixed(1)}%`
    context = `${s} leads (${sPct}) · ${w} lags (${wPct})`
  } else if (strongest) {
    context = `${strongest.sector} leads (+${strongest.performance.toFixed(1)}%)`
  }

  // Breadth mini-label
  const { advancing, declining, total } = pulse.breadth
  const breadthLabel = total > 0
    ? `${advancing} of ${total} stocks advancing`
    : ""

  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        Dashboard
        <span className={`flex items-center gap-1.5 text-xl font-semibold ${color}`}>
          <Icon className="w-5 h-5" />
          {dir.charAt(0).toUpperCase() + dir.slice(1)}
        </span>
      </h1>

      {/* Live first sentence of narrative */}
      <p className="text-base text-foreground/80 leading-relaxed max-w-3xl">
        {firstSentence}
      </p>

      {/* Context pills */}
      {(context || breadthLabel) && (
        <div className="flex items-center gap-3 pt-0.5 flex-wrap">
          {context && (
            <span className="text-xs text-muted-foreground bg-accent/40 px-2.5 py-0.5 rounded-full">
              {context}
            </span>
          )}
          {breadthLabel && (
            <span className={`text-xs px-2.5 py-0.5 rounded-full ${
              advancing > declining
                ? "text-bullish bg-bullish/10"
                : advancing < declining
                ? "text-bearish bg-bearish/10"
                : "text-muted-foreground bg-accent/40"
            }`}>
              {breadthLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
