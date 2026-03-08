"use client"

import { useQuery } from "@tanstack/react-query"
import { AICopilot } from "@/components/dashboard/ai-copilot"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Sparkles, TrendingUp, Target } from "lucide-react"
import { InsightsAPI, StocksAPI } from "@/lib/api"

export default function CopilotPage() {
  const { data: brief } = useQuery({
    queryKey: ["insights", "brief", "copilot-page"],
    queryFn: InsightsAPI.brief,
    refetchInterval: 60_000,
  })
  const { data: signals = [] } = useQuery({
    queryKey: ["stocks", "signals", "copilot-page"],
    queryFn: StocksAPI.signals,
    refetchInterval: 30_000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Copilot</h1>
        <p className="text-muted-foreground">Your intelligent assistant for market analysis and research</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Market Outlook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{brief?.outlook || "..."}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-bullish">{brief?.highlights?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Signal Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{signals.length}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              As Of
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{brief?.as_of ? new Date(brief.as_of).toLocaleTimeString() : "-"}</div>
          </CardContent>
        </Card>
      </div>

      <AICopilot />

      <Card>
        <CardHeader>
          <CardTitle>Market Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{brief?.summary}</p>
          <div className="space-y-2">
            {(brief?.highlights || []).map((item) => (
              <div key={item} className="p-3 rounded-lg border border-border/50 text-sm">
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

