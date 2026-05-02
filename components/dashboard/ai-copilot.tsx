"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Brain, Send, Loader2, TrendingUp } from "lucide-react"
import { InsightsAPI } from "@/lib/api"

const SUGGESTIONS = [
  "Top gainers today",
  "Top losers today",
  "Market summary today",
  "Why is RELIANCE moving?",
  "Compare TCS vs INFY",
  "Which sectors are strong?",
]

export function AICopilot() {
  const [query, setQuery] = useState("")

  // ── Pre-emptive insights (page-load, no auth) ──────────────────────────
  const { data: keyData, isLoading: keyLoading } = useQuery({
    queryKey: ["key-insights"],
    queryFn: InsightsAPI.keyInsights,
    staleTime: 60_000,      // treat as fresh for 60s
    retry: 1,
  })

  // ── User query ─────────────────────────────────────────────────────────
  const askMutation = useMutation({
    mutationFn: (q: string) => InsightsAPI.ask(q),
  })

  const handleAsk = (q?: string) => {
    const text = (q ?? query).trim()
    if (!text) return
    if (q) setQuery(q)
    askMutation.mutate(text)
  }

  const data = askMutation.data

  return (
    <div
      className="flex flex-col gap-4 p-5"
      style={{ background: "#151B23", border: "1px solid #1F2937" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4" style={{ color: "#22C55E" }} />
        <span className="text-sm font-semibold tracking-wide text-white">Market Copilot</span>
        <span className="ml-auto text-xs" style={{ color: "#6B7280" }}>
          rule-based · live NSE data
        </span>
      </div>

      {/* ── Today's Key Insights ───────────────────────────────────────── */}
      <div
        className="flex flex-col gap-0"
        style={{ border: "1px solid #1F2937" }}
      >
        {/* section header */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: "#0B0F14", borderBottom: "1px solid #1F2937" }}
        >
          <TrendingUp className="w-3 h-3" style={{ color: "#22C55E" }} />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#6B7280" }}>
            Today's Key Insights
          </span>
          {keyData?.as_of && (
            <span className="ml-auto text-xs font-mono" style={{ color: "#374151" }}>
              {keyData.as_of}
            </span>
          )}
        </div>

        {/* insight rows */}
        {keyLoading ? (
          <div className="flex items-center gap-2 px-3 py-3" style={{ background: "#0B0F14" }}>
            <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#6B7280" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Analysing live market data…</span>
          </div>
        ) : keyData?.insights?.length ? (
          keyData.insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-2.5"
              style={{
                background: "#0B0F14",
                borderTop: i > 0 ? "1px solid #1F2937" : undefined,
              }}
            >
              {/* index dot */}
              <span
                className="mt-0.5 flex-shrink-0 text-xs font-mono w-4 text-center"
                style={{ color: "#374151" }}
              >
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: "#D1D5DB" }}>
                {insight}
              </p>
            </div>
          ))
        ) : (
          <div className="px-3 py-3" style={{ background: "#0B0F14" }}>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Live data unavailable — insights will appear once the NSE feed is active.
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #1F2937" }} />

      {/* Input row */}
      <div className="flex gap-2">
        <Input
          placeholder="Ask about the market…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          style={{
            background: "#0B0F14",
            border: "1px solid #1F2937",
            color: "#F9FAFB",
            fontSize: "0.875rem",
          }}
        />
        <Button
          onClick={() => handleAsk()}
          disabled={askMutation.isPending}
          style={{ background: "#22C55E", color: "#000", minWidth: 40 }}
        >
          {askMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleAsk(s)}
            className="text-xs px-3 py-1 transition-colors"
            style={{
              background: "#0B0F14",
              border: "1px solid #1F2937",
              color: "#9CA3AF",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#F9FAFB" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9CA3AF" }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Query response ─────────────────────────────────────────────── */}
      {(askMutation.isError || data) && (
        <>
          <div style={{ borderTop: "1px solid #1F2937" }} />

          {askMutation.isError && (
            <p className="text-sm" style={{ color: "#EF4444" }}>
              {(askMutation.error as Error)?.message || "Failed to get a response."}
            </p>
          )}

          {data && (
            <div className="flex flex-col gap-4">
              {/* Query echo */}
              <p className="text-xs font-mono" style={{ color: "#6B7280" }}>
                &gt; {data.query}
              </p>

              {/* Answer */}
              <p className="text-sm leading-relaxed" style={{ color: "#D1D5DB" }}>
                {data.answer}
              </p>

              {/* Market Breadth */}
              {data.breadth?.total > 0 && (
                <div style={{ border: "1px solid #1F2937" }}>
                  <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "#0B0F14", borderBottom: "1px solid #1F2937" }}>
                    <span className="text-xs" style={{ color: "#6B7280" }}>Market Breadth</span>
                    <span className="text-xs font-semibold font-mono" style={{ color: data.breadth.sentiment === "bullish" ? "#22C55E" : data.breadth.sentiment === "bearish" ? "#EF4444" : "#9CA3AF" }}>
                      {data.breadth.sentiment.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex h-2" style={{ background: "#EF444433" }}>
                    <div style={{ width: `${data.breadth.adv_pct}%`, background: "#22C55E" }} />
                  </div>
                  <div className="flex justify-between px-3 py-1.5" style={{ background: "#0B0F14" }}>
                    <span className="text-xs tabular-nums" style={{ color: "#22C55E" }}>▲ {data.breadth.advancing} advancing</span>
                    <span className="text-xs tabular-nums" style={{ color: "#6B7280" }}>{data.breadth.adv_pct}%</span>
                    <span className="text-xs tabular-nums" style={{ color: "#EF4444" }}>▼ {data.breadth.declining} declining</span>
                  </div>
                </div>
              )}

              {/* Relative Performance */}
              {data.relative_performance && (
                <div className="flex items-center justify-between px-3 py-2" style={{ border: "1px solid #1F2937", background: "#0B0F14" }}>
                  <span className="text-xs" style={{ color: "#6B7280" }}>vs NIFTY 50</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs tabular-nums" style={{ color: "#9CA3AF" }}>
                      NIFTY {data.relative_performance.nifty_change >= 0 ? "+" : ""}{data.relative_performance.nifty_change.toFixed(2)}%
                    </span>
                    <span className="text-xs font-semibold tabular-nums font-mono" style={{
                      color: data.relative_performance.relative_performance === "outperforming" ? "#22C55E" : "#EF4444"
                    }}>
                      {data.relative_performance.relative_performance === "outperforming" ? "▲" : "▼"}{" "}
                      {data.relative_performance.relative_performance.toUpperCase()}{" "}
                      ({data.relative_performance.delta >= 0 ? "+" : ""}{data.relative_performance.delta.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Confidence + Context */}
              {(data.confidence || data.context?.length > 0) && (
                <div className="flex flex-col gap-2">
                  {/* Confidence pill */}
                  {data.confidence && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "#6B7280" }}>Confidence</span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 font-mono"
                        style={{
                          background:
                            data.confidence === "HIGH"   ? "#14532d" :
                            data.confidence === "MEDIUM" ? "#713f12" : "#1f2937",
                          color:
                            data.confidence === "HIGH"   ? "#22C55E" :
                            data.confidence === "MEDIUM" ? "#F59E0B" : "#9CA3AF",
                        }}
                      >
                        {data.confidence}
                      </span>
                    </div>
                  )}

                  {/* Context bullets */}
                  {data.context?.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {data.context.map((line: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#9CA3AF" }}>
                          <span style={{ color: "#374151", flexShrink: 0 }}>›</span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Follow-up suggestions */}
              {data.suggestions?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs" style={{ color: "#4B5563" }}>Follow-up</span>
                  <div className="flex flex-wrap gap-2">
                    {data.suggestions.map((s: string) => (
                      <button
                        key={s}
                        onClick={() => handleAsk(s)}
                        className="text-xs px-3 py-1.5 text-left transition-colors"
                        style={{
                          background: "#0B0F14",
                          border: "1px solid #22C55E22",
                          color: "#22C55E",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLButtonElement
                          el.style.background = "#14532d"
                          el.style.borderColor = "#22C55E"
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLButtonElement
                          el.style.background = "#0B0F14"
                          el.style.borderColor = "#22C55E22"
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data points — terminal grid */}
              {data.data_points?.length > 0 && (
                <div
                  className="grid gap-px"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                    background: "#1F2937",
                    border: "1px solid #1F2937",
                  }}
                >
                  {data.data_points.map((pt: { label: string; value: string }) => (
                    <div
                      key={pt.label}
                      className="flex flex-col gap-1 p-3"
                      style={{ background: "#0B0F14" }}
                    >
                      <span className="text-xs" style={{ color: "#6B7280" }}>{pt.label}</span>
                      <span
                        className="text-sm font-semibold tabular-nums"
                        style={{
                          color: pt.value.includes("-") ? "#EF4444" : "#22C55E",
                        }}
                      >
                        {pt.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Related stocks */}
              {data.related_stocks?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs self-center" style={{ color: "#6B7280" }}>Related:</span>
                  {data.related_stocks.map((sym: string) => (
                    <span
                      key={sym}
                      className="text-xs px-2 py-0.5 font-mono"
                      style={{ background: "#1F2937", color: "#F9FAFB" }}
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs" style={{ color: "#374151" }}>
                {data.as_of} · {data.source}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
