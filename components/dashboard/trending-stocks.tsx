"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"
import { formatCurrency, formatPercent, getChangeColor } from "@/lib/utils"
import { MarketsAPI } from "@/lib/api"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

export function TrendingStocks() {
  const { data, isLoading } = useQuery({
    queryKey: ["markets", "india", "trending-stocks"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })

  const rows = (data?.heatmap || []).map((h) => ({
    symbol: h.symbol,
    sector: h.sector || "NSE",
    price: h.price,
    change: h.pChange,
  }))
  const sorted = [...rows].sort((a, b) => b.change - a.change)
  const gainers = sorted.slice(0, 3)
  const losers = [...rows].sort((a, b) => a.change - b.change).slice(0, 3)

  function whyGainer(change: number, sector: string): string {
    if (change >= 4) return `Exceptional surge — rare single-session gain in ${sector}.`
    if (change >= 2) return `Strong buying pressure pushing ${sector} higher.`
    return `Positive momentum in ${sector} today.`
  }

  function whyLoser(change: number, sector: string): string {
    if (change <= -4) return `Sharp sell-off — heavy pressure across ${sector}.`
    if (change <= -2) return `Significant decline with broad ${sector} weakness.`
    return `Mild selling in ${sector} today.`
  }

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
              <div key={stock.symbol} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{stock.symbol}</div>
                  <div className="text-right">
                    <span className="font-semibold">{formatCurrency(stock.price)}</span>
                    <span className={`ml-2 text-xs font-medium ${getChangeColor(stock.change)}`}>
                      {formatPercent(stock.change)}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  {whyGainer(stock.change, stock.sector)}
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
              <div key={stock.symbol} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{stock.symbol}</div>
                  <div className="text-right">
                    <span className="font-semibold">{formatCurrency(stock.price)}</span>
                    <span className={`ml-2 text-xs font-medium ${getChangeColor(stock.change)}`}>
                      {formatPercent(stock.change)}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  {whyLoser(stock.change, stock.sector)}
                </div>
              </div>
            ))}
          </div>
        </div>
        {isLoading && <div className="text-xs text-muted-foreground">Refreshing trends...</div>}
        <DataSourceBadge source={data?.source} asOf={data?.as_of} className="mt-2" />
      </CardContent>
    </Card>
  )
}
