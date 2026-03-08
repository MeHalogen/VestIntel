"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { AlertsAPI, StocksAPI } from "@/lib/api"

export function RecentActivity() {
  const { data: triggered = [] } = useQuery({
    queryKey: ["alerts", "triggered", "recent"],
    queryFn: AlertsAPI.triggered,
    refetchInterval: 30_000,
  })
  const { data: signals = [] } = useQuery({
    queryKey: ["signals", "recent"],
    queryFn: StocksAPI.signals,
    refetchInterval: 30_000,
  })

  const activities = useMemo(() => {
    const a = triggered.slice(0, 3).map((t) => ({
      type: "alert",
      message: t.message,
      time: new Date(t.triggered_at).toLocaleTimeString(),
      icon: "🎯",
    }))
    const s = signals.slice(0, 3).map((t) => ({
      type: "signal",
      message: t.message,
      time: new Date((t.timestamp || 0) * 1000).toLocaleTimeString(),
      icon: "⚡",
    }))
    return [...a, ...s].slice(0, 6)
  }, [triggered, signals])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, i) => (
            <div key={i} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0">
              <span className="text-2xl">{activity.icon}</span>
              <div className="flex-1">
                <p className="text-sm">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
