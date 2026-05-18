"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react"
import { PulseAPI } from "@/lib/api"
import { useState } from "react"

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
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const { data: pulse, isLoading, dataUpdatedAt, error } = useQuery({
    queryKey: ["pulse", "headline"],
    queryFn: PulseAPI.get,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 30_000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  // Refresh ALL dashboard queries simultaneously
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries()
    setLastRefreshed(new Date())
    setIsRefreshing(false)
  }

  const displayTime = lastRefreshed
    ? lastRefreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null

  // Show error state with fallback content
  if (error && !pulse) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Market data is loading...
        </p>
      </div>
    )
  }

  // Show loading state only briefly, then show static content
  if (isLoading && !pulse) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading market overview...
          </span>
        </p>
      </div>
    )
  }

  // Ensure pulse data exists
  if (!pulse) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Market data unavailable</p>
      </div>
    )
  }

  const dir = pulse.market_direction
  const Icon = DIR_ICON[dir] ?? Minus
  const color = DIR_COLOR[dir] ?? "text-muted-foreground"

  const firstSentence = pulse.narrative?.split(/(?<=[.!?])\s/)[0] ?? pulse.summary

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

  const { advancing, declining, total } = pulse.breadth
  const breadthLabel = total > 0 ? `${advancing} of ${total} stocks advancing` : ""

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          Dashboard
          <span className={`flex items-center gap-1.5 text-xl font-semibold ${color}`}>
            <Icon className="w-5 h-5" />
            {dir.charAt(0).toUpperCase() + dir.slice(1)}
          </span>
        </h1>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 ml-auto"
          title="Refresh all market data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">
            {isRefreshing ? "Refreshing…" : displayTime ? `Updated: ${displayTime}` : "Refresh"}
          </span>
        </button>
      </div>

      <p className="text-base text-foreground/80 leading-relaxed max-w-3xl">
        {firstSentence}
      </p>

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

