"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"
import { formatCurrency, formatPercent, getChangeColor } from "@/lib/utils"
import { MarketsAPI } from "@/lib/api"

export function TrendingStocks() {
  const { data, isLoading } = useQuery({
    queryKey: ["markets", "india", "trending-stocks"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })

  const rows = (data?.heatmap || []).map((h) => ({
    symbol: h.symbol,
    name: h.sector || "NSE",
    price: h.price,
    change: h.pChange,
  }))
  const sorted = [...rows].sort((a, b) => b.change - a.change)
  const gainers = sorted.slice(0, 3)
  const losers = [...rows].sort((a, b) => a.change - b.change).slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Trending Stocks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="text-sm font-semibold mb-3 flex items-center gap-2 text-bullish">
            <TrendingUp className="w-4 h-4" />
            Top Gainers
          </div>
          <div className="space-y-3">
            {gainers.map((stock) => (
              <div key={stock.symbol} className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{stock.symbol}</div>
                  <div className="text-xs text-muted-foreground">{stock.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(stock.price)}</div>
                  <div className={`text-xs ${getChangeColor(stock.change)}`}>
                    {formatPercent(stock.change)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3 flex items-center gap-2 text-bearish">
            <TrendingDown className="w-4 h-4" />
            Top Losers
          </div>
          <div className="space-y-3">
            {losers.map((stock) => (
              <div key={stock.symbol} className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{stock.symbol}</div>
                  <div className="text-xs text-muted-foreground">{stock.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(stock.price)}</div>
                  <div className={`text-xs ${getChangeColor(stock.change)}`}>
                    {formatPercent(stock.change)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {isLoading && <div className="text-xs text-muted-foreground">Refreshing trends...</div>}
      </CardContent>
    </Card>
  )
}
