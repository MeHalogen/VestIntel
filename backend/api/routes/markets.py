from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, List, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func

from core.cache import CacheService
from core.config import settings
from core.database import SessionLocal
from models.models import StockPrice
from services.market_data import MarketDataService
from api.deps.auth import require_user

logger = logging.getLogger("vestintel.markets")

router = APIRouter()
market_data_service = MarketDataService()

# Redis keys written by nse_worker.py — this file only READS them
_KEY_INDIA_OVERVIEW = "nse:india_overview"
_KEY_NIFTY50        = "nse:nifty50"
_KEY_ALL_INDICES    = "nse:allindices"
_KEY_HEATMAP        = "nse:heatmap"

GLOBAL_INDICES: List[Tuple[str, str, str]] = [
    ("^GSPC", "S&P 500", "US"),
    ("^IXIC", "Nasdaq", "US"),
    ("^DJI", "Dow Jones", "US"),
    ("^FTSE", "FTSE 100", "UK"),
    ("^GDAXI", "DAX", "DE"),
    ("^FCHI", "CAC 40", "FR"),
    ("^N225", "Nikkei 225", "JP"),
    ("^HSI", "Hang Seng", "HK"),
    ("000001.SS", "Shanghai Composite", "CN"),
]

INDIA_INDICES: List[Tuple[str, str, str]] = [
    ("^NSEI", "NIFTY 50", "IN"),
    ("^BSESN", "SENSEX", "IN"),
]

SECTOR_ETFS: List[Tuple[str, str]] = [
    ("XLK", "Technology"),
    ("XLV", "Healthcare"),
    ("XLF", "Finance"),
    ("XLE", "Energy"),
    ("XLY", "Consumer"),
    ("XLI", "Industrial"),
    ("XLB", "Materials"),
    ("XLU", "Utilities"),
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _index_cache_key(kind: str) -> str:
    return f"markets:{kind}"


async def _fetch_indices(symbols: List[Tuple[str, str, str]]) -> Dict:
    out = []
    for symbol, name, region in symbols:
        quote = await market_data_service.get_quote(symbol)
        if not quote:
            continue
        out.append(
            {
                "symbol": symbol,
                "name": name,
                "region": region,
                "value": float(quote.get("price", 0.0)),
                "change": float(quote.get("change", 0.0)),
                "change_percent": float(quote.get("change_percent", 0.0)),
                "source": quote.get("source") or "derived",
                "as_of": quote.get("as_of") or _now_iso(),
            }
        )
    return {"as_of": _now_iso(), "source": "market_data_service", "indices": out}


@router.get("/global")
async def get_global_markets():
    cache_key = _index_cache_key("global")
    cached = await CacheService.get(cache_key)
    if cached:
        return cached
    payload = await _fetch_indices(GLOBAL_INDICES)
    await CacheService.set(cache_key, payload, ttl=60)
    return payload


@router.get("/india")
async def get_india_markets(
    _: str = Depends(require_user),
):
    """
    India market overview — reads ONLY from Redis.
    Data is written by nse_worker.py running locally / on Indian VPS.
    API never calls NSE directly → zero blocking risk in cloud.
    """
    cached = await CacheService.get(_KEY_INDIA_OVERVIEW)
    if cached:
        return cached

    # Worker hasn't run yet or Redis is cold — return a clean warming-up state
    # rather than hitting NSE (which would block in cloud).
    logger.info("/api/markets/india: Redis cold — returning warming_up status")

    db = SessionLocal()
    try:
        latest_ts_subq = (
            db.query(StockPrice.symbol, func.max(StockPrice.timestamp).label("mx"))
            .group_by(StockPrice.symbol)
            .subquery()
        )
        rows = (
            db.query(StockPrice)
            .join(
                latest_ts_subq,
                (StockPrice.symbol == latest_ts_subq.c.symbol)
                & (StockPrice.timestamp == latest_ts_subq.c.mx),
            )
            .filter(StockPrice.symbol.notlike("%.%"))
            .limit(1500)
            .all()
        )
        if rows:
            heatmap = [
                {
                    "symbol":         r.symbol,
                    "price":          float(r.price),
                    "pChange":        0.0,
                    "change_percent": 0.0,
                    "change":         0.0,
                    "sector":         "Unknown",
                    "marketCap":      0.0,
                    "market_cap":     0.0,
                    "volume":         int(r.volume or 0),
                    "direction":      "up",
                    "intensity":      "weak",
                }
                for r in rows
            ]
            return {
                "as_of":              _now_iso(),
                "source":             "db-fallback",
                "status":             "stale",
                "message":            "Live data unavailable — showing last known prices. Start nse_worker.py for live data.",
                "nifty":              {"name": "NIFTY 50",   "value": 0.0, "change_percent": 0.0},
                "banknifty":          {"name": "NIFTY BANK", "value": 0.0, "change_percent": 0.0},
                "heatmap":            heatmap,
                "nifty50":            heatmap,
                "top_gainers":        [],
                "top_losers":         [],
                "sector_performance": [],
                "indices":            [],
                "constituent_count":  len(heatmap),
            }
    finally:
        db.close()

    # Absolutely cold — no Redis, no DB rows
    return {
        "as_of":              _now_iso(),
        "source":             "warming_up",
        "status":             "warming_up",
        "message":            "Market data is initializing. Start nse_worker.py to populate live data.",
        "nifty":              {"name": "NIFTY 50",   "value": 0.0, "change_percent": 0.0},
        "banknifty":          {"name": "NIFTY BANK", "value": 0.0, "change_percent": 0.0},
        "heatmap":            [],
        "nifty50":            [],
        "top_gainers":        [],
        "top_losers":         [],
        "sector_performance": [],
        "indices":            [],
        "constituent_count":  0,
    }


@router.get("/indices")
async def get_market_indices():
    cache_key = _index_cache_key("indices")
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    combined = GLOBAL_INDICES[:3] + INDIA_INDICES
    payload = (await _fetch_indices(combined)).get("indices", [])
    await CacheService.set(cache_key, payload, ttl=60)
    return payload


@router.get("/sectors")
async def get_sector_performance():
    cache_key = _index_cache_key("sectors")
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    sectors = []
    for sym, sector in SECTOR_ETFS:
        quote = await market_data_service.get_quote(sym)
        if not quote:
            continue
        sectors.append(
            {
                "sector": sector,
                "symbol": sym,
                "performance": float(quote.get("change_percent", 0.0)),
                "price": float(quote.get("price", 0.0)),
                "source": quote.get("source") or "derived",
                "as_of": quote.get("as_of") or _now_iso(),
            }
        )

    payload = {"as_of": _now_iso(), "source": "market_data_service", "sectors": sectors}
    await CacheService.set(cache_key, payload, ttl=60)
    return payload


@router.get("/sentiment")
async def get_market_sentiment():
    cache_key = _index_cache_key("sentiment")
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    spx = await market_data_service.get_quote("^GSPC") or {}
    ndx = await market_data_service.get_quote("^IXIC") or {}
    vix = await market_data_service.get_quote("^VIX") or {}

    spx_change = float(spx.get("change_percent", 0.0))
    ndx_change = float(ndx.get("change_percent", 0.0))
    vix_level = float(vix.get("price", 18.0))

    # Simple deterministic sentiment composition for MVP.
    score = 55 + (spx_change * 6) + (ndx_change * 4) - max(vix_level - 20, 0) * 1.5
    score = int(max(0, min(100, round(score))))
    label = "Bullish" if score >= 65 else "Neutral" if score >= 40 else "Bearish"

    payload = {
        "score": score,
        "label": label,
        "fear_greed_index": score,
        "put_call_ratio": round(max(0.4, min(1.6, 1.1 - (score - 50) / 120)), 2),
        "vix": round(vix_level, 2),
        "advance_decline_ratio": round(max(0.4, min(3.0, 0.9 + (score - 50) / 35)), 2),
        "as_of": _now_iso(),
        "source": "derived",
    }
    await CacheService.set(cache_key, payload, ttl=45)
    return payload


@router.get("/watchlist")
async def get_watchlist_quotes(_: str = Depends(require_user)):
    """Returns quotes for the configured ingest watchlist.

    This keeps the UI free of hardcoded/mock symbols.
    """
    items = []
    symbols = [s.strip().upper() for s in (settings.INGEST_WATCHLIST or "").split(",") if s.strip()]
    symbols = symbols[:25]
    for sym in symbols:
        q = await market_data_service.get_quote(sym)
        if not q:
            continue
        items.append(q)
    return {"items": items, "as_of": _now_iso(), "source": "market_data_service"}




# ---------------------------------------------------------------------------
# NSE endpoints — served from Redis only (populated by nse_worker.py)
# ---------------------------------------------------------------------------

@router.get("/nse/quote/{symbol}")
async def nse_quote(
    symbol: str,
    _: str = Depends(require_user),
):
    """
    NSE equity quote served from Redis.
    Written by nse_worker.py — API never calls NSE directly.
    """
    sym = symbol.upper().strip()
    # Try per-symbol key first (fast path written by worker)
    cached = await CacheService.get(f"stock:price:{sym}")
    if cached:
        return cached
    # Fall back to pulling from the full india overview payload
    overview = await CacheService.get(_KEY_INDIA_OVERVIEW)
    if overview:
        for stock in overview.get("nifty50") or []:
            if stock.get("symbol") == sym:
                return {
                    "symbol":         sym,
                    "price":          stock["price"],
                    "change":         stock.get("change", 0.0),
                    "change_percent": stock["change_percent"],
                    "volume":         stock.get("volume", 0),
                    "source":         "nse_worker",
                    "as_of":          overview.get("as_of"),
                }
    raise HTTPException(
        status_code=503,
        detail={
            "status":  "warming_up",
            "message": f"No cached data for {sym}. Ensure nse_worker.py is running.",
        },
    )


@router.get("/nse/nifty50")
async def nse_nifty50(_: str = Depends(require_user)):
    """NIFTY 50 constituent list — served from Redis (written by nse_worker.py)."""
    cached = await CacheService.get(_KEY_NIFTY50)
    if cached:
        return {"constituents": cached, "as_of": _now_iso(), "source": "nse_worker"}
    # Try extracting from full overview
    overview = await CacheService.get(_KEY_INDIA_OVERVIEW)
    if overview and overview.get("nifty50"):
        return {
            "constituents": overview["nifty50"],
            "as_of":        overview.get("as_of", _now_iso()),
            "source":       "nse_worker",
        }
    return {
        "constituents": [],
        "as_of":        _now_iso(),
        "source":       "warming_up",
        "message":      "Market data is initializing. Start nse_worker.py.",
    }


@router.get("/nse/indices")
async def nse_indices(_: str = Depends(require_user)):
    """All NSE indices — served from Redis (written by nse_worker.py)."""
    cached = await CacheService.get(_KEY_ALL_INDICES)
    if cached:
        return {"indices": cached, "as_of": _now_iso(), "source": "nse_worker"}
    overview = await CacheService.get(_KEY_INDIA_OVERVIEW)
    if overview and overview.get("indices"):
        return {
            "indices": overview["indices"],
            "as_of":   overview.get("as_of", _now_iso()),
            "source":  "nse_worker",
        }
    return {
        "indices": [],
        "as_of":   _now_iso(),
        "source":  "warming_up",
        "message": "Market data is initializing. Start nse_worker.py.",
    }


# ---------------------------------------------------------------------------
# India market overview  — optimized for heatmap / dashboard widgets

