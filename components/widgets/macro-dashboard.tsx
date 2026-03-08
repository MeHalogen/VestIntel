"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const macroData = [
  {
    indicator: "Fed Funds Rate",
    current: "5.25%",
    previous: "5.50%",
    change: -0.25,
    trend: "Decreasing",
    impact: "Bullish for stocks"
  },
  {
    indicator: "10-Year Treasury",
    current: "4.32%",
    previous: "4.58%",
    change: -0.26,
    trend: "Decreasing",
    impact: "Bullish for growth stocks"
  },
  {
    indicator: "CPI Inflation",
    current: "3.1%",
    previous: "3.4%",
    change: -0.3,
    trend: "Decreasing",
    impact: "Positive for rate cuts"
  },
  {
    indicator: "Unemployment",
    current: "3.7%",
    previous: "3.5%",
    change: 0.2,
    trend: "Increasing",
    impact: "Neutral"
  },
  {
    indicator: "GDP Growth",
    current: "2.8%",
    previous: "2.5%",
    change: 0.3,
    trend: "Increasing",
    impact: "Bullish for economy"
  },
  {
    indicator: "Dollar Index (DXY)",
    current: "103.45",
    previous: "104.82",
    change: -1.37,
    trend: "Weakening",
    impact: "Bullish for exports"
  },
]

export function MacroDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Macro Dashboard
          <Badge variant="secondary" className="ml-2">Live Data</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {macroData.map((item) => (
            <div
              key={item.indicator}
              className="p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-semibold text-muted-foreground">
                  {item.indicator}
                </div>
                {item.change !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${
                    item.change > 0 ? "text-bullish" : "text-bearish"
                  }`}>
                    {item.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(item.change).toFixed(2)}
                  </div>
                )}
              </div>

              <div className="text-3xl font-bold mb-2">{item.current}</div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Previous: {item.previous}
                </span>
                <Badge variant={
                  item.trend === "Increasing" || item.trend === "Decreasing"
                    ? "outline"
                    : "secondary"
                } className="text-xs">
                  {item.trend}
                </Badge>
              </div>

              <div className="mt-2 pt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground">{item.impact}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Market Impact Summary */}
        <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-bullish/10 to-primary/10 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-bullish" />
            <span className="font-semibold">Macro Environment Assessment</span>
          </div>
          <p className="text-sm mb-3">
            Current macro conditions are <span className="font-bold text-bullish">moderately bullish</span> for equities.
            Falling interest rates and decreasing inflation support stock valuations, particularly growth stocks.
          </p>
          <div className="flex gap-2">
            <Badge variant="secondary">Rate Cuts Expected</Badge>
            <Badge variant="secondary">Inflation Cooling</Badge>
            <Badge variant="secondary">Strong GDP</Badge>
          </div>
        </div>

        {/* Fed Calendar */}
        <div className="mt-4 p-4 rounded-lg bg-accent/20 border border-border/50">
          <div className="text-sm font-semibold mb-3">Upcoming Fed Events</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>FOMC Meeting</span>
              <Badge>March 20, 2026</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Powell Testimony</span>
              <Badge variant="outline">March 28, 2026</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>CPI Report</span>
              <Badge variant="outline">April 12, 2026</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
