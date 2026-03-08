"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { PortfolioAPI } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

export function PortfolioOverview() {
  const { data } = useQuery({
    queryKey: ["portfolio", "overview"],
    queryFn: async () => {
      let portfolios = await PortfolioAPI.list()
      if (portfolios.length === 0) {
        await PortfolioAPI.create("Primary Portfolio", "Auto-created default portfolio")
        portfolios = await PortfolioAPI.list()
      }
      const p = portfolios[0]
      const analytics = await PortfolioAPI.analytics(p.id)
      return { p, analytics }
    },
    refetchInterval: 60_000,
  })
  const p = data?.p
  const analytics = data?.analytics

  return (
    <div className="grid gap-6 md:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Total Value</div>
          <div className="text-3xl font-bold">{formatCurrency(analytics?.total_value || 0)}</div>
          <div className="text-sm text-bullish mt-1">{(analytics?.total_gain_loss || 0).toFixed(2)}%</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Today's Change</div>
          <div className="text-3xl font-bold text-bullish">{(analytics?.daily_change || 0).toFixed(2)}%</div>
          <div className="text-sm text-muted-foreground mt-1">{p?.holdings_count || 0} holdings</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Diversification</div>
          <div className="text-3xl font-bold text-primary">{(analytics?.diversification_score || 0).toFixed(1)}/10</div>
          <div className="text-sm text-muted-foreground mt-1">Well Balanced</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Risk Score</div>
          <div className="text-3xl font-bold text-chart-tertiary">{(analytics?.risk_score || 0).toFixed(1)}/10</div>
          <div className="text-sm text-muted-foreground mt-1">Moderate Risk</div>
        </CardContent>
      </Card>
    </div>
  )
}
