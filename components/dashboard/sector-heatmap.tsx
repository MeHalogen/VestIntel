"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Gauge } from "lucide-react"
import { MarketsAPI } from "@/lib/api"

const COLOR_MAP: Record<string, string> = {
  Technology: "#22C55E",
  Healthcare: "#4F8CFF",
  Finance: "#EF4444",
  Energy: "#F59E0B",
  Consumer: "#8B5CF6",
  Industrial: "#6EE7B7",
  Materials: "#FCA5A5",
  Utilities: "#93C5FD",
}

export function SectorHeatmap() {
  const { data } = useQuery({
    queryKey: ["markets", "india", "sector-heatmap"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })
  const sectors = (data?.sector_performance || []).map((s) => ({
    name: s.sector,
    performance: s.performance,
    color: COLOR_MAP[s.sector] || "#4F8CFF",
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Sector Performance Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {sectors.map((sector) => (
            <div
              key={sector.name}
              className="aspect-square rounded-lg p-4 flex flex-col justify-between cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: `${sector.color}20`,
                borderColor: sector.color,
                borderWidth: 2,
              }}
            >
              <div className="text-sm font-semibold">{sector.name}</div>
              <div className={`text-2xl font-bold ${
                sector.performance >= 0 ? "text-bullish" : "text-bearish"
              }`}>
                {sector.performance >= 0 ? "+" : ""}{sector.performance}%
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
