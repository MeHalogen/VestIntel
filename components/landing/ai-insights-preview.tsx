"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"

export function AIInsightsPreview() {
  return (
    <section className="py-20 px-4 bg-card/20">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-sm text-primary mb-6">
              <Brain className="w-4 h-4" />
              <span>AI-Powered Insights</span>
            </div>
            
            <h2 className="text-4xl font-bold mb-4">
              Let AI Do the Heavy Lifting
            </h2>
            <p className="text-xl text-muted-foreground mb-6">
              Our advanced AI analyzes thousands of data points to deliver
              actionable market insights in plain English.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold mb-1">Real-time Sentiment Analysis</div>
                  <div className="text-sm text-muted-foreground">
                    Track market sentiment across news, social media, and analyst reports
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold mb-1">Pattern Recognition</div>
                  <div className="text-sm text-muted-foreground">
                    Identify trends and patterns that human analysts might miss
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="panel-glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  AI Market Brief
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                  <p className="text-sm leading-relaxed">
                    <strong className="text-primary">Apple (AAPL)</strong> shares increased{" "}
                    <span className="text-bullish font-semibold">2.4%</span> today driven
                    by semiconductor sector strength and optimistic earnings forecasts.
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-bullish">85</div>
                    <div className="text-xs text-muted-foreground">Sentiment Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">A+</div>
                    <div className="text-xs text-muted-foreground">Technical Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chart-tertiary">Medium</div>
                    <div className="text-xs text-muted-foreground">Risk Level</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
