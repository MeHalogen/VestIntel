import { OpportunityFinder } from "@/components/dashboard/opportunity-finder"

export default function OpportunitiesPage() {
  return (
    <div className="space-y-3">
      <div className="border-b border-[#1F2937] pb-2.5">
        <h1 className="text-lg font-bold text-[#E6EAF0]">Opportunity Finder</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">AI-detected momentum, dip, and breakout setups</p>
      </div>
      <OpportunityFinder />
    </div>
  )
}
