"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus, Trash2, XCircle, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RiskAPI, RiskReport, RiskHolding } from "@/lib/api"

// ── color maps ─────────────────────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  low:    "text-green-500",
  medium: "text-yellow-500",
  high:   "text-red-500",
}
const RISK_BG: Record<string, string> = {
  low:    "stroke-green-500",
  medium: "stroke-yellow-500",
  high:   "stroke-red-500",
}

// ── ScoreRing ──────────────────────────────────────────────────────────────

function ScoreRing({ score, riskLevel }: { score: number; riskLevel: string }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={110} height={110} className="-rotate-90">
        <circle cx={55} cy={55} r={r} fill="none" strokeWidth={10} className="stroke-muted" />
        <circle
          cx={55} cy={55} r={r} fill="none" strokeWidth={10}
          className={RISK_BG[riskLevel]}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-3xl font-bold -mt-[80px] mb-[60px]">{score}</div>
      <Badge className={
        riskLevel === "low"    ? "bg-green-500" :
        riskLevel === "medium" ? "bg-yellow-500" :
                                 "bg-red-500"
      }>{riskLevel.toUpperCase()} RISK</Badge>
    </div>
  )
}

// ── DeductionBar ───────────────────────────────────────────────────────────

function DeductionBar({ label, penalty, level, why }: {
  label: string; penalty: number; level: string; why: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs capitalize ${RISK_COLOR[level]}`}>{level}</span>
          {penalty > 0 && <span className="text-xs text-red-500">-{penalty} pts</span>}
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            level === "low" ? "bg-green-500" : level === "medium" ? "bg-yellow-500" : "bg-red-500"
          }`}
          style={{ width: `${Math.min(100, (penalty / 40) * 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{why}</p>
    </div>
  )
}

// ── HoldingInput ───────────────────────────────────────────────────────────

function HoldingInput({ holdings, setHoldings }: {
  holdings: RiskHolding[]
  setHoldings: React.Dispatch<React.SetStateAction<RiskHolding[]>>
}) {
  const [symbol, setSymbol] = useState("")
  const [weight, setWeight] = useState("")

  const totalWeight = holdings.reduce((s, h) => s + h.weight, 0)

  function addHolding() {
    const sym = symbol.trim().toUpperCase()
    const w = parseFloat(weight)
    if (!sym || isNaN(w) || w <= 0) return
    setHoldings((prev) => [...prev, { symbol: sym, weight: w }])
    setSymbol("")
    setWeight("")
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Symbol (e.g. RELIANCE)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addHolding()}
        />
        <input
          className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Weight %"
          type="number"
          min={0}
          max={100}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addHolding()}
        />
        <button
          onClick={addHolding}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {holdings.length > 0 && (
        <div className="space-y-1">
          {holdings.map((h, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="font-medium text-sm">{h.symbol}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{h.weight}%</span>
                <button onClick={() => setHoldings((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ))}
          <div className={`text-xs text-right mt-1 ${Math.abs(totalWeight - 100) > 0.01 ? "text-yellow-500" : "text-green-500"}`}>
            Total: {totalWeight.toFixed(1)}% {Math.abs(totalWeight - 100) > 0.01 ? "(should sum to 100%)" : "✓"}
          </div>
        </div>
      )}
    </div>
  )
}

// ── RiskResults ────────────────────────────────────────────────────────────

function RiskResults({ report }: { report: RiskReport }) {
  return (
    <div className="space-y-4">
      {/* Score ring + summary */}
      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-6">
          <ScoreRing score={report.score} riskLevel={report.risk_level} />
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg">Risk Summary</h3>
            <p className="text-sm text-muted-foreground">{report.explanation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Risk Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DeductionBar label="Concentration Risk" penalty={report.breakdown.concentration.penalty} level={report.breakdown.concentration.level} why={report.breakdown.concentration.why} />
          <DeductionBar label="Sector Risk" penalty={report.breakdown.sector_exposure.penalty} level={report.breakdown.sector_exposure.level} why={report.breakdown.sector_exposure.why} />
          <DeductionBar label="Volatility Risk" penalty={report.breakdown.volatility.penalty} level={report.breakdown.volatility.level} why={report.breakdown.volatility.why} />
        </CardContent>
      </Card>

      {/* Sector distribution */}
      {report.breakdown.sector_exposure.sector_weights && Object.keys(report.breakdown.sector_exposure.sector_weights).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sector Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(report.breakdown.sector_exposure.sector_weights).map(([sector, pct]) => (
              <div key={sector} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span>{sector}</span>
                  <span className="text-muted-foreground">{(pct as number).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Issues */}
      {report.issues.length > 0 && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Issues Detected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <span>{issue}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {report.suggestions.length > 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                <span>{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Holdings table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Holdings Analyzed</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left pb-2">Symbol</th>
                <th className="text-right pb-2">Weight</th>
                <th className="text-right pb-2">Sector</th>
                <th className="text-right pb-2">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.holdings_analyzed.map((h) => (
                <tr key={h.symbol}>
                  <td className="py-2 font-medium">{h.symbol}</td>
                  <td className="py-2 text-right text-muted-foreground">{h.weight}%</td>
                  <td className="py-2 text-right text-muted-foreground">{h.sector}</td>
                  <td className="py-2 text-right text-muted-foreground">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────

export function PortfolioRiskAnalyzer() {
  const [holdings, setHoldings] = useState<RiskHolding[]>([])
  const [submitted, setSubmitted] = useState<RiskHolding[] | null>(null)

  const { data: report, isLoading, error } = useQuery<RiskReport>({
    queryKey: ["risk-analysis", submitted],
    queryFn: (): Promise<RiskReport> => RiskAPI.analyze(submitted!),
    enabled: !!submitted && submitted.length > 0,
  })

  return (
    <div className="space-y-4">
      {/* Input card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Portfolio Holdings</CardTitle>
          <p className="text-xs text-muted-foreground">Enter your holdings with approximate weight % to analyze portfolio risk.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <HoldingInput holdings={holdings} setHoldings={setHoldings} />
          <button
            onClick={() => setSubmitted([...holdings])}
            disabled={holdings.length === 0 || isLoading}
            className="w-full rounded-md bg-primary py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Analyzing…" : "Analyze Risk"}
          </button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Risk analysis failed. Ensure the backend is running.
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {report && <RiskResults report={report} />}
    </div>
  )
}
