"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const earningsShocks = [
  {
    symbol: "NVDA",
    company: "NVIDIA",
    expected: "$4.20",
    actual: "$5.82",
    beat: 38.6,
    reaction: "+12.3%",
    time: "2 hours ago",
    sentiment: "Extremely Bullish"
  },
  {
    symbol: "META",
    company: "Meta Platforms",
    expected: "$3.85",
    actual: "$4.96",
    beat: 28.8,
    reaction: "+8.7%",
    time: "1 day ago",
    sentiment: "Very Bullish"
  },
  {
    symbol: "TSLA",
    company: "Tesla",
    expected: "$2.10",
    actual: "$1.47",
    beat: -30.0,
    reaction: "-9.4%",
    time: "2 days ago",
    sentiment: "Bearish"
  },
  {
    symbol: "MSFT",
    company: "Microsoft",
    expected: "$2.75",
    actual: "$3.12",
    beat: 13.5,
    reaction: "+4.2%",
    time: "3 days ago",
    sentiment: "Bullish"
  },
]

const upcomingEarnings = [
  { symbol: "AAPL", date: "March 10", analyst: "$1.95", consensus: "Beat" },
  { symbol: "AMZN", date: "March 12", analyst: "$1.08", consensus: "Beat" },
  { symbol: "GOOGL", date: "March 15", analyst: "$1.65", consensus: "Meet" },
]

export function EarningsShockDetector() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Earnings Shock Detector
          <Badge variant="secondary" className="ml-2">Real-time</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Recent Shocks */}
          <div>
            <div className="text-sm font-semibold mb-3">Recent Earnings Shocks</div>
            <div className="space-y-3">
              {earningsShocks.map((shock) => (
                <div
                  key={shock.symbol}
                  className={`p-4 rounded-lg border-2 ${
                    shock.beat > 0
                      ? "bg-bullish/5 border-bullish/30"
                      : "bg-bearish/5 border-bearish/30"
                  } hover:scale-[1.02] transition-transform cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{shock.symbol}</span>
                        <Badge variant={shock.beat > 0 ? "default" : "destructive"} className="animate-pulse">
                          {shock.beat > 0 ? "BEAT" : "MISS"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{shock.company}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold flex items-center gap-1 ${
                        shock.beat > 0 ? "text-bullish" : "text-bearish"
                      }`}>
                        {shock.beat > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        {shock.beat > 0 ? "+" : ""}{shock.beat}%
                      </div>
                      <div className="text-xs text-muted-foreground">{shock.time}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-border/30">
                    <div>
                      <div className="text-xs text-muted-foreground">Expected</div>
                      <div className="font-semibold">{shock.expected}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Actual</div>
                      <div className="font-semibold">{shock.actual}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Reaction</div>
                      <div className={`font-semibold ${
                        shock.beat > 0 ? "text-bullish" : "text-bearish"
                      }`}>
                        {shock.reaction}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {shock.sentiment}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Earnings */}
          <div className="pt-4 border-t border-border/50">
            <div className="text-sm font-semibold mb-3">Upcoming Earnings (Watchlist)</div>
            <div className="space-y-2">
              {upcomingEarnings.map((earning) => (
                <div
                  key={earning.symbol}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-sm">{earning.symbol}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{earning.date}</div>
                      <div className="text-xs text-muted-foreground">
                        Estimate: {earning.analyst}
                      </div>
                    </div>
                  </div>
                  
                  <Badge variant={earning.consensus === "Beat" ? "default" : "outline"}>
                    {earning.consensus}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 p-3 rounded-lg bg-accent/30 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Beat Rate (Q4 2025)</div>
                <div className="font-bold text-lg text-bullish">78%</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Avg Beat</div>
                <div className="font-bold text-lg text-primary">+12.4%</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Avg Reaction</div>
                <div className="font-bold text-lg text-bullish">+6.8%</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
