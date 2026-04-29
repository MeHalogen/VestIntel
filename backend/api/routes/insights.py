from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException

from api.deps.auth import require_user
from api.deps.entitlements import get_user_and_plan, enforce_ai_quota
from core.cache import CacheService
from core.plans import PlanType
from schemas.schemas import AIInsight
from services.ai_service import AIService
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
async def get_ai_insights(symbol: str, _: str = Depends(require_user)):
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
async def get_market_brief(_: str = Depends(require_user)):
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
# GET /api/insights/query/ask?q=
# ---------------------------------------------------------------------------

@router.get("/query/ask")
async def ask_copilot(
    q: str = Query(..., min_length=3),
    ctx=Depends(get_user_and_plan),
):
    user, plan = ctx
    if plan == PlanType.free:
        raise HTTPException(
            status_code=403,
            detail="This feature is available in VestIntel Pro.",
        )

    await enforce_ai_quota(user.id, plan)

    # --- Cache read (keyed on normalised query text) ---
    cache_key = _cache_key_copilot(q)
    cached = await CacheService.get(cache_key)
    if cached:
        logger.debug("copilot cache hit for query: %s", q[:60])
        return cached

    # --- Extract mentioned symbols & fetch live quotes ---
    symbols = _extract_symbols(q)
    context_quotes: dict = {}
    data_points: List[dict] = []

    for sym in symbols[:5]:
        try:
            quote = await market_data_service.get_quote(sym)
        except Exception:
            quote = None
        if not quote:
            continue
        price = float(quote.get("price") or 0.0)
        chg   = float(quote.get("change_percent") or 0.0)
        vol   = quote.get("volume")
        context_quotes[sym] = {
            "price":          price,
            "change_percent": chg,
            "volume":         vol,
            "source":         quote.get("source"),
        }
        data_points.append({
            "label": sym,
            "value": f"₹{price:.2f} ({chg:+.2f}%)",
        })

    # --- Call AIService.copilot_query() ---
    result = await ai_service.copilot_query(
        q,
        context_data={
            "query":         q,
            "quotes":        context_quotes,
            "symbols_found": symbols,
        },
    )

    payload = {
        "query":          q,
        "answer":         result.get("answer", ""),
        "data_points":    result.get("data_points") or data_points,
        "related_stocks": result.get("related_stocks") or symbols[:5],
        "as_of":          _now_iso(),
        "source":         result.get("source", "derived"),
    }

    # --- Cache write ---
    try:
        await CacheService.set(cache_key, payload, ttl=AI_COPILOT_TTL)
    except Exception as exc:
        logger.warning("copilot cache write failed: %s", exc)

    return payload
