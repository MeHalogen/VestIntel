"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { MarketsAPI } from "@/lib/api"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

export function SectorPerformance() {
  const { data } = useQuery({
    queryKey: ["markets", "india", "sector-bar"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })
  const chartData = (data?.sector_performance || []).map((s) => ({
    sector: s.sector,
    performance: s.performance,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sector Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="sector" stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <Tooltip contentStyle={{ backgroundColor: '#141A2A', border: '1px solid #2D3748' }} />
            <Bar dataKey="performance" fill="#4F8CFF" />
          </BarChart>
        </ResponsiveContainer>
        <DataSourceBadge source={data?.source} asOf={data?.as_of} className="mt-2" />
      </CardContent>
    </Card>
  )
}
