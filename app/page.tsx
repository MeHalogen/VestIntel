import { Hero } from "@/components/landing/hero";
import { MarketTicker } from "@/components/landing/market-ticker";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { AIInsightsPreview } from "@/components/landing/ai-insights-preview";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/landing/footer";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <MarketTicker />
      <DashboardPreview />
      <AIInsightsPreview />
      {FEATURE_FLAGS.showPricing && <PricingSection />}
      <Footer />
    </main>
  );
}
