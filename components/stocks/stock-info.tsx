"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { StocksAPI } from "@/lib/api"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

export function StockInfo({ symbol }: { symbol: string }) {
  const { data } = useQuery({
    queryKey: ["stock", "quote", symbol],
    queryFn: () => StocksAPI.quote(symbol),
    refetchInterval: 20_000,
  })
  const price = data?.price ?? 0
  const change = data?.change_percent ?? 0
  const volume = data?.volume ?? 0

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{symbol.toUpperCase()}</h1>
            <p className="text-muted-foreground">
              {data?.sector
                ? `${data.sector} · ${data.exchange ?? "NSE"}`
                : data?.exchange === "NSE" || data?.currency === "INR"
                ? "NSE · India"
                : data?.exchange
                ? `${data.exchange} market`
                : "NSE · India"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{formatCurrency(price)}</div>
            <div className={`flex items-center gap-2 mt-1 ${change >= 0 ? "text-bullish" : "text-bearish"}`}>
              {change >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span className="text-lg font-semibold">{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-6 mt-6 pt-6 border-t border-border/50">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Market Cap</div>
            <div className="text-lg font-semibold">
              {data?.market_cap ? formatNumber(data.market_cap) : "-"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">P/E Ratio</div>
            <div className="text-lg font-semibold">-</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Volume</div>
            <div className="text-lg font-semibold">{volume ? volume.toLocaleString() : "-"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">52W High</div>
            <div className="text-lg font-semibold">-</div>
          </div>
        </div>
        <DataSourceBadge source={data?.source} asOf={data?.as_of} className="mt-4 pt-3 border-t border-border/30" />
      </CardContent>
    </Card>
  )
}
