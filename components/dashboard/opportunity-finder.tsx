"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Zap, BarChart2, Layers, RefreshCw } from "lucide-react"
import { OpportunityAPI, Opportunity, OpportunityType } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  OpportunityType,
  { label: string; icon: React.ReactNode; color: string; badge: string }
> = {
  momentum: {
    label: "Momentum",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "text-bullish",
    badge: "bg-bullish/10 text-bullish border-bullish/30",
  },
  dip: {
    label: "Dip",
    icon: <TrendingDown className="w-4 h-4" />,
    color: "text-bearish",
    badge: "bg-bearish/10 text-bearish border-bearish/30",
  },
  volume_breakout: {
    label: "Volume",
    icon: <BarChart2 className="w-4 h-4" />,
    color: "text-primary",
    badge: "bg-primary/10 text-primary border-primary/30",
  },
  consolidation: {
    label: "Consolidation",
    icon: <Layers className="w-4 h-4" />,
    color: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
  },
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: "bg-bullish",
  medium: "bg-yellow-400",
  low: "bg-muted-foreground",
}

const ALL_TYPES: OpportunityType[] = ["momentum", "dip", "volume_breakout", "consolidation"]

// ─── Opportunity Card ─────────────────────────────────────────────────────────
function OpportunityCard({ opp }: { opp: Opportunity }) {
  const cfg = TYPE_CONFIG[opp.type]
  return (
    <div className="flex items-start justify-between p-4 rounded-lg border border-border/50 hover:bg-accent/40 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* confidence indicator */}
        <div className="mt-1.5 shrink-0">
          <div className={`w-2 h-2 rounded-full ${CONFIDENCE_DOT[opp.confidence]}`} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">{opp.symbol}</span>
            <Badge variant="outline" className={`text-xs ${cfg.badge}`}>
              <span className="mr-1">{cfg.icon}</span>
              {cfg.label}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {opp.sector}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-snug">{opp.reason}</p>
        </div>
      </div>

      <div className="text-right ml-4 shrink-0">
        <div className="font-semibold">{formatCurrency(opp.price)}</div>
        <div className={`text-sm font-bold ${opp.change_percent >= 0 ? "text-bullish" : "text-bearish"}`}>
          {opp.change_percent >= 0 ? "+" : ""}{opp.change_percent.toFixed(2)}%
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function OpportunityFinder() {
  const [activeTypes, setActiveTypes] = useState<OpportunityType[]>([])

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["opportunities", activeTypes],
    queryFn: () => OpportunityAPI.get(activeTypes.length ? activeTypes : undefined),
    refetchInterval: 60_000,
  })

  const toggleType = (t: OpportunityType) =>
    setActiveTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )

  const opps = data?.opportunities ?? []
  const summary = data?.summary
  const updatedTime = data?.as_of ? new Date(data.as_of).toLocaleTimeString() : ""

  return (
    <div className="space-y-5">
      {/* Summary stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ALL_TYPES.map((t) => {
          const cfg = TYPE_CONFIG[t]
          const count = summary?.[t] ?? 0
          const active = activeTypes.includes(t)
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`p-4 rounded-lg border transition-all text-left ${
                active ? `border-current ${cfg.badge}` : "border-border/50 hover:bg-accent/40"
              }`}
            >
              <div className={`flex items-center gap-2 mb-1 ${cfg.color}`}>
                {cfg.icon}
                <span className="text-sm font-semibold">{cfg.label}</span>
              </div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-muted-foreground">signals</div>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            {opps.length} opportunit{opps.length === 1 ? "y" : "ies"}
            {activeTypes.length > 0 && (
              <span className="text-muted-foreground font-normal">
                {" "}(filtered: {activeTypes.map((t) => TYPE_CONFIG[t].label).join(", ")})
              </span>
            )}
          </span>
          {activeTypes.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setActiveTypes([])}>
              Clear
            </Button>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          {updatedTime}
        </button>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-4 space-y-2">
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground text-sm animate-pulse">
              Scanning NIFTY 50 for opportunities…
            </div>
          ) : opps.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              {data?.note || "No signals match the selected filters right now."}
            </div>
          ) : (
            opps.map((opp, i) => <OpportunityCard key={`${opp.symbol}-${opp.type}-${i}`} opp={opp} />)
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-semibold">Confidence:</span>
          {[["high", "bg-bullish"], ["medium", "bg-yellow-400"], ["low", "bg-muted-foreground"]].map(
            ([label, bg]) => (
              <span key={label} className="flex items-center gap-1.5 capitalize">
                <span className={`w-2 h-2 rounded-full ${bg}`} />
                {label}
              </span>
            )
          )}
          <span className="ml-4">Click a signal type above to filter.</span>
        </div>
        <DataSourceBadge source={data?.source} asOf={data?.as_of} />
      </div>
    </div>
  )
}
