"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatCurrency, formatPercent, getChangeColor } from "@/lib/utils"
import { MarketsAPI, PulseAPI } from "@/lib/api"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

export function MarketOverview() {
  const { data: indiaData, isLoading } = useQuery({
    queryKey: ["markets", "india", "overview"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })
  const { data: pulse } = useQuery({
    queryKey: ["pulse", "headline"],
    queryFn: PulseAPI.get,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const heatmap = indiaData?.heatmap || []
  const topGainer = [...heatmap].sort((a, b) => b.pChange - a.pChange)[0]
  const topLoser = [...heatmap].sort((a, b) => a.pChange - b.pChange)[0]

  const marketIndexes = [
    {
      symbol: "^NIFTY500",
      name: indiaData?.nifty?.name || "NIFTY 50",
      value: indiaData?.nifty?.value || 0,
      change: indiaData?.nifty?.change_percent || 0,
    },
    {
      symbol: "^NIFTYBANK",
      name: indiaData?.banknifty?.name || "NIFTY BANK",
      value: indiaData?.banknifty?.value || 0,
      change: indiaData?.banknifty?.change_percent || 0,
    },
    {
      symbol: topGainer?.symbol || "GAINER",
      name: `Top Gainer: ${topGainer?.symbol || "-"}`,
      value: topGainer?.price || 0,
      change: topGainer?.pChange || 0,
    },
    {
      symbol: topLoser?.symbol || "LOSER",
      name: `Top Loser: ${topLoser?.symbol || "-"}`,
      value: topLoser?.price || 0,
      change: topLoser?.pChange || 0,
    },
  ]

  // Build "what's moving markets" explanation from pulse data
  const strongest = pulse?.strongest_sector
  const weakest = pulse?.weakest_sector
  const dir = pulse?.market_direction ?? "neutral"
  const adv = pulse?.breadth?.advancing ?? 0
  const dec = pulse?.breadth?.declining ?? 0

  let movingLine = ""
  if (strongest && weakest && strongest.performance !== weakest.performance) {
    movingLine = `${strongest.sector} is leading (+${strongest.performance.toFixed(1)}%) while ${weakest.sector} drags (${weakest.performance.toFixed(1)}%).`
  } else if (strongest) {
    movingLine = `${strongest.sector} is the strongest sector today (+${strongest.performance.toFixed(1)}%).`
  }

  let breadthLine = ""
  if (adv > 0 || dec > 0) {
    const total = adv + dec
    breadthLine = adv > dec
      ? `${adv} of ${total} stocks are rising — buying is broad-based.`
      : adv < dec
      ? `Only ${adv} of ${total} stocks are rising — selling is widespread.`
      : `Markets are split — ${adv} advancing, ${dec} declining.`
  }

  const explanationText = [movingLine, breadthLine].filter(Boolean).join(" ")

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
      {marketIndexes.map((index) => (
        <Card key={index.symbol} className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {index.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(index.value)}
            </div>
            <div className={`flex items-center gap-1 mt-1 ${getChangeColor(index.change)}`}>
              {index.change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {formatPercent(index.change)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* What's moving markets — replaces the opaque Sentiment score */}
      <Card className="hover-lift bg-gradient-to-br from-primary/8 to-primary/3 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            What's Moving Markets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {explanationText ? (
            <p className="text-xs leading-relaxed text-foreground/80">
              {explanationText}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground animate-pulse">
              Loading market context…
            </p>
          )}
          {pulse && (
            <div className={`mt-2 text-[11px] font-semibold ${
              dir === "bullish" ? "text-bullish" : dir === "bearish" ? "text-bearish" : "text-muted-foreground"
            }`}>
              {dir.charAt(0).toUpperCase() + dir.slice(1)} session
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && marketIndexes.length === 0 && (
        <div className="text-xs text-muted-foreground col-span-full">Loading market overview...</div>
      )}
      {indiaData && (
        <div className="col-span-full">
          <DataSourceBadge source={indiaData.source} asOf={indiaData.as_of} />
        </div>
      )}
    </div>
  )
}
