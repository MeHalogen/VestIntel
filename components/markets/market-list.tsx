"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketsAPI } from "@/lib/api"
import { formatCurrency, formatPercent, getChangeColor } from "@/lib/utils"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

export function MarketList() {
  const { data } = useQuery({
    queryKey: ["markets", "india", "list"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })
  const rows = data?.heatmap || []
  const gainers = [...rows].sort((a, b) => b.pChange - a.pChange).slice(0, 6)
  const losers = [...rows].sort((a, b) => a.pChange - b.pChange).slice(0, 6)

  return (
    <Card>
      <CardHeader>
        <CardTitle>NSE Top Movers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-bullish">Top Gainers</div>
            {gainers.map((s) => (
              <div key={s.symbol} className="p-3 rounded-lg bg-accent/30 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.symbol}</div>
                  <div className="text-xs text-muted-foreground">{s.sector}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(s.price)}</div>
                  <div className={`text-xs ${getChangeColor(s.pChange)}`}>{formatPercent(s.pChange)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-bearish">Top Losers</div>
            {losers.map((s) => (
              <div key={s.symbol} className="p-3 rounded-lg bg-accent/30 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.symbol}</div>
                  <div className="text-xs text-muted-foreground">{s.sector}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(s.price)}</div>
                  <div className={`text-xs ${getChangeColor(s.pChange)}`}>{formatPercent(s.pChange)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DataSourceBadge source={data?.source} asOf={data?.as_of} className="mt-3" />
      </CardContent>
    </Card>
  )
}
