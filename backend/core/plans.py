from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Optional, Set


class PlanType(str, Enum):
    free = "free"
    pro = "pro"
    pro_plus = "pro_plus"


class Feature(str, Enum):
    # Baseline market exploration (must remain free)
    market_data_delayed = "market_data_delayed"  # free: delayed, paid: realtime
    charts_basic = "charts_basic"
    market_heatmap = "market_heatmap"
    sectors_dashboard = "sectors_dashboard"
    news_feed = "news_feed"
    signals_basic = "signals_basic"
    stock_search_basic = "stock_search_basic"

    # Monetized: AI + advanced analytics
    ai_market_brief = "ai_market_brief"  # free: limited
    ai_stock_analysis = "ai_stock_analysis"
    ai_copilot = "ai_copilot"
    news_sentiment = "news_sentiment"
    advanced_indicators = "advanced_indicators"
    custom_alerts = "custom_alerts"
    momentum_screener = "momentum_screener"

    # Pro+ only
    institutional_flow = "institutional_flow"
    ai_forecasts = "ai_forecasts"
    custom_screeners = "custom_screeners"
    backtesting = "backtesting"
    advanced_portfolio_analytics = "advanced_portfolio_analytics"
    sector_rotation_intel = "sector_rotation_intel"
    market_sentiment_dashboard = "market_sentiment_dashboard"
    api_access = "api_access"


@dataclass(frozen=True)
class PlanLimits:
    watchlist_symbols: Optional[int]
    portfolios: Optional[int]
    ai_queries_per_day: Optional[int]
    market_data_delay_seconds: int


PLAN_LIMITS: Dict[PlanType, PlanLimits] = {
    # MVP: generous free limits — gather usage data, don't block users.
    PlanType.free: PlanLimits(
        watchlist_symbols=None,          # unlimited for MVP
        portfolios=None,                 # unlimited for MVP
        ai_queries_per_day=100,          # high limit; lower when monetizing
        market_data_delay_seconds=0,     # real-time for MVP
    ),
    PlanType.pro: PlanLimits(
        watchlist_symbols=None,
        portfolios=None,
        ai_queries_per_day=200,
        market_data_delay_seconds=0,
    ),
    PlanType.pro_plus: PlanLimits(
        watchlist_symbols=None,
        portfolios=None,
        ai_queries_per_day=None,         # unlimited
        market_data_delay_seconds=0,
    ),
}


# ---------------------------------------------------------------------------
# MVP PHASE: All features enabled for ALL plans.
# To gate a feature in future, move it out of PlanType.free set only.
# Example: remove Feature.ai_copilot from free → free users see upgrade wall.
# Zero code changes elsewhere needed.
# ---------------------------------------------------------------------------
_ALL_FEATURES: Set[Feature] = set(Feature)

PLAN_FEATURES: Dict[PlanType, Set[Feature]] = {
    # MVP: free users get everything — keeps launch simple, usage data accumulates.
    PlanType.free: _ALL_FEATURES,

    # Pro: same as free for now; differentiated by limits (quota, delay).
    PlanType.pro: _ALL_FEATURES,

    # Pro+: full access, no limits.
    PlanType.pro_plus: _ALL_FEATURES,
}


def normalize_plan(value: str | None) -> PlanType:
    v = (value or "free").strip().lower()
    if v in {"pro+", "pro_plus", "proplus"}:
        return PlanType.pro_plus
    if v in {"pro"}:
        return PlanType.pro
    return PlanType.free
