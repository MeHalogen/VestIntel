import { MarketList } from "@/components/markets/market-list";
import { MarketHeatmap } from "@/components/markets/market-heatmap";
import { SectorPerformance } from "@/components/markets/sector-performance";
import { GlobalIndicesMonitor } from "@/components/dashboard/global-indices"
import { MarketSentiment } from "@/components/dashboard/market-sentiment"
import { SectorHeatmap } from "@/components/dashboard/sector-heatmap"

export default function MarketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
        <p className="text-muted-foreground">
          NSE market overview, sector analysis, and India heatmap
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <GlobalIndicesMonitor />
        </div>
        <MarketSentiment />
      </div>

      <SectorHeatmap />

      <MarketList />
      
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketHeatmap />
        <SectorPerformance />
      </div>
    </div>
  );
}
