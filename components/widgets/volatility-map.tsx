"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const volatilityData = [
  { sector: "Technology", vix: 28.5, level: "High", hotspots: ["NVDA", "TSLA", "META"] },
  { sector: "Finance", vix: 22.3, level: "Medium", hotspots: ["JPM", "GS", "BAC"] },
  { sector: "Healthcare", vix: 15.7, level: "Low", hotspots: ["PFE", "MRNA"] },
  { sector: "Energy", vix: 31.2, level: "High", hotspots: ["XOM", "CVX", "COP"] },
  { sector: "Consumer", vix: 18.9, level: "Medium", hotspots: ["AMZN", "WMT"] },
  { sector: "Industrials", vix: 16.4, level: "Low", hotspots: ["BA", "CAT"] },
]

const stockVolatility = [
  { symbol: "TSLA", iv: 68.5, percentile: 95, risk: "Extreme" },
  { symbol: "NVDA", iv: 52.3, percentile: 88, risk: "Very High" },
  { symbol: "META", iv: 45.1, percentile: 72, risk: "High" },
  { symbol: "AAPL", iv: 28.3, percentile: 45, risk: "Moderate" },
  { symbol: "JNJ", iv: 18.7, percentile: 28, risk: "Low" },
]

export function VolatilityMap() {
  const getVolatilityColor = (level: string) => {
    if (level === "High" || level === "Extreme" || level === "Very High") return "bg-bearish/80 border-bearish"
    if (level === "Medium" || level === "Moderate") return "bg-chart-tertiary/50 border-chart-tertiary"
    return "bg-bullish/30 border-bullish"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Volatility Map
          <Badge variant="destructive" className="ml-2">Risk Monitor</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Sector Volatility Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {volatilityData.map((item) => (
            <div
              key={item.sector}
              className={`p-4 rounded-lg border-2 ${getVolatilityColor(item.level)} hover:scale-105 transition-all cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm">{item.sector}</div>
                <AlertTriangle className={`w-4 h-4 ${
                  item.level === "High" ? "text-bearish" :
                  item.level === "Medium" ? "text-chart-tertiary" :
                  "text-bullish"
                }`} />
              </div>
              
              <div className="text-2xl font-bold mb-2">{item.vix}</div>
              
              <Badge variant={
                item.level === "High" ? "destructive" :
                item.level === "Medium" ? "default" :
                "secondary"
              } className="text-xs mb-2">
                {item.level} Risk
              </Badge>

              <div className="flex flex-wrap gap-1 mt-2">
                {item.hotspots.map((stock) => (
                  <span key={stock} className="text-xs font-mono px-1.5 py-0.5 rounded bg-background/50">
                    {stock}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Stock-Level Volatility */}
        <div className="mb-6">
          <div className="text-sm font-semibold mb-3">High Volatility Stocks (Your Watchlist)</div>
          <div className="space-y-2">
            {stockVolatility.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="font-mono font-bold">{stock.symbol}</div>
                  <Badge variant={
                    stock.risk === "Extreme" || stock.risk === "Very High" ? "destructive" :
                    stock.risk === "High" ? "default" :
                    "secondary"
                  }>
                    {stock.risk}
                  </Badge>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Implied Vol</div>
                    <div className="font-bold">{stock.iv}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Percentile</div>
                    <div className="font-bold">{stock.percentile}th</div>
                  </div>
                  <div className="w-20">
                    <div className="w-full bg-accent/30 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          stock.percentile > 80 ? "bg-bearish" :
                          stock.percentile > 50 ? "bg-chart-tertiary" :
                          "bg-bullish"
                        }`}
                        style={{ width: `${stock.percentile}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market-Wide Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-accent/20">
            <div className="text-xs text-muted-foreground mb-1">VIX Index</div>
            <div className="text-2xl font-bold text-chart-tertiary">18.7</div>
            <div className="text-xs text-muted-foreground">Medium Fear</div>
          </div>
          <div className="p-3 rounded-lg bg-accent/20">
            <div className="text-xs text-muted-foreground mb-1">MOVE Index</div>
            <div className="text-2xl font-bold">112.3</div>
            <div className="text-xs text-muted-foreground">Bond Volatility</div>
          </div>
          <div className="p-3 rounded-lg bg-accent/20">
            <div className="text-xs text-muted-foreground mb-1">SKEW Index</div>
            <div className="text-2xl font-bold">145.2</div>
            <div className="text-xs text-muted-foreground">Tail Risk</div>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-4 p-3 rounded-lg bg-bearish/10 border border-bearish/30 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-bearish" />
            <span className="font-semibold text-bearish">High Volatility Alert</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Your portfolio contains 3 high-volatility stocks (TSLA, NVDA, META) representing 45% of holdings.
            Consider hedging or position sizing adjustments.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
