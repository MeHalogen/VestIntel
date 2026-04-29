"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gauge, TrendingUp } from "lucide-react"
import { MarketsAPI } from "@/lib/api"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

export function MarketSentiment() {
  const { data } = useQuery({
    queryKey: ["markets", "india", "sentiment-card"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })
  const niftyChange = data?.nifty?.change_percent ?? 0
  const heatmap = data?.heatmap || []
  const adv = heatmap.filter((s) => s.pChange > 0).length
  const dec = heatmap.filter((s) => s.pChange < 0).length
  const sentimentScore = Math.max(0, Math.min(100, Math.round(50 + niftyChange * 10)))
  const label = sentimentScore >= 70 ? "Bullish" : sentimentScore >= 40 ? "Neutral" : "Bearish"
  const color = sentimentScore >= 70 ? "text-bullish" : sentimentScore >= 40 ? "text-muted-foreground" : "text-bearish"

  return (
    <Card className="hover-lift bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="w-5 h-5 text-primary" />
          Market Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sentiment Gauge */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Fear</span>
              <span className="text-sm text-muted-foreground">Greed</span>
            </div>
            <div className="h-3 rounded-full bg-gradient-to-r from-bearish via-chart-tertiary to-bullish relative overflow-hidden">
              <div
                className="absolute h-full w-1 bg-white shadow-lg"
                style={{ left: `${sentimentScore}%` }}
              />
            </div>
          </div>

          {/* Score Display */}
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-3xl font-bold ${color}`}>{sentimentScore}</div>
              <div className={`text-sm font-semibold ${color}`}>{label}</div>
            </div>
            <TrendingUp className={`w-8 h-8 ${color}`} />
          </div>

          {/* Indicators */}
          <div className="space-y-2 pt-2 border-t border-border/30">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">NIFTY 500</span>
              <span className="font-semibold">{niftyChange >= 0 ? "+" : ""}{niftyChange.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">BankNIFTY</span>
              <span className="font-semibold">
                {(data?.banknifty?.change_percent ?? 0) >= 0 ? "+" : ""}
                {(data?.banknifty?.change_percent ?? 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Advance/Decline</span>
              <span className="font-semibold text-bullish">{adv}:{dec}</span>
            </div>
          </div>
        </div>
        <DataSourceBadge source={data?.source} asOf={data?.as_of} className="mt-3 pt-2 border-t border-border/20" />
      </CardContent>
    </Card>
  )
}
