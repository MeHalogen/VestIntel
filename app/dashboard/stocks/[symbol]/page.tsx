import { StockSearch } from "@/components/stocks/stock-search";
import { StockChart } from "@/components/stocks/stock-chart";
import { StockInfo } from "@/components/stocks/stock-info";
import { StockMetrics } from "@/components/stocks/stock-metrics";
import { AIAnalysis } from "@/components/stocks/ai-analysis";

export default function StockPage({ params }: { params: { symbol: string } }) {
  const decodedSymbol = decodeURIComponent(params.symbol || "")
  return (
    <div className="space-y-6">
      <StockSearch />
      
      <StockInfo symbol={decodedSymbol} />
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <StockChart symbol={decodedSymbol} />
          <StockMetrics symbol={decodedSymbol} />
        </div>
        
        <div>
          <AIAnalysis symbol={decodedSymbol} />
        </div>
      </div>
    </div>
  );
}
