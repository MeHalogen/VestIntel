"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketsAPI } from "@/lib/api"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

export function MarketHeatmap() {
  const { data } = useQuery({
    queryKey: ["markets", "india", "mini-heatmap"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })
  const heatmap = [...(data?.heatmap || [])]
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 40)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 min-h-64">
          {heatmap.map((s) => (
            <div
              key={s.symbol}
              className={`rounded-lg p-3 border ${
                s.pChange >= 0 ? "bg-bullish/15 border-bullish/40" : "bg-bearish/15 border-bearish/40"
              }`}
            >
              <div className="text-xs text-muted-foreground">{s.sector || "NSE"}</div>
              <div className="font-semibold">{s.symbol}</div>
              <div className={s.pChange >= 0 ? "text-bullish text-sm" : "text-bearish text-sm"}>
                {s.pChange >= 0 ? "+" : ""}
                {s.pChange.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
        <DataSourceBadge source={data?.source} asOf={data?.as_of} className="mt-3" />
      </CardContent>
    </Card>
  )
}
