"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RotateCcw, TrendingUp, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const rotationData = {
  from: {
    name: "Technology",
    outflow: "$12.4B",
    stocks: ["AAPL", "MSFT", "NVDA"],
    performance: -2.3
  },
  to: {
    name: "Healthcare",
    inflow: "$8.9B",
    stocks: ["UNH", "JNJ", "ABBV"],
    performance: 4.7
  },
  signal: "Strong Rotation",
  confidence: 87
}

const sectorMomentum = [
  { sector: "Healthcare", momentum: 92, flow: "+$8.9B", trend: "Bullish" },
  { sector: "Energy", momentum: 78, flow: "+$4.2B", trend: "Bullish" },
  { sector: "Consumer Staples", momentum: 65, flow: "+$2.1B", trend: "Neutral" },
  { sector: "Technology", momentum: 34, flow: "-$12.4B", trend: "Bearish" },
  { sector: "Finance", momentum: 28, flow: "-$6.7B", trend: "Bearish" },
]

export function SectorRotationRadar() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-primary" />
          Sector Rotation Radar
          <Badge variant="destructive" className="ml-2 animate-pulse">
            Active Rotation
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Main Rotation Flow */}
        <div className="p-6 rounded-lg bg-gradient-to-r from-bearish/10 via-accent/10 to-bullish/10 border border-border/50 mb-6">
          <div className="flex items-center justify-between">
            {/* Outflow */}
            <div className="flex-1 text-center">
              <div className="text-sm text-muted-foreground mb-2">Capital Leaving</div>
              <div className="text-2xl font-bold text-bearish mb-1">{rotationData.from.name}</div>
              <div className="text-lg font-semibold text-bearish">{rotationData.from.outflow}</div>
              <div className="flex gap-1 justify-center mt-2">
                {rotationData.from.stocks.map((stock) => (
                  <Badge key={stock} variant="outline" className="border-bearish/50">
                    {stock}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-bearish mt-2">{rotationData.from.performance}%</div>
            </div>

            {/* Arrow */}
            <div className="px-8">
              <div className="flex flex-col items-center gap-2">
                <ArrowRight className="w-12 h-12 text-primary animate-pulse" />
                <Badge className="bg-primary">{rotationData.signal}</Badge>
                <div className="text-xs text-muted-foreground">
                  {rotationData.confidence}% Confidence
                </div>
              </div>
            </div>

            {/* Inflow */}
            <div className="flex-1 text-center">
              <div className="text-sm text-muted-foreground mb-2">Capital Entering</div>
              <div className="text-2xl font-bold text-bullish mb-1">{rotationData.to.name}</div>
              <div className="text-lg font-semibold text-bullish">{rotationData.to.inflow}</div>
              <div className="flex gap-1 justify-center mt-2">
                {rotationData.to.stocks.map((stock) => (
                  <Badge key={stock} variant="outline" className="border-bullish/50">
                    {stock}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-bullish mt-2">+{rotationData.to.performance}%</div>
            </div>
          </div>
        </div>

        {/* Sector Momentum */}
        <div className="space-y-2">
          <div className="text-sm font-semibold mb-3">Sector Momentum (7 Days)</div>
          {sectorMomentum.map((sector) => (
            <div
              key={sector.sector}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="font-semibold text-sm">{sector.sector}</div>
                <div className="w-full bg-accent/30 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      sector.momentum > 70 ? "bg-bullish" :
                      sector.momentum > 40 ? "bg-chart-tertiary" :
                      "bg-bearish"
                    }`}
                    style={{ width: `${sector.momentum}%` }}
                  />
                </div>
              </div>
              
              <div className="text-right">
                <div className={`font-semibold text-sm ${
                  sector.trend === "Bullish" ? "text-bullish" :
                  sector.trend === "Bearish" ? "text-bearish" :
                  "text-muted-foreground"
                }`}>
                  {sector.flow}
                </div>
                <Badge variant="outline" className={`text-xs mt-1 ${
                  sector.trend === "Bullish" ? "border-bullish text-bullish" :
                  sector.trend === "Bearish" ? "border-bearish text-bearish" :
                  ""
                }`}>
                  {sector.trend}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Insight */}
        <div className="mt-4 p-3 rounded-lg bg-accent/30 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-semibold">AI Insight</span>
          </div>
          <p className="text-muted-foreground">
            Strong capital rotation from Technology into Healthcare suggests defensive positioning.
            Healthcare stocks showing 4.7% outperformance with $8.9B inflows this week.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
