"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, X, Star, Search } from "lucide-react"

const STORAGE_KEY = "vestintel:watchlist"

function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSymbols(JSON.parse(raw))
    } catch {}
  }, [])

  const save = (next: string[]) => {
    setSymbols(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const add = (symbol: string) => {
    const s = symbol.trim().toUpperCase()
    if (!s || symbols.includes(s)) return
    save([...symbols, s])
  }

  const remove = (symbol: string) => {
    save(symbols.filter((s) => s !== symbol))
  }

  return { symbols, add, remove }
}

export function WatchlistWidget() {
  const { symbols, add, remove } = useWatchlist()
  const [inputVisible, setInputVisible] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputVisible) inputRef.current?.focus()
  }, [inputVisible])

  const handleAdd = () => {
    if (inputValue.trim()) {
      add(inputValue)
      setInputValue("")
      setInputVisible(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd()
    if (e.key === "Escape") {
      setInputVisible(false)
      setInputValue("")
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#151B23", border: "1px solid #1F2937" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4" style={{ color: "#F59E0B" }} />
          <span className="text-sm font-semibold tracking-wide uppercase" style={{ color: "#9CA3AF" }}>
            Watchlist
          </span>
        </div>
        <button
          onClick={() => setInputVisible((v) => !v)}
          className="flex items-center gap-1 text-xs px-2 py-1 transition-colors"
          style={{ color: "#6B7280", border: "1px solid #1F2937", background: "transparent" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#E5E7EB")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Add Input */}
      {inputVisible && (
        <div className="px-4 py-2" style={{ borderBottom: "1px solid #1F2937", background: "#0B0F14" }}>
          <div className="flex items-center gap-2">
            <Search className="w-3 h-3 shrink-0" style={{ color: "#6B7280" }} />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="e.g. RELIANCE, TCS"
              className="flex-1 bg-transparent text-xs outline-none tabular-nums"
              style={{ color: "#E5E7EB", caretColor: "#22C55E" }}
            />
            <button
              onClick={handleAdd}
              className="text-xs px-2 py-0.5"
              style={{ background: "#1F2937", color: "#22C55E" }}
            >
              Add
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: "#4B5563" }}>
            Press Enter to add · Esc to cancel
          </p>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {symbols.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
            <Star className="w-8 h-8" style={{ color: "#1F2937" }} />
            <p className="text-xs" style={{ color: "#4B5563" }}>No symbols added yet</p>
            <p className="text-xs" style={{ color: "#374151" }}>Click + Add to track NSE stocks</p>
          </div>
        ) : (
          symbols.map((symbol) => (
            <WatchRow key={symbol} symbol={symbol} onRemove={() => remove(symbol)} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Individual row — fetches live quote from backend NSE cache ───────────────

function WatchRow({ symbol, onRemove }: { symbol: string; onRemove: () => void }) {
  const [quote, setQuote] = useState<{ price: number; change_percent: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchQuote = async () => {
      try {
        const res = await fetch(`/api/markets/nse/quote/${symbol}`, {
          headers: { "X-User-Email": "guest@vestintel.local" },
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) setQuote(data)
      } catch {
        if (!cancelled) setQuote(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchQuote()
    const id = setInterval(fetchQuote, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [symbol])

  const isUp = (quote?.change_percent ?? 0) >= 0
  const changeColor = isUp ? "#22C55E" : "#EF4444"

  return (
    <div
      className="flex items-center justify-between px-4 py-3 group transition-colors"
      style={{ borderBottom: "1px solid #1F2937" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#0B0F14")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "#EF4444" }}
          title="Remove from watchlist"
        >
          <X className="w-3 h-3" />
        </button>
        <span className="text-sm font-mono font-semibold" style={{ color: "#E5E7EB" }}>
          {symbol}
        </span>
      </div>

      <div className="text-right">
        {loading ? (
          <span className="text-xs" style={{ color: "#4B5563" }}>—</span>
        ) : quote ? (
          <>
            <div className="text-sm font-mono tabular-nums" style={{ color: "#E5E7EB" }}>
              ₹{quote.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs tabular-nums" style={{ color: changeColor }}>
              {isUp ? "+" : ""}{quote.change_percent.toFixed(2)}%
            </div>
          </>
        ) : (
          <span className="text-xs" style={{ color: "#4B5563" }}>No data</span>
        )}
      </div>
    </div>
  )
}
