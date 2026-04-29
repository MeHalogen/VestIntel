import { OpportunityFinder } from "@/components/dashboard/opportunity-finder"

export default function OpportunitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Opportunity Finder</h1>
        <p className="text-muted-foreground">
          Rule-based signals from live NIFTY 50 data — momentum, dips, volume breakouts, and consolidations.
        </p>
      </div>

      <OpportunityFinder />
    </div>
  )
}
