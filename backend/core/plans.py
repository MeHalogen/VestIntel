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
    PlanType.free: PlanLimits(
        watchlist_symbols=10,
        portfolios=1,
        ai_queries_per_day=5,
        market_data_delay_seconds=300,
    ),
    PlanType.pro: PlanLimits(
        watchlist_symbols=None,
        portfolios=None,
        ai_queries_per_day=50,
        market_data_delay_seconds=0,
    ),
    PlanType.pro_plus: PlanLimits(
        watchlist_symbols=None,
        portfolios=None,
        ai_queries_per_day=None,
        market_data_delay_seconds=0,
    ),
}


PLAN_FEATURES: Dict[PlanType, Set[Feature]] = {
    PlanType.free: {
        Feature.market_data_delayed,
        Feature.charts_basic,
        Feature.market_heatmap,
        Feature.sectors_dashboard,
        Feature.news_feed,
        Feature.signals_basic,
        Feature.stock_search_basic,
        Feature.ai_market_brief,
    },
    PlanType.pro: {
        # everything in free, plus
        Feature.market_data_delayed,  # delay=0 if pro
        Feature.charts_basic,
        Feature.market_heatmap,
        Feature.sectors_dashboard,
        Feature.news_feed,
        Feature.signals_basic,
        Feature.stock_search_basic,
        Feature.ai_market_brief,
        Feature.ai_stock_analysis,
        Feature.ai_copilot,
        Feature.news_sentiment,
        Feature.advanced_indicators,
        Feature.custom_alerts,
        Feature.momentum_screener,
    },
    PlanType.pro_plus: {
        # everything
        *set(Feature),
    },
}


def normalize_plan(value: str | None) -> PlanType:
    v = (value or "free").strip().lower()
    if v in {"pro+", "pro_plus", "proplus"}:
        return PlanType.pro_plus
    if v in {"pro"}:
        return PlanType.pro
    return PlanType.free
