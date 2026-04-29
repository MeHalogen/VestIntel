"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { TrendingUp, TrendingDown, BarChart2, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { OpportunityAPI, OpportunityReport, Opportunity, OpportunityType } from "@/lib/api"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

// ── meta maps ──────────────────────────────────────────────────────────────

const TYPE_META: Record<OpportunityType, { icon: React.ElementType; color: string; label: string }> = {
  momentum:         { icon: TrendingUp,   color: "bg-green-500/10 text-green-600 border-green-500/20",  label: "Momentum"         },
  dip:              { icon: TrendingDown, color: "bg-blue-500/10 text-blue-600 border-blue-500/20",     label: "Dip Buy"          },
  volume_breakout:  { icon: BarChart2,    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", label: "Volume Breakout" },
  consolidation:    { icon: Activity,     color: "bg-purple-500/10 text-purple-600 border-purple-500/20", label: "Consolidation"   },
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   "bg-green-500",
  medium: "bg-yellow-500",
  low:    "bg-muted",
}

// ── sub-components ─────────────────────────────────────────────────────────

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const meta = TYPE_META[opp.type]
  const Icon = meta.icon
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-base">{opp.symbol}</div>
          <div className="text-xs text-muted-foreground">{opp.sector}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className={`text-xs gap-1 ${meta.color}`}>
            <Icon size={11} />
            {meta.label}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${CONFIDENCE_COLOR[opp.confidence]}`} />
            {opp.confidence} confidence
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">₹{opp.price.toLocaleString("en-IN")}</span>
        <span className={opp.change_percent >= 0 ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>
          {opp.change_percent >= 0 ? "+" : ""}{opp.change_percent.toFixed(2)}%
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{opp.reason}</p>
    </Card>
  )
}

function SummaryPill({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
        ${active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}
    >
      {label} <span className="ml-1 opacity-70">{count}</span>
    </button>
  )
}

// ── main component ─────────────────────────────────────────────────────────

export function OpportunityFinder() {
  const [activeFilter, setActiveFilter] = useState<OpportunityType | "all">("all")

  const { data: report, isLoading, error } = useQuery<OpportunityReport>({
    queryKey: ["opportunities"],
    queryFn: (): Promise<OpportunityReport> => OpportunityAPI.get(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (error || !report) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Opportunity data unavailable. Ensure the NSE worker is running.
        </CardContent>
      </Card>
    )
  }

  const filterCounts: Record<OpportunityType | "all", number> = {
    all:              report.opportunities.length,
    momentum:         report.opportunities.filter((o) => o.type === "momentum").length,
    dip:              report.opportunities.filter((o) => o.type === "dip").length,
    volume_breakout:  report.opportunities.filter((o) => o.type === "volume_breakout").length,
    consolidation:    report.opportunities.filter((o) => o.type === "consolidation").length,
  }

  const filtered = activeFilter === "all"
    ? report.opportunities
    : report.opportunities.filter((o) => o.type === activeFilter)

  const highConfidence = report.opportunities.filter((o) => o.confidence === "high")

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <SummaryPill label="All" count={filterCounts.all} active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
        <SummaryPill label="Momentum" count={filterCounts.momentum} active={activeFilter === "momentum"} onClick={() => setActiveFilter("momentum")} />
        <SummaryPill label="Dip Buy" count={filterCounts.dip} active={activeFilter === "dip"} onClick={() => setActiveFilter("dip")} />
        <SummaryPill label="Volume Breakout" count={filterCounts.volume_breakout} active={activeFilter === "volume_breakout"} onClick={() => setActiveFilter("volume_breakout")} />
        <SummaryPill label="Consolidation" count={filterCounts.consolidation} active={activeFilter === "consolidation"} onClick={() => setActiveFilter("consolidation")} />
      </div>

      <DataSourceBadge source={report.source} asOf={report.as_of ?? undefined} />

      {report.note && (
        <p className="text-xs text-muted-foreground italic">{report.note}</p>
      )}

      {/* Opportunity grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No {activeFilter === "all" ? "" : activeFilter + " "}opportunities found right now.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((opp) => (
            <OpportunityCard key={opp.symbol} opp={opp} />
          ))}
        </div>
      )}

      {/* High confidence callout */}
      {highConfidence.length > 0 && activeFilter === "all" && (
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              ⭐ High Confidence Picks ({highConfidence.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {highConfidence.map((opp) => (
              <Badge key={opp.symbol} variant="outline" className="border-green-500/30 text-green-700">
                {opp.symbol}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
