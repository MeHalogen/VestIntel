"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Activity, BarChart2, RefreshCw, BookOpen } from "lucide-react"
import { PulseAPI, MarketPulse, PulseSector } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

// ─── Colour helpers ───────────────────────────────────────────────────────────
const DIR_TEXT: Record<string, string> = {
  bullish: "text-bullish",
  neutral: "text-muted-foreground",
  bearish: "text-bearish",
}

const DIR_BADGE: Record<string, string> = {
  bullish: "bg-bullish/10 text-bullish border-bullish/30",
  neutral: "bg-muted text-muted-foreground border-border",
  bearish: "bg-bearish/10 text-bearish border-bearish/30",
}

const DIR_BG: Record<string, string> = {
  bullish: "from-bullish/10 to-bullish/5 border-bullish/20",
  neutral: "from-muted/20 to-muted/10 border-border",
  bearish: "from-bearish/10 to-bearish/5 border-bearish/20",
}

function DirIcon({ direction, className }: { direction: string; className?: string }) {
  if (direction === "bullish") return <TrendingUp className={className} />
  if (direction === "bearish") return <TrendingDown className={className} />
  return <Minus className={className} />
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IndexCard({
  name,
  value,
  change_percent,
  direction,
}: {
  name: string
  value: number
  change_percent: number
  direction: string
}) {
  return (
    <Card className={`bg-gradient-to-br ${DIR_BG[direction]} hover-lift`}>
      <CardContent className="p-5">
        <div className="text-xs text-muted-foreground mb-1">{name}</div>
        <div className="text-2xl font-bold">{value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
        <div className={`flex items-center gap-1 mt-1 text-sm font-semibold ${DIR_TEXT[direction]}`}>
          <DirIcon direction={direction} className="w-4 h-4" />
          {change_percent >= 0 ? "+" : ""}{change_percent.toFixed(2)}%
        </div>
      </CardContent>
    </Card>
  )
}

function StockMoverCard({
  label,
  stock,
  direction,
}: {
  label: string
  stock: NonNullable<MarketPulse["top_gainer"]>
  direction: string
}) {
  return (
    <Card className={`bg-gradient-to-br ${DIR_BG[direction]}`}>
      <CardContent className="p-5">
        <div className="text-xs text-muted-foreground mb-2">{label}</div>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-lg">{stock.symbol}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[120px]">{stock.name}</div>
            <Badge variant="outline" className="mt-2 text-xs">{stock.sector}</Badge>
          </div>
          <div className="text-right">
            <div className="font-bold">{formatCurrency(stock.price)}</div>
            <div className={`text-sm font-semibold mt-1 ${DIR_TEXT[direction]}`}>
              {stock.change_percent >= 0 ? "+" : ""}{stock.change_percent.toFixed(2)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BreadthBar({ advancing, declining, total }: { advancing: number; declining: number; total: number }) {
  const advPct = total ? (advancing / total) * 100 : 50
  const decPct = total ? (declining / total) * 100 : 50
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span className="text-bullish font-semibold">▲ {advancing} Advancing</span>
        <span className="text-bearish font-semibold">{declining} Declining ▼</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden flex bg-muted">
        <div className="bg-bullish transition-all duration-700" style={{ width: `${advPct}%` }} />
        <div className="bg-bearish transition-all duration-700" style={{ width: `${decPct}%` }} />
      </div>
    </div>
  )
}

function SectorBar({ sector }: { sector: PulseSector }) {
  const absMax = 3 // clamp bar width to ±3%
  const barPct = Math.min(Math.abs(sector.performance) / absMax, 1) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-muted-foreground truncate shrink-0">{sector.sector}</div>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            sector.direction === "bullish" ? "bg-bullish" : sector.direction === "bearish" ? "bg-bearish" : "bg-muted-foreground"
          }`}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <div className={`w-14 text-right text-xs font-semibold ${DIR_TEXT[sector.direction]}`}>
        {sector.performance >= 0 ? "+" : ""}{sector.performance.toFixed(2)}%
      </div>
    </div>
  )
}

// ─── Market Narrative ─────────────────────────────────────────────────────────

const NARRATIVE_BORDER: Record<string, string> = {
  bullish: "border-bullish/25 bg-bullish/5",
  bearish: "border-bearish/25 bg-bearish/5",
  neutral: "border-border bg-muted/30",
}

const NARRATIVE_ICON: Record<string, string> = {
  bullish: "text-bullish",
  bearish: "text-bearish",
  neutral: "text-muted-foreground",
}

function MarketNarrative({
  narrative,
  direction,
}: {
  narrative: string
  direction: string
}) {
  // Split into individual sentences for staggered display
  const sentences = narrative.match(/[^.!?]+[.!?]+/g) ?? [narrative]

  return (
    <Card className={`border ${NARRATIVE_BORDER[direction] ?? NARRATIVE_BORDER.neutral}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className={`w-4 h-4 ${NARRATIVE_ICON[direction]}`} />
          Market Narrative
          <span className="text-[11px] font-normal text-muted-foreground/60 ml-1">
            — rule-based analysis
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        {sentences.map((sentence, i) => (
          <p
            key={i}
            className={`text-sm leading-relaxed ${
              i === 0
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {sentence.trim()}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DailyMarketPulse() {
  const { data: pulse, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["pulse", "daily"],
    queryFn: PulseAPI.get,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
          <Activity className="w-5 h-5 animate-pulse" />
          Loading market pulse…
        </CardContent>
      </Card>
    )
  }

  if (!pulse) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground text-sm">
          Market data not yet available. NSE worker may be warming up.
        </CardContent>
      </Card>
    )
  }

  const dir = pulse.market_direction
  const updatedTime = pulse.as_of ? new Date(pulse.as_of).toLocaleTimeString() : "—"

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={`text-sm font-bold px-4 py-1.5 border ${DIR_BADGE[dir]}`} variant="outline">
            <DirIcon direction={dir} className="w-4 h-4 mr-2" />
            {dir.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">{pulse.summary}</span>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          {updatedTime}
        </button>
      </div>
      <DataSourceBadge source={pulse.source} asOf={pulse.as_of} />

      {/* Market Narrative */}
      {pulse.narrative && (
        <MarketNarrative narrative={pulse.narrative} direction={dir} />
      )}

      {/* Indices */}
      <div className="grid grid-cols-2 gap-4">
        <IndexCard {...pulse.indices.nifty} />
        <IndexCard {...pulse.indices.banknifty} />
      </div>

      {/* Top mover + breadth */}
      <div className="grid grid-cols-3 gap-4">
        {pulse.top_gainer && (
          <StockMoverCard label="🏆 Top Gainer" stock={pulse.top_gainer} direction="bullish" />
        )}
        {pulse.top_loser && (
          <StockMoverCard label="📉 Top Loser" stock={pulse.top_loser} direction="bearish" />
        )}

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="text-xs text-muted-foreground mb-2">Market Breadth</div>
            <BreadthBar
              advancing={pulse.breadth.advancing}
              declining={pulse.breadth.declining}
              total={pulse.breadth.total}
            />
            <div className="grid grid-cols-3 gap-1 text-center pt-1">
              <div>
                <div className="text-lg font-bold text-bullish">{pulse.breadth.advancing}</div>
                <div className="text-xs text-muted-foreground">Up</div>
              </div>
              <div>
                <div className="text-lg font-bold text-muted-foreground">{pulse.breadth.unchanged}</div>
                <div className="text-xs text-muted-foreground">Flat</div>
              </div>
              <div>
                <div className="text-lg font-bold text-bearish">{pulse.breadth.declining}</div>
                <div className="text-xs text-muted-foreground">Down</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-center pt-1">
              A/D ratio: <span className="font-semibold text-foreground">{pulse.breadth.advance_decline_ratio}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sector bars */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Sector Trend
            <span className="text-xs font-normal text-muted-foreground ml-2">— {pulse.sector_trend}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {pulse.sectors.map((s) => (
            <SectorBar key={s.sector} sector={s} />
          ))}
        </CardContent>
      </Card>

      {/* Notable movers strip */}
      {pulse.notable_movers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Notable Movers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {pulse.notable_movers.map((m) => (
                <div
                  key={m.symbol}
                  className={`p-3 rounded-lg text-center ${
                    m.change_percent >= 0 ? "bg-bullish/10 border border-bullish/20" : "bg-bearish/10 border border-bearish/20"
                  }`}
                >
                  <div className="font-bold text-sm">{m.symbol}</div>
                  <div className={`text-xs font-semibold mt-0.5 ${m.change_percent >= 0 ? "text-bullish" : "text-bearish"}`}>
                    {m.change_percent >= 0 ? "+" : ""}{m.change_percent.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
