"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, TrendingUp, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const smartMoneyTrades = [
  {
    institution: "BlackRock",
    action: "BOUGHT",
    symbol: "NVDA",
    amount: "$2.4B",
    shares: "28.5M",
    time: "2 hours ago",
    type: "Block Trade"
  },
  {
    institution: "Vanguard",
    action: "BOUGHT",
    symbol: "AAPL",
    amount: "$1.8B",
    shares: "10.2M",
    time: "4 hours ago",
    type: "Dark Pool"
  },
  {
    institution: "Fidelity",
    action: "SOLD",
    symbol: "TSLA",
    amount: "$890M",
    shares: "4.1M",
    time: "5 hours ago",
    type: "Block Trade"
  },
  {
    institution: "State Street",
    action: "BOUGHT",
    symbol: "MSFT",
    amount: "$1.2B",
    shares: "3.2M",
    time: "6 hours ago",
    type: "Dark Pool"
  },
  {
    institution: "Goldman Sachs",
    action: "BOUGHT",
    symbol: "AMD",
    amount: "$650M",
    shares: "3.8M",
    time: "1 day ago",
    type: "Institutional"
  },
]

export function SmartMoneyTracker() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Smart Money Tracker
          <Badge variant="secondary" className="ml-2">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {smartMoneyTrades.map((trade, i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{trade.institution}</div>
                    <div className="text-xs text-muted-foreground">{trade.time}</div>
                  </div>
                </div>
                <Badge variant={trade.type === "Dark Pool" ? "default" : "outline"}>
                  {trade.type}
                </Badge>
              </div>

              <div className="flex items-center gap-3 pl-13">
                <div className={`px-2 py-1 rounded font-semibold text-sm ${
                  trade.action === "BOUGHT" 
                    ? "bg-bullish/10 text-bullish" 
                    : "bg-bearish/10 text-bearish"
                }`}>
                  {trade.action}
                </div>
                
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                
                <div className="font-semibold text-primary">{trade.symbol}</div>
                
                <div className="flex gap-4 ml-auto text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount: </span>
                    <span className="font-semibold">{trade.amount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shares: </span>
                    <span className="font-semibold">{trade.shares}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-accent/30 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-bullish" />
            <span className="font-semibold">Most Bought This Week</span>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">NVDA +$8.2B</Badge>
            <Badge variant="secondary">AAPL +$5.1B</Badge>
            <Badge variant="secondary">MSFT +$4.7B</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
