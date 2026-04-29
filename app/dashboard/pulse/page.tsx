import { DailyMarketPulse } from "@/components/dashboard/daily-market-pulse"

export default function PulsePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Market Pulse</h1>
        <p className="text-muted-foreground">
          Live NSE direction, breadth, sector trends, and top movers — refreshed every 60 seconds.
        </p>
      </div>

      <DailyMarketPulse />
    </div>
  )
}
