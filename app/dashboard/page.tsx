import { MarketOverview } from "@/components/dashboard/market-overview";
import { TrendingStocks } from "@/components/dashboard/trending-stocks";
import { WatchlistWidget } from "@/components/dashboard/watchlist-widget";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { MarketHeadline } from "@/components/dashboard/market-headline";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <MarketHeadline />

      <MarketOverview />

      <div className="grid gap-6 md:grid-cols-2">
        <TrendingStocks />
        <WatchlistWidget />
      </div>

      <RecentActivity />
    </div>
  );
}
