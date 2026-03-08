import { MarketHeatmapWidget } from "@/components/widgets/market-heatmap-widget"
import { SmartMoneyTracker } from "@/components/widgets/smart-money-tracker"
import { AIOpportunityFinder } from "@/components/widgets/ai-opportunity-finder"
import { SectorRotationRadar } from "@/components/widgets/sector-rotation-radar"
import { EarningsShockDetector } from "@/components/widgets/earnings-shock-detector"
import { CorrelationExplorer } from "@/components/widgets/correlation-explorer"
import { MacroDashboard } from "@/components/widgets/macro-dashboard"
import { VolatilityMap } from "@/components/widgets/volatility-map"
import { WhaleTradeTracker } from "@/components/widgets/whale-trade-tracker"
import { AIPortfolioRoast } from "@/components/widgets/ai-portfolio-roast"
import { Badge } from "@/components/ui/badge"
import { Sparkles, TrendingUp } from "lucide-react"

export default function WidgetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          Premium Widgets
          <Badge className="bg-gradient-to-r from-primary to-accent">
            <Sparkles className="w-3 h-3 mr-1" />
            Pro+
          </Badge>
        </h1>
        <p className="text-muted-foreground">
          10 killer widgets that make investors addicted. Bloomberg-level intelligence for retail investors.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-bullish/10 to-bullish/5 border border-bullish/30">
          <div className="text-sm text-muted-foreground mb-1">Active Signals</div>
          <div className="text-3xl font-bold text-bullish">24</div>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30">
          <div className="text-sm text-muted-foreground mb-1">Whale Trades Today</div>
          <div className="text-3xl font-bold text-primary">18</div>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30">
          <div className="text-sm text-muted-foreground mb-1">Opportunities Found</div>
          <div className="text-3xl font-bold text-accent">12</div>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-chart-tertiary/10 to-chart-tertiary/5 border border-chart-tertiary/30">
          <div className="text-sm text-muted-foreground mb-1">Earnings Shocks</div>
          <div className="text-3xl font-bold text-chart-tertiary">4</div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Row 1: Market Heatmap (full width) */}
        <MarketHeatmapWidget />

        {/* Row 2: Smart Money + AI Opportunities */}
        <SmartMoneyTracker />
        <AIOpportunityFinder />

        {/* Row 3: Sector Rotation + Earnings */}
        <SectorRotationRadar />
        <EarningsShockDetector />

        {/* Row 4: Correlation + Macro */}
        <CorrelationExplorer />
        <MacroDashboard />

        {/* Row 5: Volatility + Whale Tracker */}
        <VolatilityMap />
        <WhaleTradeTracker />

        {/* Row 6: AI Portfolio Roast (full width) */}
        <AIPortfolioRoast />
      </div>

      {/* Viral Features Callout */}
      <div className="p-6 rounded-lg bg-gradient-to-r from-bearish/10 via-primary/10 to-accent/10 border border-primary/30">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-bold">Why These Widgets Work</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-semibold mb-2">📊 Data Density</div>
            <p className="text-muted-foreground">
              More information in less space. Like Bloomberg, but beautiful.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-2">🎯 Actionable Insights</div>
            <p className="text-muted-foreground">
              Not just data - actual trading opportunities and warnings.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-2">🚀 Viral Potential</div>
            <p className="text-muted-foreground">
              Portfolio Roast feature makes users share their results on social media.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
