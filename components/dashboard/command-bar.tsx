"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, TrendingUp, Clock, Hash } from "lucide-react"
import { Input } from "@/components/ui/input"

const quickActions = [
  { label: "Dashboard", path: "/dashboard", icon: "⌘D" },
  { label: "Markets", path: "/dashboard/markets", icon: "⌘M" },
  { label: "Portfolio", path: "/dashboard/portfolio", icon: "⌘P" },
  { label: "AI Copilot", path: "/dashboard/copilot", icon: "⌘I" },
]

const popularStocks = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
]

export function CommandBar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleStockClick = (symbol: string) => {
    router.push(`/dashboard/stocks/${symbol}`)
    setIsOpen(false)
    setQuery("")
  }

  const handleActionClick = (path: string) => {
    router.push(path)
    setIsOpen(false)
    setQuery("")
  }

  return (
    <>
      {/* Search Trigger */}
      <div
        onClick={() => setIsOpen(true)}
        className="relative flex-1 max-w-md cursor-text"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search stocks, companies, sectors..."
          className="pl-10 pr-12"
          readOnly
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-muted rounded border">
          ⌘K
        </kbd>
      </div>

      {/* Command Palette Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-lg shadow-2xl">
              {/* Search Input */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search stocks, companies, sectors..."
                    className="pl-10 text-lg"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {query === "" && (
                  <>
                    {/* Quick Actions */}
                    <div className="p-2">
                      <div className="text-xs font-semibold text-muted-foreground px-3 py-2">
                        Quick Actions
                      </div>
                      {quickActions.map((action) => (
                        <button
                          key={action.path}
                          onClick={() => handleActionClick(action.path)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-accent transition-colors text-left"
                        >
                          <span>{action.label}</span>
                          <kbd className="px-2 py-1 text-xs bg-muted rounded border">
                            {action.icon}
                          </kbd>
                        </button>
                      ))}
                    </div>

                    {/* Popular Stocks */}
                    <div className="p-2 border-t border-border">
                      <div className="text-xs font-semibold text-muted-foreground px-3 py-2 flex items-center gap-2">
                        <TrendingUp className="w-3 h-3" />
                        Popular Stocks
                      </div>
                      {popularStocks.map((stock) => (
                        <button
                          key={stock.symbol}
                          onClick={() => handleStockClick(stock.symbol)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent transition-colors text-left"
                        >
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-semibold">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">{stock.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {query !== "" && (
                  <div className="p-2">
                    <div className="text-xs font-semibold text-muted-foreground px-3 py-2">
                      Search Results
                    </div>
                    {popularStocks
                      .filter((stock) =>
                        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
                        stock.name.toLowerCase().includes(query.toLowerCase())
                      )
                      .map((stock) => (
                        <button
                          key={stock.symbol}
                          onClick={() => handleStockClick(stock.symbol)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent transition-colors text-left"
                        >
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-semibold">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">{stock.name}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>ESC Close</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
