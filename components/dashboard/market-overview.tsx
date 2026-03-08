"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatCurrency, formatPercent, getChangeColor } from "@/lib/utils"
import { MarketsAPI } from "@/lib/api"

export function MarketOverview() {
  const { data: indiaData, isLoading } = useQuery({
    queryKey: ["markets", "india", "overview"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })
  const heatmap = indiaData?.heatmap || []
  const topGainer = [...heatmap].sort((a, b) => b.pChange - a.pChange)[0]
  const topLoser = [...heatmap].sort((a, b) => a.pChange - b.pChange)[0]

  const marketIndexes = [
    {
      symbol: "^NIFTY500",
      name: indiaData?.nifty?.name || "NIFTY 500",
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
  const sentimentScore = Math.max(0, Math.min(100, Math.round(50 + (indiaData?.nifty?.change_percent || 0) * 10)))
  const sentimentLabel = sentimentScore >= 65 ? "Bullish" : sentimentScore >= 40 ? "Neutral" : "Bearish"
  const sentimentColor = sentimentScore >= 65 ? "text-bullish" : sentimentScore >= 40 ? "text-muted-foreground" : "text-bearish"

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

      <Card className="hover-lift bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Market Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${sentimentColor}`}>
            {`${sentimentScore}/100`}
          </div>
          <div className="mt-1">
            <span className={`text-sm font-medium ${sentimentColor}`}>
              {sentimentLabel}
            </span>
          </div>
        </CardContent>
      </Card>
      {isLoading && marketIndexes.length === 0 && (
        <div className="text-xs text-muted-foreground col-span-full">Loading market overview...</div>
      )}
    </div>
  )
}
