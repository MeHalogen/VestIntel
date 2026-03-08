import { PortfolioOverview } from "@/components/portfolio/portfolio-overview";
import { AssetAllocation } from "@/components/portfolio/asset-allocation";
import { PerformanceChart } from "@/components/portfolio/performance-chart";
import { Holdings } from "@/components/portfolio/holdings";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">
          Track and analyze your investments
        </p>
      </div>

      <PortfolioOverview />

      <div className="grid gap-6 md:grid-cols-2">
        <AssetAllocation />
        <PerformanceChart />
      </div>

      <Holdings />
    </div>
  );
}
