import { MarketOverview } from "@/components/dashboard/market-overview";
import { TrendingStocks } from "@/components/dashboard/trending-stocks";
import { WatchlistWidget } from "@/components/dashboard/watchlist-widget";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your market intelligence overview
        </p>
      </div>

      <MarketOverview />

      <div className="grid gap-6 md:grid-cols-2">
        <TrendingStocks />
        <WatchlistWidget />
      </div>

      <RecentActivity />
    </div>
  );
}
