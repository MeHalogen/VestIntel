"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { MarketsAPI } from "@/lib/api"

export function MarketHeatmapWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["markets", "india", "heatmap-widget"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })
  const heatmapData = (data?.heatmap || []).slice(0, 500)

  const getColor = (performance: number) => {
    if (performance > 2) return "bg-bullish/80 border-bullish"
    if (performance > 0.25) return "bg-bullish/45 border-bullish/70"
    if (performance < -2) return "bg-bearish/80 border-bearish"
    if (performance < -0.25) return "bg-bearish/45 border-bearish/70"
    return "bg-muted/40 border-muted-foreground/40"
  }

  const getSize = (marketCap: number) => {
    if (marketCap > 100_000_000_000) return "col-span-3 row-span-3"
    if (marketCap > 20_000_000_000) return "col-span-2 row-span-2"
    if (marketCap > 2_000_000_000) return "col-span-2 row-span-1"
    return "col-span-1 row-span-1"
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Market Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-9 gap-2 h-[500px]">
          {heatmapData.map((stock) => (
            <div
              key={stock.symbol}
              className={`${getColor(stock.pChange)} ${getSize(stock.marketCap)} rounded-lg border-2 p-3 flex flex-col justify-between hover:opacity-80 transition-all cursor-pointer hover:scale-105`}
            >
              <div>
                <div className="font-bold text-sm">{stock.symbol}</div>
                <div className="text-xs opacity-70">{stock.sector || "NSE"}</div>
              </div>
              <div className="flex items-center gap-1">
                {stock.pChange >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span className="font-bold text-sm">
                  {stock.pChange >= 0 ? "+" : ""}
                  {stock.pChange.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
          {!isLoading && heatmapData.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground">
              NSE heatmap data unavailable. Worker will retry and reuse last cache.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
