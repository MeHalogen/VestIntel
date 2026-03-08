"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PortfolioAPI } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

export function Holdings() {
  const { data: holdings = [] } = useQuery({
    queryKey: ["portfolio", "holdings"],
    queryFn: async () => {
      let portfolios = await PortfolioAPI.list()
      if (portfolios.length === 0) {
        await PortfolioAPI.create("Primary Portfolio", "Auto-created default portfolio")
        portfolios = await PortfolioAPI.list()
      }
      const id = portfolios[0].id
      let rows = await PortfolioAPI.holdings(id)
      if (rows.length === 0) {
        await PortfolioAPI.addHolding(id, { symbol: "RELIANCE", shares: 10, avg_cost: 1400 })
        await PortfolioAPI.addHolding(id, { symbol: "TCS", shares: 8, avg_cost: 3800 })
        await PortfolioAPI.addHolding(id, { symbol: "INFY", shares: 12, avg_cost: 1600 })
        rows = await PortfolioAPI.holdings(id)
      }
      return rows
    },
    refetchInterval: 60_000,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 text-sm font-semibold">Symbol</th>
                <th className="text-right py-3 text-sm font-semibold">Shares</th>
                <th className="text-right py-3 text-sm font-semibold">Avg Cost</th>
                <th className="text-right py-3 text-sm font-semibold">Current</th>
                <th className="text-right py-3 text-sm font-semibold">Value</th>
                <th className="text-right py-3 text-sm font-semibold">Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding) => {
                const gainLoss = holding.gain_loss
                return (
                  <tr key={holding.symbol} className="border-b border-border/50 last:border-0">
                    <td className="py-3">
                      <div className="font-semibold">{holding.symbol}</div>
                      <div className="text-xs text-muted-foreground">{holding.name}</div>
                    </td>
                    <td className="text-right">{holding.shares}</td>
                    <td className="text-right">{formatCurrency(holding.avg_cost)}</td>
                    <td className="text-right">{formatCurrency(holding.current_price)}</td>
                    <td className="text-right font-semibold">{formatCurrency(holding.value)}</td>
                    <td className={`text-right font-semibold ${gainLoss >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {gainLoss >= 0 ? '+' : ''}{gainLoss.toFixed(2)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
