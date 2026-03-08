"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Network, TrendingUp, Link as LinkIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const correlations = [
  {
    pair: ["NVDA", "AMD"],
    correlation: 0.89,
    trend: "Highly Correlated",
    change: "+0.05 (30d)",
    description: "Both move together due to AI chip demand"
  },
  {
    pair: ["AAPL", "MSFT"],
    correlation: 0.76,
    trend: "Correlated",
    change: "-0.02 (30d)",
    description: "Big tech correlation, similar market cap movements"
  },
  {
    pair: ["XOM", "CVX"],
    correlation: 0.92,
    trend: "Highly Correlated",
    change: "+0.08 (30d)",
    description: "Energy sector correlation, oil price dependent"
  },
  {
    pair: ["TSLA", "SPY"],
    correlation: 0.34,
    trend: "Weakly Correlated",
    change: "-0.12 (30d)",
    description: "Tesla showing increased independence from market"
  },
  {
    pair: ["GLD", "SPY"],
    correlation: -0.68,
    trend: "Negatively Correlated",
    change: "-0.05 (30d)",
    description: "Gold moves opposite to stocks (safe haven)"
  },
]

const watchlistCorrelations = [
  { symbol: "AAPL", avgCorrelation: 0.72, risk: "Moderate" },
  { symbol: "NVDA", avgCorrelation: 0.81, risk: "High" },
  { symbol: "TSLA", avgCorrelation: 0.43, risk: "Low" },
  { symbol: "MSFT", avgCorrelation: 0.74, risk: "Moderate" },
]

export function CorrelationExplorer() {
  const getCorrelationColor = (corr: number) => {
    const absCorr = Math.abs(corr)
    if (absCorr > 0.8) return "text-bearish"
    if (absCorr > 0.6) return "text-chart-tertiary"
    return "text-bullish"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          Correlation Explorer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Correlation Pairs */}
          {correlations.map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="font-mono">
                      {item.pair[0]}
                    </Badge>
                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="secondary" className="font-mono">
                      {item.pair[1]}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getCorrelationColor(item.correlation)}`}>
                    {item.correlation > 0 ? "+" : ""}{item.correlation.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.change}</div>
                </div>
              </div>

              <div className="mb-2">
                <div className="w-full bg-accent/30 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      Math.abs(item.correlation) > 0.8
                        ? "bg-bearish"
                        : Math.abs(item.correlation) > 0.6
                        ? "bg-chart-tertiary"
                        : "bg-bullish"
                    }`}
                    style={{ width: `${Math.abs(item.correlation) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {item.trend}
                </Badge>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}

          {/* Portfolio Correlation Risk */}
          <div className="mt-6 p-4 rounded-lg bg-accent/20 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-semibold">Your Watchlist Correlation Risk</span>
            </div>
            
            <div className="space-y-2">
              {watchlistCorrelations.map((item) => (
                <div key={item.symbol} className="flex items-center justify-between p-2 rounded hover:bg-accent/50">
                  <span className="font-mono font-semibold">{item.symbol}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      Avg: <span className="font-semibold">{item.avgCorrelation.toFixed(2)}</span>
                    </span>
                    <Badge variant={
                      item.risk === "High" ? "destructive" :
                      item.risk === "Moderate" ? "default" :
                      "secondary"
                    } className="text-xs">
                      {item.risk}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-border/30 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Portfolio Avg Correlation:</span>
                <span className="font-bold text-chart-tertiary">0.68</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Your portfolio has moderate correlation. Consider adding negatively correlated assets for diversification.
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-bearish" />
              <span>High Risk (0.8+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-chart-tertiary" />
              <span>Moderate (0.6-0.8)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-bullish" />
              <span>Low Risk (&lt;0.6)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
