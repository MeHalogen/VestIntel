from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException

from api.deps.auth import require_user
from api.deps.entitlements import get_user_and_plan, enforce_ai_quota, require_feature, log_endpoint
from core.cache import CacheService
from core.plans import Feature, PlanType
from schemas.schemas import AIInsight
from services.ai_service import AIService
from services.copilot_engine import handle_query as rule_engine_query
from services.copilot_engine import generate_key_insights
from services.market_data import MarketDataService

logger = logging.getLogger("vestintel.insights")

router = APIRouter()
ai_service = AIService()
market_data_service = MarketDataService()

# Symbols we always know about for mention-extraction
WATCHLIST = [
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "ICICIBANK",
    "WIPRO", "BHARTIARTL", "AXISBANK", "KOTAKBANK", "LT", "HINDUNILVR",
    "AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "GOOGL", "META",
]

AI_INSIGHT_TTL  = 120   # 2 minutes — per symbol AI insight
AI_COPILOT_TTL  = 120   # 2 minutes — per unique query
MARKET_BRIEF_TTL = 180  # 3 minutes — market brief


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _cache_key_insight(symbol: str) -> str:
    return f"ai:insight:{symbol.upper()}"


def _cache_key_copilot(query: str) -> str:
    digest = hashlib.md5(query.strip().lower().encode()).hexdigest()[:16]
    return f"ai:copilot:{digest}"


def _extract_symbols(text: str) -> List[str]:
    """Pull known tickers out of free-text query."""
    upper = text.upper()
    # Explicit ticker mentions (e.g. "TCS", "RELIANCE")
    found = [s for s in WATCHLIST if re.search(rf"\b{re.escape(s)}\b", upper)]
    return found or WATCHLIST[:3]   # default context if none mentioned


def _now_iso() -> str:
    """Return UTC timestamp as a clean ISO string (e.g. 2026-04-29T12:00:00Z)."""
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# GET /api/insights/{symbol}
# ---------------------------------------------------------------------------

@router.get("/{symbol}", response_model=AIInsight)
async def get_ai_insights(symbol: str, ctx=Depends(require_feature(Feature.ai_stock_analysis))):
    user, plan = ctx
    log_endpoint(user, plan, "insights.stock_analysis")
    sym = symbol.upper().strip()
    cache_key = _cache_key_insight(sym)

    # --- Cache read ---
    cached = await CacheService.get(cache_key)
    if cached:
        logger.debug("insight cache hit: %s", sym)
        return cached

    # --- Fetch live market data ---
    quote, history = None, []
    try:
        quote = await market_data_service.get_quote(sym)
        history = await market_data_service.get_history(sym, "1M") or []
    except Exception as exc:
        logger.warning("market data fetch failed for %s: %s", sym, exc)

    q = quote or {}

    # --- AI analysis ---
    result = await ai_service.analyze_stock(
        sym,
        quote=q,
        history=history,
        sector_performance=None,
    )

    price = float(q.get("price") or 0.0)
    chg   = float(q.get("change_percent") or 0.0)

    payload = {
        "symbol":           sym,
        "sentiment_score":  result["sentiment_score"],
        "technical_rating": result["technical_rating"],
        "risk_level":       result["risk_level"],
        "summary":          result["summary"],
        "key_insights":     result["key_insights"],
        "data_points":      result.get("data_points") or [
            {"label": "Price",  "value": f"{price:.2f}"},
            {"label": "Change", "value": f"{chg:+.2f}%"},
        ],
        "related_stocks": [s for s in WATCHLIST if s != sym][:5],
        "source":  result.get("source", "derived"),
        "as_of":   _now_iso(),
    }

    # --- Cache write ---
    try:
        await CacheService.set(cache_key, payload, ttl=AI_INSIGHT_TTL)
    except Exception as exc:
        logger.warning("insight cache write failed: %s", exc)

    return payload


# ---------------------------------------------------------------------------
# GET /api/insights/market/brief
# ---------------------------------------------------------------------------

@router.get("/market/brief")
async def get_market_brief(ctx=Depends(require_feature(Feature.ai_market_brief))):
    user, plan = ctx
    log_endpoint(user, plan, "insights.market_brief")
    cache_key = "ai:market_brief"
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    # Fetch live data for a handful of anchor symbols
    rows = []
    avg_change = 0.0
    for s in WATCHLIST[:5]:
        q = await market_data_service.get_quote(s)
        if not q:
            continue
        c = float(q.get("change_percent") or 0.0)
        avg_change += c
        rows.append({
            "symbol":         s,
            "change_percent": c,
            "price":          float(q.get("price") or 0.0),
        })

    avg_change /= max(len(rows), 1)

    brief = await ai_service.generate_market_brief()

    payload = {
        "date":       datetime.utcnow().strftime("%Y-%m-%d"),
        "summary":    brief.get("summary", ""),
        "highlights": brief.get("highlights") or [
            f"{r['symbol']} moved {r['change_percent']:+.2f}%" for r in rows[:3]
        ],
        "outlook":    brief.get("outlook", "Neutral"),
        "as_of":      _now_iso(),
        "source":     brief.get("source", "derived"),
    }

    try:
        await CacheService.set(cache_key, payload, ttl=MARKET_BRIEF_TTL)
    except Exception as exc:
        logger.warning("market brief cache write failed: %s", exc)

    return payload


# ---------------------------------------------------------------------------
# GET /api/insights/query/key-insights  (public — no auth required)
# ---------------------------------------------------------------------------

@router.get("/query/key-insights")
async def get_key_insights():
    """
    Auto-generated pre-emptive insights for page-load display.
    No user query needed. Cached 60s. No auth required.
    """
    cache_key = "ai:key_insights"
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    market_data: dict = await CacheService.get("nse:market") or {}
    result = generate_key_insights(market_data)

    payload = {
        "insights": result.get("insights", []),
        "as_of":    _now_iso(),
        "source":   result.get("source", "nse_worker"),
    }

    try:
        await CacheService.set(cache_key, payload, ttl=60)
    except Exception as exc:
        logger.warning("key_insights cache write failed: %s", exc)

    return payload


# ---------------------------------------------------------------------------
# GET /api/insights/query/ask?q=
# ---------------------------------------------------------------------------

@router.get("/query/ask")
async def ask_copilot(
    q: str = Query(..., min_length=3),
    ctx=Depends(require_feature(Feature.ai_copilot)),
):
    user, plan = ctx
    log_endpoint(user, plan, "insights.copilot")
    await enforce_ai_quota(user.id, plan)

    # --- Cache (keyed on normalised query) ---
    cache_key = _cache_key_copilot(q)
    cached = await CacheService.get(cache_key)
    if cached:
        logger.debug("copilot cache hit: %s", q[:60])
        return cached

    # --- Load NSE market data from Redis (written by nse_worker) ---
    market_data: dict = await CacheService.get("nse:market") or {}

    # --- Rule-based engine — deterministic, <5ms, no external calls ---
    result = rule_engine_query(q, market_data)

    payload = {
        "query":          q,
        "answer":         result.get("answer", ""),
        "confidence":     result.get("confidence", "LOW"),
        "context":        result.get("context", []),
        "suggestions":    result.get("suggestions", []),
        "breadth":               result.get("breadth", {}),
        "relative_performance":  result.get("relative_performance", None),
        "data_points":    result.get("data_points", []),
        "related_stocks": result.get("related_stocks", []),
        "as_of":          _now_iso(),
        "source":         result.get("source", "rule_engine"),
    }

    # Cache for 60s — data is live, no need to hold longer
    try:
        await CacheService.set(cache_key, payload, ttl=60)
    except Exception as exc:
        logger.warning("copilot cache write failed: %s", exc)

    return payload
