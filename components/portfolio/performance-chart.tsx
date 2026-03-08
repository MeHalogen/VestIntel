"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { PortfolioAPI } from "@/lib/api"

export function PerformanceChart() {
  const { data = [] } = useQuery({
    queryKey: ["portfolio", "performance"],
    queryFn: async () => {
      let portfolios = await PortfolioAPI.list()
      if (portfolios.length === 0) {
        await PortfolioAPI.create("Primary Portfolio", "Auto-created default portfolio")
        portfolios = await PortfolioAPI.list()
      }
      const analytics = await PortfolioAPI.analytics(portfolios[0].id)
      return analytics.performance_series
    },
    refetchInterval: 120_000,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="date" stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <Tooltip contentStyle={{ backgroundColor: '#141A2A', border: '1px solid #2D3748' }} />
            <Line type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
