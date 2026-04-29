"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { StocksAPI } from "@/lib/api"

// Computes a plain-English insight for the selected period
function buildInsight(prices: number[], period: string): string {
  if (prices.length < 2) return ""
  const first = prices[0]
  const last = prices[prices.length - 1]
  const pct = ((last - first) / first) * 100
  const high = Math.max(...prices)
  const low = Math.min(...prices)
  const range = high - low

  const direction = pct >= 1 ? "up" : pct <= -1 ? "down" : "flat"
  const magnitude =
    Math.abs(pct) >= 10 ? "sharply" :
    Math.abs(pct) >= 4  ? "significantly" :
    Math.abs(pct) >= 1  ? "moderately" : "marginally"

  const sign = pct >= 0 ? "+" : ""
  const periodLabel: Record<string, string> = {
    "1D": "today", "5D": "over 5 days", "1M": "this month",
    "6M": "over 6 months", "1Y": "over the past year", "5Y": "over 5 years",
  }
  const label = periodLabel[period] ?? `over this period`

  // Position vs range
  const nearHigh = last >= high * 0.97
  const nearLow = last <= low + range * 0.03

  let posNote = ""
  if (nearHigh && direction !== "down") posNote = " Currently near its period high."
  else if (nearLow && direction !== "up") posNote = " Currently near its period low."

  if (direction === "flat") {
    return `Stock is range-bound ${label} (${sign}${pct.toFixed(1)}%) — trading within a ₹${range.toFixed(0)} range.${posNote}`
  }
  return `Stock is ${magnitude} ${direction} ${label} (${sign}${pct.toFixed(1)}%) — from ₹${first.toFixed(0)} to ₹${last.toFixed(0)}.${posNote}`
}

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

  const insight = buildInsight(prices, period)
  const pctChange = prices.length >= 2
    ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
    : 0
  const insightColor = pctChange >= 1 ? "text-bullish" : pctChange <= -1 ? "text-bearish" : "text-muted-foreground"
  const InsightIcon = pctChange >= 1 ? TrendingUp : pctChange <= -1 ? TrendingDown : Minus
  const lineColor = pctChange >= 0 ? "#22C55E" : "#EF4444"

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
          <>
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
                {prices.length >= 2 && (
                  <ReferenceLine y={prices[0]} stroke="#71717a" strokeDasharray="4 4" strokeOpacity={0.4} />
                )}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={chartData.length < 16}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Period Insight bar */}
            {insight && (
              <div className={`flex items-start gap-2 mt-3 pt-3 border-t border-border/30 text-sm ${insightColor}`}>
                <InsightIcon className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="leading-snug">{insight}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
