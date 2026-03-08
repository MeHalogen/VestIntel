"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, Plus } from "lucide-react"
import { formatCurrency, formatPercent, getChangeColor } from "@/lib/utils"
import { MarketsAPI } from "@/lib/api"

type WatchItem = {
  symbol: string
  name: string
  price: number
  change: number
}

export function WatchlistWidget() {
  const { data: watchlist = [], isLoading } = useQuery<WatchItem[]>({
    queryKey: ["watchlist"],
    queryFn: async () => {
  const data = await MarketsAPI.watchlist()
      return (data?.items || []).map((q: any) => ({
        symbol: q.symbol,
        name: q.symbol,
        price: q.price,
        change: q.change_percent,
      }))
    },
    refetchInterval: 30_000,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Watchlist
          </span>
          <Button size="sm" variant="ghost">
            <Plus className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {watchlist.map((stock: WatchItem) => (
            <div
              key={stock.symbol}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
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
        {isLoading && <div className="text-xs text-muted-foreground mt-2">Loading watchlist...</div>}
      </CardContent>
    </Card>
  )
}
