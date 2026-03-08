"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, AlertTriangle, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { StocksAPI } from "@/lib/api"

export function SignalsEngine() {
  const { data = [] } = useQuery({
    queryKey: ["stocks", "signals", "engine"],
    queryFn: StocksAPI.signals,
    refetchInterval: 30_000,
  })
  const signals = data.map((s) => ({
    type: s.type,
    symbol: s.symbol,
    message: s.message,
    severity: s.severity,
    time: new Date((s.timestamp || 0) * 1000).toLocaleTimeString(),
    data: { source: s.source || "derived" },
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Market Signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {signals.map((signal, i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    signal.severity === "high" ? "bg-bearish animate-pulse" : "bg-chart-tertiary"
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">{signal.symbol}</span>
                      <Badge variant="outline" className="text-xs">
                        {signal.type.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm mt-1">{signal.message}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {Object.entries(signal.data).map(([key, value]) => (
                    <div key={key}>
                      <span className="opacity-70">{key}: </span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{signal.time}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
