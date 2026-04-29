"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PulseAPI, MarketPulse, PulseSector } from "@/lib/api"
import { DataSourceBadge } from "@/components/ui/data-source-badge"

// ── helpers ────────────────────────────────────────────────────────────────

function dirColor(dir: string) {
  if (dir === "bullish") return "text-green-500"
  if (dir === "bearish") return "text-red-500"
  return "text-muted-foreground"
}

function dirBg(dir: string) {
  if (dir === "bullish") return "bg-green-500/10 border-green-500/20"
  if (dir === "bearish") return "bg-red-500/10 border-red-500/20"
  return "bg-muted/40 border-border"
}

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`
}

// ── sub-components ─────────────────────────────────────────────────────────

function IndexCard({ name, value, change_percent, direction }: {
  name: string; value: number; change_percent: number; direction: string
}) {
  return (
    <div className={`rounded-lg border p-4 ${dirBg(direction)}`}>
      <div className="text-xs text-muted-foreground mb-1">{name}</div>
      <div className="text-2xl font-bold">{value.toLocaleString("en-IN")}</div>
      <div className={`text-sm font-semibold mt-1 ${dirColor(direction)}`}>{pct(change_percent)}</div>
    </div>
  )
}

function StockMoverCard({ label, stock, direction }: {
  label: string
  stock: NonNullable<MarketPulse["top_gainer"]>
  direction: "bullish" | "bearish"
}) {
  return (
    <div className={`rounded-lg border p-4 ${dirBg(direction)}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold">{stock.symbol}</div>
          <div className="text-xs text-muted-foreground">{stock.sector}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">₹{stock.price.toLocaleString("en-IN")}</div>
          <div className={`text-sm font-semibold ${dirColor(direction)}`}>{pct(stock.change_percent)}</div>
        </div>
      </div>
    </div>
  )
}

function BreadthBar({ advancing, declining, total }: { advancing: number; declining: number; total: number }) {
  const advPct = total > 0 ? (advancing / total) * 100 : 50
  const decPct = total > 0 ? (declining / total) * 100 : 50
  return (
    <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
      <div className="bg-green-500 h-full transition-all" style={{ width: `${advPct}%` }} />
      <div className="bg-red-500 h-full transition-all" style={{ width: `${decPct}%` }} />
    </div>
  )
}

function SectorRow({ s }: { s: PulseSector }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{s.sector}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{s.count} stocks</span>
        <span className={`text-sm font-semibold ${s.direction === "up" ? "text-green-500" : s.direction === "down" ? "text-red-500" : "text-muted-foreground"}`}>
          {pct(s.performance)}
        </span>
      </div>
    </div>
  )
}

function MarketNarrative({ narrative, direction }: { narrative: string; direction: string }) {
  const sentences = narrative.split(/(?<=[.!?])\s+/)
  return (
    <div className={`rounded-lg border p-4 ${dirBg(direction)}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Market Narrative</div>
      {sentences.map((s, i) => (
        <p key={i} className={i === 0 ? "font-medium text-foreground mb-1" : "text-sm text-muted-foreground mb-1"}>{s}</p>
      ))}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────

export function DailyMarketPulse() {
  const { data: pulse, isLoading, error } = useQuery<MarketPulse>({
    queryKey: ["market-pulse"],
    queryFn: PulseAPI.get,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (error || !pulse) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Market pulse data unavailable. Ensure the NSE worker is running.
        </CardContent>
      </Card>
    )
  }

  const dir = pulse.market_direction
  const updatedTime = pulse.as_of ? new Date(pulse.as_of).toLocaleTimeString() : "—"

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className={`border ${dirBg(dir)}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={dir === "bullish" ? "bg-green-500" : dir === "bearish" ? "bg-red-500" : "bg-muted"}>
                {dir.charAt(0).toUpperCase() + dir.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground capitalize">{pulse.market_intensity}</span>
            </div>
            <span className="text-xs text-muted-foreground">Updated {updatedTime}</span>
          </div>
          <span className="text-sm text-muted-foreground">{pulse.summary}</span>
        </CardHeader>
      </Card>

      <DataSourceBadge source={pulse.source} asOf={pulse.as_of ?? undefined} />

      {/* Narrative */}
      {pulse.narrative && (
        <MarketNarrative narrative={pulse.narrative} direction={dir} />
      )}

      {/* Indices */}
      <div className="grid grid-cols-2 gap-4">
        <IndexCard {...pulse.indices.nifty} />
        <IndexCard {...pulse.indices.banknifty} />
      </div>

      {/* Top movers */}
      <div className="grid grid-cols-2 gap-4">
        {pulse.top_gainer && (
          <StockMoverCard label="🏆 Top Gainer" stock={pulse.top_gainer} direction="bullish" />
        )}
        {pulse.top_loser && (
          <StockMoverCard label="📉 Top Loser" stock={pulse.top_loser} direction="bearish" />
        )}
      </div>

      {/* Breadth */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Market Breadth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <BreadthBar
            advancing={pulse.breadth.advancing}
            declining={pulse.breadth.declining}
            total={pulse.breadth.total}
          />
          <div className="grid grid-cols-3 text-center text-sm">
            <div>
              <div className="text-lg font-bold text-green-500">{pulse.breadth.advancing}</div>
              <div className="text-xs text-muted-foreground">Advancing</div>
            </div>
            <div>
              <div className="text-lg font-bold text-muted-foreground">{pulse.breadth.unchanged}</div>
              <div className="text-xs text-muted-foreground">Unchanged</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-500">{pulse.breadth.declining}</div>
              <div className="text-xs text-muted-foreground">Declining</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            A/D ratio: <span className="font-semibold text-foreground">{pulse.breadth.advance_decline_ratio}</span>
          </p>
        </CardContent>
      </Card>

      {/* Sectors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Sector Performance
            <span className="text-xs font-normal text-muted-foreground ml-2">— {pulse.sector_trend}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {pulse.sectors.map((s) => (
            <SectorRow key={s.sector} s={s} />
          ))}
        </CardContent>
      </Card>

      {/* Notable movers */}
      {pulse.notable_movers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notable Movers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pulse.notable_movers.map((m) => (
              <div key={m.symbol} className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{m.symbol}</span>
                  <span className="text-xs text-muted-foreground ml-2">{m.sector}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-3">₹{m.price.toLocaleString("en-IN")}</span>
                  <span className={`text-sm font-semibold ${m.change_percent >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {pct(m.change_percent)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
