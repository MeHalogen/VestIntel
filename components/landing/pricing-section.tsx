"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { motion } from "framer-motion"

const plans = [
  {
    name: "Free",
    price: "₹0",
    description: "Free market data for everyday investors",
    features: [
      "Market heatmap (NSE)",
      "Basic stock charts",
      "Top gainers & losers",
      "Sector performance dashboard",
      "Financial news feed",
      "Basic watchlist (limit 10 stocks)",
      "Basic signals",
      "Basic stock search",
      "Basic AI market brief (limited)",
      "Market data delay (5 min)",
    ],
  },
  {
    name: "Pro",
    price: "₹199",
    period: "/month",
    description: "Pay only for AI intelligence & advanced research",
    features: [
      "Real-time market data",
      "Unlimited watchlists",
      "Portfolio tracker",
      "AI stock analysis",
      "AI market copilot",
      "Advanced technical indicators",
      "Custom alerts",
      "News sentiment analysis",
      "Momentum screener",
      "AI queries: 50/day",
    ],
    popular: true,
  },
  {
    name: "Pro+",
    price: "₹499",
    period: "/month",
    description: "For power users & professional research workflows",
    features: [
      "Everything in Pro",
      "Institutional flow signals",
      "Advanced AI forecasts",
      "Custom stock screeners",
      "Backtesting engine",
      "Advanced portfolio analytics",
      "Sector rotation intelligence",
      "Market sentiment dashboard",
      "API access",
      "Unlimited AI queries",
    ],
  },
]

export function PricingSection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Free market data. Pay only for AI intelligence.</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Charts and market data stay free. Upgrade for AI insights, automation, and advanced analytics.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card
                className={`relative h-full ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/20"
                    : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Button
                    className="w-full mb-6"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    Get Started
                  </Button>
                  
                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
