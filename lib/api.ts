"use client"

import { apiRequest } from "@/lib/api-client"

export type Quote = {
  symbol: string
  exchange: string
  price: number
  change_percent: number
  volume?: number | null
  timestamp: number
  change?: number
  currency?: string
  source?: string
  as_of?: string
  market_cap?: number | null
  sector?: string | null
}

export type StockHistoryBar = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type NewsItem = {
  title: string
  url: string
  source: string
  published_at: string
  summary?: string | null
  tickers?: string[]
  sentiment_score?: number | null
  as_of?: string
}

export type SignalItem = {
  id: string
  symbol: string
  type: string
  severity: string
  message: string
  reasons?: string[]
  timestamp: number
  source?: string
  as_of?: string
}

export type MarketIndex = {
  symbol: string
  name: string
  region?: string
  value: number
  change: number
  change_percent: number
  source?: string
  as_of?: string
}

export type MarketsPayload = {
  as_of: string
  source: string
  indices: MarketIndex[]
}

export type WatchlistPayload = {
  items: Quote[]
  as_of: string
  source: string
}

export type IndiaMarketPayload = {
  as_of: string
  source: string
  nifty: { name: string; value: number; change_percent: number }
  banknifty: { name: string; value: number; change_percent: number }
  sector_performance: Array<{ sector: string; performance: number; count: number }>
  heatmap: Array<{
    symbol: string
    price: number
    pChange: number
    sector: string
    marketCap: number
    volume: number
  }>
  indices: MarketIndex[]
}

export type SectorPerformance = {
  sector: string
  symbol: string
  performance: number
  price: number
  source?: string
  as_of?: string
}

export type SectorPayload = {
  as_of: string
  source: string
  sectors: SectorPerformance[]
}

export type SentimentPayload = {
  score: number
  label: string
  fear_greed_index: number
  put_call_ratio: number
  vix: number
  advance_decline_ratio: number
  as_of: string
  source: string
}

export type Portfolio = {
  id: number
  name: string
  total_value: number
  daily_change: number
  holdings_count: number
}

export type Holding = {
  id: number
  symbol: string
  name: string
  shares: number
  avg_cost: number
  current_price: number
  value: number
  gain_loss: number
}

export type PortfolioAnalytics = {
  total_value: number
  daily_change: number
  total_gain_loss: number
  diversification_score: number
  risk_score: number
  asset_allocation: Array<{ sector: string; percentage: number }>
  performance_series: Array<{ date: string; value: number }>
  as_of: string
  source: string
}

export type AlertItem = {
  id: number
  symbol: string
  alert_type: string
  condition: string
  value: number
  is_active: boolean
  triggered: boolean
}

export type AIInsight = {
  symbol: string
  sentiment_score: number
  technical_rating: string
  risk_level: string
  summary: string
  key_insights: string[]
  related_stocks?: string[]
  data_points?: Array<{ label: string; value: string }>
  as_of?: string
  source?: string
}

export type CopilotResponse = {
  query: string
  answer: string
  data_points: Array<{ label: string; value: string }>
  related_stocks: string[]
  as_of: string
  source: string
}

export type BillingMe = {
  email: string
  plan: "free" | "pro" | "pro_plus"
  created_at?: string | null
}

export const StocksAPI = {
  quote: (symbol: string) =>
    apiRequest<Quote>(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`),
  history: (symbol: string, period: string) =>
    apiRequest<StockHistoryBar[]>(
      `/api/stocks/history?symbol=${encodeURIComponent(symbol)}&period=${encodeURIComponent(period)}`
    ),
  analysis: (symbol: string) =>
    apiRequest<AIInsight>(`/api/stocks/${encodeURIComponent(symbol)}/analysis`),
  search: (q: string) =>
    apiRequest<Array<{ symbol: string; name: string; exchange: string }>>(
      `/api/stocks/search?q=${encodeURIComponent(q)}`
    ),
  news: () => apiRequest<NewsItem[]>("/api/stocks/news"),
  signals: () => apiRequest<SignalItem[]>("/api/stocks/signals"),
}

export const MarketsAPI = {
  global: () => apiRequest<MarketsPayload>("/api/markets/global"),
  india: () => apiRequest<IndiaMarketPayload>("/api/markets/india"),
  indices: () => apiRequest<MarketIndex[]>("/api/markets/indices"),
  sectors: () => apiRequest<SectorPayload>("/api/markets/sectors"),
  sentiment: () => apiRequest<SentimentPayload>("/api/markets/sentiment"),
  watchlist: () => apiRequest<WatchlistPayload>("/api/markets/watchlist"),
}

export const PortfolioAPI = {
  list: () => apiRequest<Portfolio[]>("/api/portfolio"),
  create: (name: string, description?: string) =>
    apiRequest<{ id: number; name: string }>("/api/portfolio", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),
  holdings: (portfolioId: number) =>
    apiRequest<Holding[]>(`/api/portfolio/${portfolioId}/holdings`),
  addHolding: (portfolioId: number, payload: { symbol: string; shares: number; avg_cost: number }) =>
    apiRequest(`/api/portfolio/${portfolioId}/holdings`, {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        purchase_date: new Date().toISOString(),
      }),
    }),
  analytics: (portfolioId: number) =>
    apiRequest<PortfolioAnalytics>(`/api/portfolio/${portfolioId}/analytics`),
}

export const AlertsAPI = {
  list: () => apiRequest<AlertItem[]>("/api/alerts"),
  create: (payload: { symbol: string; alert_type: string; condition: string; value: number }) =>
    apiRequest("/api/alerts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  remove: (id: number) => apiRequest(`/api/alerts/${id}`, { method: "DELETE" }),
  triggered: () =>
    apiRequest<
      Array<{ id: number; symbol: string; message: string; triggered_at: string; source?: string; as_of?: string }>
    >("/api/alerts/triggered"),
}

export const InsightsAPI = {
  symbol: (symbol: string) => apiRequest<AIInsight>(`/api/insights/${encodeURIComponent(symbol)}`),
  brief: () =>
    apiRequest<{ date: string; summary: string; highlights: string[]; outlook: string; as_of: string; source: string }>(
      "/api/insights/market/brief"
    ),
  ask: (q: string) => apiRequest<CopilotResponse>(`/api/insights/query/ask?q=${encodeURIComponent(q)}`),
}

export const BillingAPI = {
  me: () => apiRequest<BillingMe>("/api/billing/me"),
}

// ─── Risk Engine ─────────────────────────────────────────────────────────────

export type RiskHolding = { symbol: string; weight: number }

export type RiskFactor = {
  level: string
  penalty: number
  tooltip: string
  why: string
}

export type RiskBreakdown = {
  concentration: RiskFactor
  sector_exposure: RiskFactor & { sector_weights: Record<string, number> }
  volatility: RiskFactor
}

export type RiskReport = {
  score: number
  risk_level: "low" | "medium" | "high"
  explanation: string
  issues: string[]
  suggestions: string[]
  breakdown: RiskBreakdown
  holdings_analyzed: Array<{ symbol: string; weight: number; sector: string }>
}

export const RiskAPI = {
  analyze: (holdings: RiskHolding[]) =>
    apiRequest<RiskReport>("/api/risk/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdings }),
    }),
}

// ─── Market Pulse ─────────────────────────────────────────────────────────────

export type PulseStockCard = {
  symbol: string
  name: string
  price: number
  change: number
  change_percent: number
  sector: string
  volume: number
  intensity: string
}

export type PulseSector = {
  sector: string
  performance: number
  direction: string
  intensity: string
  count: number
}

export type MarketPulse = {
  as_of: string | null
  source: string
  market_direction: "bullish" | "neutral" | "bearish"
  market_intensity: string
  narrative: string
  summary: string
  indices: {
    nifty: { name: string; value: number; change_percent: number; direction: string }
    banknifty: { name: string; value: number; change_percent: number; direction: string }
  }
  top_gainer: PulseStockCard | null
  top_loser: PulseStockCard | null
  notable_movers: PulseStockCard[]
  breadth: {
    advancing: number
    declining: number
    unchanged: number
    total: number
    advance_decline_ratio: number
  }
  sector_trend: string
  sectors: PulseSector[]
  strongest_sector: PulseSector | null
  weakest_sector: PulseSector | null
}

export const PulseAPI = {
  get: () => apiRequest<MarketPulse>("/api/pulse"),
}

// ─── Opportunity Finder ───────────────────────────────────────────────────────

export type OpportunityType = "momentum" | "dip" | "volume_breakout" | "consolidation"

export type Opportunity = {
  symbol: string
  name: string
  price: number
  change_percent: number
  sector: string
  type: OpportunityType
  reason: string
  confidence: "high" | "medium" | "low"
}

export type OpportunityReport = {
  opportunities: Opportunity[]
  summary: Record<OpportunityType | "total", number>
  as_of: string | null
  source: string
  note?: string
}

export const OpportunityAPI = {
  get: (types?: OpportunityType[]) => {
    const qs = types?.length ? `?types=${types.join("&types=")}` : ""
    return apiRequest<OpportunityReport>(`/api/opportunities${qs}`)
  },
}
