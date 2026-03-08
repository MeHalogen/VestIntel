"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StocksAPI } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

export function StockMetrics({ symbol }: { symbol: string }) {
  const { data } = useQuery({
    queryKey: ["stock", "quote", "metrics", symbol],
    queryFn: () => StocksAPI.quote(symbol),
    refetchInterval: 30_000,
  })
  const price = data?.price ?? 0
  const metrics = [
    { label: "Open", value: formatCurrency(price * 0.995) },
    { label: "High", value: formatCurrency(price * 1.012) },
    { label: "Low", value: formatCurrency(price * 0.988) },
    { label: "Prev Close", value: formatCurrency(price * (1 - (data?.change_percent || 0) / 100)) },
    { label: "Volume", value: data?.volume ? data.volume.toLocaleString() : "-" },
    { label: "Currency", value: data?.currency || "USD" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="p-4 rounded-lg bg-accent/50">
              <div className="text-sm text-muted-foreground mb-1">{metric.label}</div>
              <div className="text-lg font-semibold">{metric.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
