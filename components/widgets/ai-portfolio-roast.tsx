"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Flame, TrendingDown, AlertTriangle, Target, Share2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const roastExample = {
  score: 42,
  grade: "D+",
  risk: "Extremely High",
  roast: [
    "Your portfolio is 82% tech stocks. You're basically betting your entire financial future on whether Elon tweets today.",
    "You have ZERO diversification. If the semiconductor industry sneezes, your portfolio catches pneumonia.",
    "45% of your holdings are in 3 stocks (NVDA, TSLA, META). That's not a portfolio, that's a fan club.",
    "Your correlation risk is 0.89. These stocks move together like synchronized swimmers... straight down in a crash.",
  ],
  strengths: [
    "You're in high-growth sectors (good timing)",
    "Your top holdings have strong fundamentals"
  ],
  weaknesses: [
    "No defensive positions",
    "Sector concentration risk",
    "No international exposure",
    "High beta portfolio (2.3x market)"
  ],
  suggestions: [
    {
      action: "Add Healthcare",
      reason: "Defensive sector with lower correlation to tech",
      tickers: ["UNH", "JNJ", "ABBV"]
    },
    {
      action: "Add Consumer Staples",
      reason: "Recession-resistant stocks for stability",
      tickers: ["PG", "KO", "WMT"]
    },
    {
      action: "Reduce Tech Exposure",
      reason: "Sell 30% of semiconductor holdings",
      tickers: ["NVDA", "AMD"]
    },
    {
      action: "Add Bonds/Treasury ETFs",
      reason: "Risk-free assets for downside protection",
      tickers: ["TLT", "SHY"]
    }
  ]
}

export function AIPortfolioRoast() {
  const [showRoast, setShowRoast] = useState(false)

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-bearish" />
          AI Portfolio Roast
          <Badge className="ml-2 bg-gradient-to-r from-bearish to-accent animate-pulse">
            Viral Feature
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!showRoast ? (
          <div className="text-center py-12">
            <Flame className="w-16 h-16 mx-auto mb-4 text-bearish" />
            <h3 className="text-2xl font-bold mb-2">Get Your Portfolio Roasted</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Our AI will brutally analyze your portfolio and expose every mistake you're making.
              Then it'll tell you exactly how to fix it.
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-bearish to-accent hover:opacity-90"
              onClick={() => setShowRoast(true)}
            >
              <Brain className="w-5 h-5 mr-2" />
              Roast My Portfolio
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Warning: AI can be savage. But it's for your own good.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score Card */}
            <div className="p-6 rounded-lg bg-gradient-to-br from-bearish/20 to-accent/20 border-2 border-bearish/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Portfolio Health Score</div>
                  <div className="text-6xl font-bold text-bearish">{roastExample.score}/100</div>
                  <div className="text-2xl font-bold text-bearish mt-2">Grade: {roastExample.grade}</div>
                </div>
                <div className="text-right">
                  <Badge variant="destructive" className="text-lg px-4 py-2 animate-pulse">
                    {roastExample.risk}
                  </Badge>
                  <div className="mt-4 flex gap-2">
                    <AlertTriangle className="w-8 h-8 text-bearish" />
                    <TrendingDown className="w-8 h-8 text-bearish" />
                  </div>
                </div>
              </div>
            </div>

            {/* The Roast */}
            <div className="p-4 rounded-lg bg-bearish/10 border border-bearish/30">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-bearish" />
                <span className="font-bold text-lg">The Brutal Truth</span>
              </div>
              <div className="space-y-3">
                {roastExample.roast.map((line, i) => (
                  <p key={i} className="text-sm pl-4 border-l-2 border-bearish/50">
                    🔥 {line}
                  </p>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-bullish/10 border border-bullish/30">
                <h4 className="font-bold mb-2 text-bullish">What You Got Right</h4>
                <ul className="space-y-1 text-sm">
                  {roastExample.strengths.map((item, i) => (
                    <li key={i}>✓ {item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-bearish/10 border border-bearish/30">
                <h4 className="font-bold mb-2 text-bearish">Critical Weaknesses</h4>
                <ul className="space-y-1 text-sm">
                  {roastExample.weaknesses.map((item, i) => (
                    <li key={i}>✗ {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-bold text-lg">How to Fix This Mess</span>
              </div>
              <div className="space-y-3">
                {roastExample.suggestions.map((suggestion, i) => (
                  <div key={i} className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold">{i + 1}. {suggestion.action}</div>
                      <Badge variant="outline" className="text-xs">Recommended</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{suggestion.reason}</p>
                    <div className="flex gap-2">
                      {suggestion.tickers.map((ticker) => (
                        <Badge key={ticker} variant="secondary" className="font-mono">
                          {ticker}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Share CTA */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary to-accent text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold mb-1">Share Your Roast</h4>
                  <p className="text-sm opacity-90">
                    Let your followers know you're fixing your portfolio 📉→📈
                  </p>
                </div>
                <Button variant="secondary" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share on X
                </Button>
              </div>
            </div>

            {/* Try Again */}
            <div className="text-center">
              <Button variant="outline" onClick={() => setShowRoast(false)}>
                Analyze Another Portfolio
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
