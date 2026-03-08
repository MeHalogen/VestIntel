"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Brain, Send, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { InsightsAPI } from "@/lib/api"

const suggestions = [
  "Why is RELIANCE moving today?",
  "Show me strong NSE momentum stocks",
  "Which NSE stocks have unusual volume?",
  "Compare TCS vs INFY performance"
]

export function AICopilot() {
  const [query, setQuery] = useState("")
  const askMutation = useMutation({
    mutationFn: (q: string) => InsightsAPI.ask(q),
  })

  const handleAsk = () => {
    const q = query.trim()
    if (!q) return
    askMutation.mutate(q)
  }

  return (
    <Card className="panel-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          AI Copilot
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="w-3 h-3 mr-1" />
            Pro
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything about the markets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <Button onClick={handleAsk} disabled={askMutation.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Badge
              key={suggestion}
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => setQuery(suggestion)}
            >
              {suggestion}
            </Badge>
          ))}
        </div>

        {/* Response */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          {askMutation.isError && (
            <div className="text-sm text-bearish">
              {(askMutation.error as Error)?.message || "Failed to fetch copilot response"}
            </div>
          )}
          {askMutation.data && (
            <>
          <div>
            <div className="text-sm font-semibold text-primary mb-2">
              {askMutation.data.query}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {askMutation.data.answer}
            </p>
          </div>

          {/* Data Points */}
          <div className="grid grid-cols-4 gap-3">
            {askMutation.data.data_points.map((point) => (
              <div key={point.label} className="p-3 rounded-lg bg-accent/30">
                <div className="text-xs text-muted-foreground mb-1">{point.label}</div>
                <div className="font-semibold">{point.value}</div>
              </div>
            ))}
          </div>

          {/* Related Stocks */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Related Stocks</div>
            <div className="flex gap-2">
              {askMutation.data.related_stocks.map((ticker) => (
                <Badge key={ticker} variant="secondary">
                  {ticker}
                </Badge>
              ))}
            </div>
          </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
