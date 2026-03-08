"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { StocksAPI } from "@/lib/api"

export function StockSearch() {
  const [query, setQuery] = useState("")
  const trimmed = query.trim()
  const { data = [] } = useQuery({
    queryKey: ["stocks", "search", trimmed],
    queryFn: () => StocksAPI.search(trimmed),
    enabled: trimmed.length >= 1,
    refetchInterval: 0,
  })
  const results = useMemo(() => data.slice(0, 6), [data])

  return (
    <div className="relative max-w-2xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        placeholder="Search stocks by symbol or company name..."
        className="pl-10 h-12 text-lg"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {trimmed.length >= 1 && results.length > 0 && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-border bg-card shadow-xl p-2 space-y-1">
          {results.map((r) => (
            <Link
              key={r.symbol}
              href={`/dashboard/stocks/${encodeURIComponent(r.symbol)}`}
              className="block rounded-md px-3 py-2 hover:bg-accent text-sm"
            >
              <span className="font-semibold mr-2">{r.symbol}</span>
              <span className="text-muted-foreground">{r.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
