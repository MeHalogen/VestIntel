"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { motion } from "framer-motion"

export function DashboardPreview() {
  return (
    <section className="py-20 px-4" id="features">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Professional-Grade Analytics
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform raw market data into actionable insights with our powerful dashboard
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative"
        >
          <Card className="p-8 panel-glass">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">S&P 500</div>
                <div className="text-3xl font-bold">4,783.45</div>
                <div className="flex items-center gap-2 text-bullish">
                  <TrendingUp className="w-4 h-4" />
                  <span>+1.23%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">NASDAQ</div>
                <div className="text-3xl font-bold">15,011.35</div>
                <div className="flex items-center gap-2 text-bullish">
                  <TrendingUp className="w-4 h-4" />
                  <span>+0.87%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">DOW JONES</div>
                <div className="text-3xl font-bold">37,863.80</div>
                <div className="flex items-center gap-2 text-bearish">
                  <TrendingDown className="w-4 h-4" />
                  <span>-0.34%</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
