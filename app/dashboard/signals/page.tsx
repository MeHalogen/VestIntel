"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { SignalsEngine } from "@/components/dashboard/signals-engine"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, TrendingUp, AlertTriangle, Activity } from "lucide-react"
import { StocksAPI } from "@/lib/api"

export default function SignalsPage() {
  const { data = [] } = useQuery({
    queryKey: ["stocks", "signals", "page"],
    queryFn: StocksAPI.signals,
    refetchInterval: 30_000,
  })

  const stats = useMemo(() => {
    const total = data.length
    const bullish = data.filter((s) => s.type.includes("up")).length
    const high = data.filter((s) => s.severity === "high").length
    return { total, bullish, high }
  }, [data])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Market Signals</h1>
        <p className="text-muted-foreground">Real-time trading signals from price and momentum behavior</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Active Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Bullish
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-bullish">{stats.bullish}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-bearish">{stats.high}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{new Set(data.map((s) => s.symbol)).size}</div>
          </CardContent>
        </Card>
      </div>

      <SignalsEngine />
    </div>
  )
}

