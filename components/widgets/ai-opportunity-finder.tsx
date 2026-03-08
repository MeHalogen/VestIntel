"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Target, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const opportunities = [
  {
    symbol: "CRWD",
    name: "CrowdStrike",
    type: "Undervalued",
    score: 94,
    reason: "Trading 25% below analyst price targets",
    upside: "+32%",
    signals: ["Strong Revenue Growth", "High Margin", "Low P/E"]
  },
  {
    symbol: "PLTR",
    name: "Palantir",
    type: "Momentum",
    score: 89,
    reason: "50-day MA crossed above 200-day MA (Golden Cross)",
    upside: "+18%",
    signals: ["Volume Surge", "RSI Bullish", "Breakout"]
  },
  {
    symbol: "COIN",
    name: "Coinbase",
    type: "Breakout",
    score: 87,
    reason: "Breaking through resistance at $185",
    upside: "+24%",
    signals: ["Resistance Break", "High Volume", "Momentum"]
  },
  {
    symbol: "SQ",
    name: "Block Inc",
    type: "Undervalued",
    score: 85,
    reason: "Revenue growth 45% YoY, P/E ratio below sector average",
    upside: "+29%",
    signals: ["Strong Fundamentals", "Growth", "Low Valuation"]
  },
]

export function AIOpportunityFinder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Opportunity Finder
          <Badge className="ml-2 bg-gradient-to-r from-primary to-accent">
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div
              key={opp.symbol}
              className="p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all cursor-pointer bg-gradient-to-br from-card to-accent/5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg text-primary">{opp.symbol}</span>
                    <Badge variant="outline" className={
                      opp.type === "Undervalued" ? "border-bullish text-bullish" :
                      opp.type === "Momentum" ? "border-primary text-primary" :
                      "border-accent text-accent"
                    }>
                      {opp.type}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{opp.name}</div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm">AI Score</span>
                  </div>
                  <div className="text-2xl font-bold text-primary">{opp.score}</div>
                </div>
              </div>

              <p className="text-sm mb-3">{opp.reason}</p>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {opp.signals.map((signal) => (
                    <Badge key={signal} variant="secondary" className="text-xs">
                      {signal}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Upside:</span>
                  <span className="font-bold text-bullish flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {opp.upside}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full mt-4 bg-gradient-to-r from-primary to-accent">
          <Sparkles className="w-4 h-4 mr-2" />
          Find More Opportunities
        </Button>
      </CardContent>
    </Card>
  )
}
