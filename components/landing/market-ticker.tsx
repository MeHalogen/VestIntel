"use client"

import { motion } from "framer-motion"

const marketData = [
  { symbol: "AAPL", price: 175.43, change: 2.34 },
  { symbol: "GOOGL", price: 142.89, change: -0.87 },
  { symbol: "MSFT", price: 378.91, change: 1.56 },
  { symbol: "AMZN", price: 178.35, change: 3.12 },
  { symbol: "TSLA", price: 238.45, change: -2.45 },
  { symbol: "META", price: 484.03, change: 1.89 },
  { symbol: "NVDA", price: 875.28, change: 4.67 },
  { symbol: "AMD", price: 165.37, change: 2.11 },
]

export function MarketTicker() {
  return (
    <div className="w-full bg-card/50 border-y border-border/50 py-4 overflow-hidden">
      <div className="relative flex">
        <motion.div
          className="flex gap-8"
          animate={{
            x: [0, -1920],
          }}
          transition={{
            x: {
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {[...marketData, ...marketData, ...marketData].map((stock, i) => (
            <div key={i} className="flex items-center gap-3 min-w-fit">
              <span className="font-semibold text-foreground">{stock.symbol}</span>
              <span className="text-muted-foreground">${stock.price.toFixed(2)}</span>
              <span
                className={`text-sm ${
                  stock.change >= 0 ? "text-bullish" : "text-bearish"
                }`}
              >
                {stock.change >= 0 ? "+" : ""}
                {stock.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
