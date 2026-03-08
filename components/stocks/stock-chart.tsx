"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { StocksAPI } from "@/lib/api"

export function StockChart({ symbol }: { symbol: string }) {
  const [period, setPeriod] = useState("1M")
  const { data = [] } = useQuery({
    queryKey: ["stock", "history", symbol, period],
    queryFn: () => StocksAPI.history(symbol, period),
    refetchInterval: 120_000,
  })

  const formatTick = (iso: string) => {
    const dt = new Date(iso)
    if (period === "1D" || period === "5D") {
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    if (period === "1M" || period === "6M") {
      return dt.toLocaleDateString([], { day: "2-digit", month: "short" })
    }
    return dt.toLocaleDateString([], { month: "short", year: "2-digit" })
  }

  const chartData = data.map((d) => ({
    date: d.date,
    price: d.close,
  }))

  const prices = chartData.map((d) => d.price)
  const min = prices.length ? Math.min(...prices) : 0
  const max = prices.length ? Math.max(...prices) : 0
  const pad = Math.max((max - min) * 0.08, 0.5)
  const yMin = min - pad
  const yMax = max + pad

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Price Chart</CardTitle>
          <div className="flex gap-2">
            {["1D", "5D", "1M", "6M", "1Y", "5Y"].map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
            No historical candles available yet for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="#71717a" tickFormatter={formatTick} minTickGap={28} />
              <YAxis stroke="#71717a" domain={[yMin, yMax]} />
              <Tooltip
                labelFormatter={(label) => new Date(label).toLocaleString()}
                formatter={(value: number) => [`₹${value.toFixed(2)}`, "Price"]}
                contentStyle={{
                  backgroundColor: "#141A2A",
                  border: "1px solid #2D3748",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#4F8CFF"
                strokeWidth={2}
                dot={chartData.length < 16}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
