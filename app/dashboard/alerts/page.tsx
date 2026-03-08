"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, Plus, TrendingUp, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AlertsAPI } from "@/lib/api"

export default function AlertsPage() {
  const qc = useQueryClient()
  const [symbol, setSymbol] = useState("RELIANCE")
  const [value, setValue] = useState("170")

  const alertsQuery = useQuery({
    queryKey: ["alerts", "list"],
    queryFn: AlertsAPI.list,
    refetchInterval: 30_000,
  })
  const triggeredQuery = useQuery({
    queryKey: ["alerts", "triggered"],
    queryFn: AlertsAPI.triggered,
    refetchInterval: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      AlertsAPI.create({
        symbol: symbol.toUpperCase(),
        alert_type: "price",
        condition: "below",
        value: Number(value || 0),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] })
      setValue("")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => AlertsAPI.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  })

  const alerts = alertsQuery.data || []
  const triggered = triggeredQuery.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Alert Management</h1>
          <p className="text-muted-foreground">Set and monitor your price alerts.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{alerts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">User scoped</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Triggered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-bearish">{triggered.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Live-evaluated</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Symbols Covered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-bullish">{new Set(alerts.map((a) => a.symbol)).size}</div>
            <p className="text-xs text-muted-foreground mt-1">Distinct tickers</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Create Alert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol" />
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Price" />
            <Button className="w-full gap-2" onClick={() => createMutation.mutate()}>
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-chart-tertiary" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-primary">{alert.symbol}</span>
                      <Badge variant="outline" className="text-xs">
                        {alert.alert_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.condition} {alert.value}
                    </p>
                  </div>
                </div>

                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(alert.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
