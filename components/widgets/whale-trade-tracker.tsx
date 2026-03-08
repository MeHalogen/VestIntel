"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Fish, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react"

type WhaleTrade = {
  id: string
  time: string
  symbol: string
  side: "CALL" | "PUT" | "BUY" | "SELL"
  premiumM: number
  strike?: number
  expiry?: string
  confidence: "HIGH" | "MED" | "LOW"
}

const mockTrades: WhaleTrade[] = [
  {
    id: "wt_1",
    time: "10:42",
    symbol: "AAPL",
    side: "CALL",
    premiumM: 12.4,
    strike: 190,
    expiry: "2026-06-19",
    confidence: "HIGH",
  },
  {
    id: "wt_2",
    time: "11:07",
    symbol: "NVDA",
    side: "BUY",
    premiumM: 8.1,
    confidence: "MED",
  },
  {
    id: "wt_3",
    time: "11:31",
    symbol: "TSLA",
    side: "PUT",
    premiumM: 6.7,
    strike: 160,
    expiry: "2026-04-17",
    confidence: "MED",
  },
  {
    id: "wt_4",
    time: "12:04",
    symbol: "SPY",
    side: "SELL",
    premiumM: 15.9,
    confidence: "HIGH",
  },
]

function sideBadge(side: WhaleTrade["side"]) {
  const isBull = side === "CALL" || side === "BUY"
  return (
    <Badge
      className={cn(
        "border",
        isBull
          ? "bg-bullish/10 text-bullish border-bullish/30"
          : "bg-bearish/10 text-bearish border-bearish/30"
      )}
    >
      {isBull ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
      {side}
    </Badge>
  )
}

export function WhaleTradeTracker() {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fish className="w-5 h-5 text-primary" />
          Whale Trade Tracker
          <Badge className="ml-auto bg-primary/10 text-primary border border-primary/20">
            <Activity className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Unusual options + block prints. Cache-first. Provider failover. (Mock data in dev.)
        </div>

        <div className="space-y-3">
          {mockTrades.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.symbol}</span>
                  {sideBadge(t.side)}
                </div>
                <div className="text-xs text-muted-foreground">{t.time}</div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Premium</div>
                  <div className="font-semibold">${t.premiumM.toFixed(1)}M</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Contract</div>
                  <div className="font-semibold">
                    {t.strike ? `$${t.strike}` : "--"} {t.expiry ? `@ ${t.expiry}` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  <div className="font-semibold">{t.confidence}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
