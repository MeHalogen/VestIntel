"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import { PortfolioAPI } from "@/lib/api"

const COLORS = ["#4F8CFF", "#8B5CF6", "#F59E0B", "#22C55E"]

export function AssetAllocation() {
  const { data = [] } = useQuery({
    queryKey: ["portfolio", "allocation"],
    queryFn: async () => {
      let portfolios = await PortfolioAPI.list()
      if (portfolios.length === 0) {
        await PortfolioAPI.create("Primary Portfolio", "Auto-created default portfolio")
        portfolios = await PortfolioAPI.list()
      }
      const analytics = await PortfolioAPI.analytics(portfolios[0].id)
      return analytics.asset_allocation.map((a) => ({ name: a.sector, value: a.percentage }))
    },
    refetchInterval: 120_000,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
