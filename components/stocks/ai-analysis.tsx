"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp } from "lucide-react"
import { StocksAPI } from "@/lib/api"
import { usePlan } from "@/lib/use-plan"
import { canUse, upgradeMessage } from "@/lib/entitlements"

export function AIAnalysis({ symbol }: { symbol: string }) {
  const { plan } = usePlan()
  const allowed = canUse(plan, "ai_stock_analysis")

  const { data } = useQuery({
    queryKey: ["stock", "analysis", symbol],
    queryFn: () => StocksAPI.analysis(symbol),
    refetchInterval: 120_000,
    enabled: allowed,
  })
  if (!allowed) {
    return (
      <Card className="panel-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border border-border/50 bg-background/50">
            <div className="text-sm font-semibold">Upgrade required</div>
            <p className="text-sm text-muted-foreground mt-1">{upgradeMessage("ai_stock_analysis")}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const analysis = data || {
    symbol: symbol.toUpperCase(),
    summary: "Loading AI analysis...",
    sentiment_score: 0,
    technical_rating: "-",
    risk_level: "-",
    key_insights: [],
  }

  return (
    <Card className="panel-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-background/50 border border-border/50">
          <p className="text-sm leading-relaxed">
            <strong className="text-primary">{analysis.symbol}</strong> {analysis.summary}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sentiment Score</span>
            <span className="text-lg font-bold text-bullish">{analysis.sentiment_score}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Technical Rating</span>
            <span className="text-lg font-bold text-primary">{analysis.technical_rating}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Risk Level</span>
            <span className="text-lg font-bold text-chart-tertiary">{analysis.risk_level}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <div className="text-sm font-semibold mb-2">Key Insights</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {analysis.key_insights.map((insight) => (
              <li key={insight} className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
