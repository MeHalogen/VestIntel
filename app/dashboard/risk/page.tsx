import { PortfolioRiskAnalyzer } from "@/components/portfolio/portfolio-risk-analyzer"

export default function RiskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Risk Engine</h1>
        <p className="text-muted-foreground">
          Analyze concentration, sector, and volatility risk for any NSE portfolio — no AI required.
        </p>
      </div>

      <PortfolioRiskAnalyzer />
    </div>
  )
}
