"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Newspaper, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { StocksAPI } from "@/lib/api"

export function NewsIntelligence() {
  const { data = [] } = useQuery({
    queryKey: ["stocks", "news", "intelligence"],
    queryFn: StocksAPI.news,
    refetchInterval: 60_000,
  })
  const news = data.map((n) => ({
    headline: n.title,
    source: n.source,
    sentiment: "neutral",
    score: n.sentiment_score ?? 50,
    time: new Date(n.published_at).toLocaleTimeString(),
    tickers: n.tickers || [],
    summary: n.summary || n.title,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          News Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {news.map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold mb-1 leading-tight">{item.headline}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{item.summary}</p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.tickers.map((ticker) => (
                      <Badge key={ticker} variant="secondary" className="text-xs">
                        {ticker}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="ml-4 flex flex-col items-end gap-2">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                    item.sentiment === "positive"
                      ? "bg-bullish/10 text-bullish"
                      : item.sentiment === "negative"
                      ? "bg-bearish/10 text-bearish"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {item.sentiment === "positive" && <TrendingUp className="w-3 h-3" />}
                    {item.sentiment === "negative" && <TrendingDown className="w-3 h-3" />}
                    {item.sentiment === "neutral" && <Minus className="w-3 h-3" />}
                    <span>{item.score}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs text-muted-foreground">
                <span>{item.source}</span>
                <span>{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
