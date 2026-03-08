import Link from "next/link"
import { StockSearch } from "@/components/stocks/stock-search"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const quickSymbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "ICICIBANK", "ITC"]

export default function StocksIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stocks</h1>
        <p className="text-muted-foreground">Search NSE symbols and open detailed analysis.</p>
      </div>

      <StockSearch />

      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickSymbols.map((symbol) => (
              <Link
                key={symbol}
                href={`/dashboard/stocks/${encodeURIComponent(symbol)}`}
                className="px-3 py-2 rounded-md border border-border/50 hover:bg-accent text-sm"
              >
                {symbol}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
