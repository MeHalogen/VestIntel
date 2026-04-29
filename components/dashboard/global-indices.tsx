"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, TrendingUp, TrendingDown } from "lucide-react"
import { MarketsAPI } from "@/lib/api"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

export function GlobalIndicesMonitor() {
  const { data: indiaData } = useQuery({
    queryKey: ["markets", "india"],
    queryFn: MarketsAPI.india,
    refetchInterval: 30_000,
  })

  const globalIndices = indiaData?.indices || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          India Indices
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {globalIndices.map((index) => (
            <div
              key={index.symbol}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {index.region}
                </div>
                <div>
                  <div className="font-semibold text-sm">{index.name}</div>
                  <div className="text-xs text-muted-foreground">{index.symbol}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold">{index.value.toLocaleString()}</div>
                <div className={`text-xs flex items-center gap-1 ${
                  index.change >= 0 ? "text-bullish" : "text-bearish"
                }`}>
                  {index.change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{index.change >= 0 ? "+" : ""}{index.change}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <DataSourceBadge source={indiaData?.source} asOf={indiaData?.as_of} className="mt-3" />
      </CardContent>
    </Card>
  )
}
