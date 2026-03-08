"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { NewsIntelligence } from "@/components/dashboard/news-intelligence"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Newspaper, TrendingUp, TrendingDown, Activity } from "lucide-react"
import { StocksAPI } from "@/lib/api"

export default function NewsPage() {
  const { data = [] } = useQuery({
    queryKey: ["stocks", "news", "page"],
    queryFn: StocksAPI.news,
    refetchInterval: 60_000,
  })

  const stats = useMemo(() => {
    const total = data.length
    const positive = data.filter((n) => (n.sentiment_score || 50) >= 60).length
    const negative = data.filter((n) => (n.sentiment_score || 50) < 40).length
    const avg = total ? data.reduce((acc, n) => acc + (n.sentiment_score || 50), 0) / total : 50
    return { total, positive, negative, avg }
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">News Intelligence</h1>
          <p className="text-muted-foreground">AI-powered news analysis with sentiment scoring</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Positive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-bullish">{stats.positive}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Negative
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-bearish">{stats.negative}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{Math.round(stats.avg)}</div>
          </CardContent>
        </Card>
      </div>

      <NewsIntelligence />
    </div>
  )
}

