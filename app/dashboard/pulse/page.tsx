import { DailyMarketPulse } from "@/components/dashboard/daily-market-pulse"

export default function PulsePage() {
  return (
    <div className="space-y-3">
      <div className="border-b border-[#1F2937] pb-2.5">
        <h1 className="text-lg font-bold text-[#E6EAF0]">Market Pulse</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Daily NSE market summary and sentiment</p>
      </div>
      <DailyMarketPulse />
    </div>
  )
}
