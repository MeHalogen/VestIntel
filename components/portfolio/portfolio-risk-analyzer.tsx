"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, Plus, Trash2, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { RiskAPI, RiskHolding, RiskReport, RiskFactor } from "@/lib/api"

const RISK_COLOR: Record<string, string> = {
  low: "text-bullish",
  medium: "text-yellow-400",
  high: "text-bearish",
}

const RISK_BADGE: Record<string, string> = {
  low: "bg-bullish/10 text-bullish border-bullish/30",
  medium: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
  high: "bg-bearish/10 text-bearish border-bearish/30",
}

function ScoreRing({ score, level }: { score: number; level: string }) {
  const radius = 40
  const circ = 2 * Math.PI * radius
  const fill = (score / 100) * circ
  const color =
    level === "low" ? "#22C55E" : level === "medium" ? "#FACC15" : "#EF4444"

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="108" height="108" viewBox="0 0 108 108">
        <circle cx="54" cy="54" r={radius} stroke="#2D3748" strokeWidth="10" fill="none" />
        <circle
          cx="54"
          cy="54"
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          transform="rotate(-90 54 54)"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold">{score}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  )
}

export function PortfolioRiskAnalyzer() {
  const [rows, setRows] = useState<RiskHolding[]>([
    { symbol: "RELIANCE", weight: 30 },
    { symbol: "INFY", weight: 40 },
    { symbol: "TCS", weight: 30 },
  ])

  const mutation = useMutation({ mutationFn: RiskAPI.analyze })

  const addRow = () => setRows((r) => [...r, { symbol: "", weight: 10 }])
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof RiskHolding, value: string) =>
    setRows((r) =>
      r.map((row, idx) =>
        idx === i ? { ...row, [field]: field === "weight" ? Number(value) : value.toUpperCase() } : row
      )
    )

  const totalWeight = rows.reduce((s, r) => s + (Number(r.weight) || 0), 0)
  const canSubmit = rows.length > 0 && rows.every((r) => r.symbol && r.weight > 0)

  const report: RiskReport | undefined = mutation.data

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Portfolio Risk Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
              <span className="col-span-6">Symbol</span>
              <span className="col-span-4">Weight (%)</span>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-6 uppercase"
                  placeholder="e.g. RELIANCE"
                  value={row.symbol}
                  onChange={(e) => updateRow(i, "symbol", e.target.value)}
                />
                <Input
                  className="col-span-4"
                  type="number"
                  min={1}
                  max={100}
                  placeholder="30"
                  value={row.weight}
                  onChange={(e) => updateRow(i, "weight", e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-span-2"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={addRow} className="gap-1">
              <Plus className="w-4 h-4" />
              Add Stock
            </Button>
            <span
              className={`text-xs font-semibold ${
                Math.abs(totalWeight - 100) < 0.01
                  ? "text-bullish"
                  : "text-yellow-400"
              }`}
            >
              Total: {totalWeight.toFixed(1)}%
            </span>
          </div>

          <Button
            className="w-full"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate(rows)}
          >
            {mutation.isPending ? "Analyzing..." : "Analyze Portfolio Risk"}
          </Button>

          {mutation.isError && (
            <p className="text-xs text-bearish">
              {(mutation.error as Error)?.message || "Analysis failed."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {report && (
        <>
          {/* Score + Level */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="flex flex-col items-center justify-center py-6 col-span-1">
              <ScoreRing score={report.score} level={report.risk_level} />
              <div className="mt-3">
                <Badge
                  className={`text-sm font-bold border ${RISK_BADGE[report.risk_level]}`}
                  variant="outline"
                >
                  {report.risk_level.toUpperCase()} RISK
                </Badge>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground text-center px-4">
                Score = 100 − concentration − sector − volatility deductions
              </p>
            </Card>

            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Risk Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                    [
                      ["Concentration", report.breakdown.concentration],
                      ["Sector Exposure", report.breakdown.sector_exposure],
                      ["Volatility", report.breakdown.volatility],
                    ] as [string, typeof report.breakdown.concentration][]
                  ).map(([label, b]) => {
                    const barPct = Math.min(100, (b.penalty / 30) * 100)
                    const barColor =
                      b.level === "high"
                        ? "bg-bearish"
                        : b.level === "medium"
                        ? "bg-yellow-400"
                        : "bg-bullish"
                    return (
                      <div key={label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">{label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-semibold ${RISK_COLOR[b.level]}`}>
                              {b.level.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              −{b.penalty} pts
                            </span>
                          </div>
                        </div>
                        {/* Deduction bar */}
                        <div className="h-1.5 w-full rounded-full bg-accent/50">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        {/* Why explanation */}
                        <p className="text-[11px] text-muted-foreground/70 leading-snug">
                          {b.why}
                        </p>
                      </div>
                    )
                  })}
              </CardContent>
            </Card>
          </div>

          {/* Explanation callout */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-3 py-4">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-primary mb-1">What this means for you</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.explanation}</p>
              </div>
            </CardContent>
          </Card>

          {/* Sector Weights */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sector Exposure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(
                  report.breakdown.sector_exposure.sector_weights
                ).map(([sector, pct]) => (
                  <div key={sector} className="p-3 rounded-lg bg-accent/30">
                    <div className="text-xs text-muted-foreground mb-1">{sector}</div>
                    <div
                      className={`text-lg font-bold ${
                        pct > 50 ? "text-bearish" : pct > 30 ? "text-yellow-400" : "text-bullish"
                      }`}
                    >
                      {pct.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          {report.issues.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-bearish" />
                  Risk Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.issues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 rounded-lg border border-bearish/20 bg-bearish/5 text-sm"
                  >
                    <AlertTriangle className="w-4 h-4 text-bearish mt-0.5 shrink-0" />
                    <span>{issue}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {report.suggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm"
                  >
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Holdings table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Holdings Analyzed</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-left py-2">Sector</th>
                    <th className="text-right py-2">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {report.holdings_analyzed.map((h) => (
                    <tr key={h.symbol} className="border-b border-border/30 last:border-0">
                      <td className="py-2 font-semibold">{h.symbol}</td>
                      <td className="py-2 text-muted-foreground">{h.sector}</td>
                      <td className="py-2 text-right font-semibold">{h.weight.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
