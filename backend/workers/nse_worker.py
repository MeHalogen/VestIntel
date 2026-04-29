"""
VestIntel — Standalone NSE Worker
==================================
Run this on your local machine or an Indian VPS where NSE is reachable.
It fetches NIFTY 50 + all-indices from NSE every 60 seconds, normalises
the payload, then writes it to Redis so the FastAPI backend never touches
NSE directly.

Usage
-----
    python backend/workers/nse_worker.py

    # Or with explicit Redis URL:
    REDIS_URL=redis://localhost:6379 python backend/workers/nse_worker.py

    # Or against Upstash (production):
    REDIS_URL=rediss://:<password>@<host>.upstash.io:6380 \
        python backend/workers/nse_worker.py

Environment variables
---------------------
REDIS_URL           Redis / Upstash connection string (default: redis://localhost:6379)
NSE_CYCLE_SECONDS   How often to poll NSE         (default: 60)
NSE_CACHE_TTL       Redis TTL for nse:market key  (default: 120)
NSE_MAX_RETRIES     Max retries per cycle         (default: 3)
NSE_RETRY_DELAY     Seconds between retries       (default: 5)

Redis keys written
------------------
nse:market          Full normalised payload (TTL = NSE_CACHE_TTL)
nse:india_overview  Same payload, alias key for /api/markets/india
nse:nifty50         List of NIFTY 50 constituents
nse:allindices      List of all NSE indices
stock:price:<SYM>   Per-symbol fast-path quote    (TTL = 60 s)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
import redis

# ---------------------------------------------------------------------------
# Logging setup (console-friendly for standalone use)
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("nse_worker")

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------

REDIS_URL        = os.getenv("REDIS_URL", "redis://localhost:6380")
CYCLE_SECONDS    = int(os.getenv("NSE_CYCLE_SECONDS", "60"))
CACHE_TTL        = int(os.getenv("NSE_CACHE_TTL", "120"))
QUOTE_TTL        = 60
MAX_RETRIES      = int(os.getenv("NSE_MAX_RETRIES", "3"))
RETRY_DELAY      = int(os.getenv("NSE_RETRY_DELAY", "5"))

# Redis keys (shared with FastAPI backend — do NOT rename without updating both)
KEY_MARKET         = "nse:market"
KEY_INDIA_OVERVIEW = "nse:india_overview"
KEY_NIFTY50        = "nse:nifty50"
KEY_ALL_INDICES    = "nse:allindices"
KEY_HEATMAP        = "nse:heatmap"            # legacy alias
KEY_HEATMAP_LEGACY = "market:india:heatmap"   # legacy alias 2

# ---------------------------------------------------------------------------
# NSE HTTP client
# ---------------------------------------------------------------------------

# Chrome-like headers — mandatory to pass NSE's anti-bot checks
_NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept":          "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer":         "https://www.nseindia.com/",
    "Origin":          "https://www.nseindia.com",
    "Connection":      "keep-alive",
    # NOTE: deliberately omitting Accept-Encoding to avoid Brotli responses
    # that httpx can't decode without the brotli package.
}

_NSE_NIFTY50_URL  = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050"
_NSE_INDICES_URL  = "https://www.nseindia.com/api/allIndices"
_NSE_HOMEPAGE_URL = "https://www.nseindia.com"


class NSESession:
    """
    Manages a persistent httpx session with NSE cookies.

    NSE requires at least one visit to the homepage before API calls
    will succeed — the homepage response sets cookies that the API
    endpoints validate.
    """

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None
        self._warmed = False

    async def _build_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            headers=_NSE_HEADERS,
            timeout=httpx.Timeout(20.0),
            follow_redirects=True,
        )

    async def warm(self) -> None:
        """Visit NSE homepage to get session cookies.
        NSE CDN sometimes returns 403 on first hit but still sets cookies —
        we treat any response (including 403) as a successful warm as long as
        we get cookies back.  Only a network-level error is fatal here.
        """
        if self._client is None:
            self._client = await self._build_client()
        try:
            resp = await self._client.get(_NSE_HOMEPAGE_URL)
            # 200 OR 403 — both set cookies.  Anything else is unexpected.
            if resp.status_code not in (200, 403, 301, 302):
                resp.raise_for_status()
            self._warmed = True
            logger.info("NSE session warmed (status=%d, cookies=%d)",
                        resp.status_code, len(self._client.cookies))
        except httpx.HTTPStatusError as exc:
            self._warmed = False
            logger.warning("NSE session warm HTTP error %d: %s", exc.response.status_code, exc)
            raise
        except Exception as exc:
            self._warmed = False
            logger.warning("NSE session warm network error: %s", exc)
            raise

    async def get(self, url: str) -> Any:
        """
        Make a GET request to an NSE API endpoint.
        Re-warms session if we get a 401 / 403 (cookie expired).
        Adds a small human-like delay before first API call after warm.
        """
        if self._client is None or not self._warmed:
            await self.warm()
            await asyncio.sleep(1.5)   # brief pause after homepage load

        for attempt in range(1, 4):
            try:
                resp = await self._client.get(url)
                if resp.status_code in (401, 403):
                    logger.warning(
                        "NSE returned %d on attempt %d — re-warming session",
                        resp.status_code, attempt,
                    )
                    await self.warm()
                    await asyncio.sleep(2.0 * attempt)   # back-off
                    continue
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError:
                raise
            except Exception as exc:
                if attempt == 3:
                    raise
                logger.debug("NSE request error (attempt %d): %s", attempt, exc)
                await asyncio.sleep(2.0)

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
            self._warmed = False


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------

_SECTOR_MAP = {
    "reliance": "Energy", "ongc": "Energy", "ntpc": "Energy", "powergrid": "Utilities",
    "tcs": "IT", "infosys": "IT", "infy": "IT", "wipro": "IT", "hcltech": "IT",
    "techm": "IT", "ltim": "IT", "ltimindtree": "IT",
    "hdfcbank": "Banking", "icicibank": "Banking", "sbin": "Banking",
    "axisbank": "Banking", "kotakbank": "Banking", "indusindbk": "Banking",
    "bajfinance": "Finance", "bajajfinsv": "Finance", "hdfclife": "Finance",
    "sbilife": "Finance",
    "maruti": "Auto", "tatamotors": "Auto", "m&m": "Auto", "bajaj-auto": "Auto",
    "heromotoco": "Auto",
    "sunpharma": "Pharma", "drreddy": "Pharma", "cipla": "Pharma", "divislab": "Pharma",
    "titan": "Consumer", "nestleind": "Consumer", "hindunilvr": "Consumer",
    "britannia": "Consumer", "dabur": "Consumer",
    "bhartiartl": "Telecom",
    "ultracemco": "Cement", "grasim": "Cement", "shreecem": "Cement",
    "tatasteel": "Metals", "jswsteel": "Metals", "hindalco": "Metals",
    "lt": "Infrastructure", "adaniports": "Infrastructure",
    "asianpaint": "Paints",
    "coalindia": "Mining",
}


def _sector_from_symbol(symbol: str) -> str:
    return _SECTOR_MAP.get(symbol.lower(), "Other")


def _heat(chg: float) -> str:
    a = abs(chg)
    if a >= 4: return "extreme"
    if a >= 2: return "strong"
    if a >= 1: return "moderate"
    return "weak"


def _parse_nifty50(raw: Dict) -> List[Dict]:
    """Parse NSE equity-stockIndices API response into normalised list."""
    stocks = []
    for item in raw.get("data", []):
        sym = (item.get("symbol") or "").strip().upper()
        if not sym or sym in ("NIFTY 50",):
            continue
        price     = float(item.get("lastPrice") or item.get("ltp") or 0.0)
        prev      = float(item.get("previousClose") or price)
        chg_pct   = float(item.get("pChange") or item.get("changePercent") or 0.0)
        chg_abs   = float(item.get("change") or (price - prev))
        volume    = int(item.get("totalTradedVolume") or item.get("volume") or 0)
        mkt_cap   = float(item.get("marketCap") or item.get("totalMarketCap") or 0.0)

        stocks.append({
            "symbol":         sym,
            "name":           (item.get("meta", {}) or {}).get("companyName") or sym,
            "price":          price,
            "change":         round(chg_abs, 2),
            "change_percent": round(chg_pct, 2),
            "pChange":        round(chg_pct, 2),      # legacy alias
            "volume":         volume,
            "market_cap":     mkt_cap,
            "marketCap":      mkt_cap,                # legacy alias
            "sector":         _sector_from_symbol(sym),
            "direction":      "up" if chg_pct >= 0 else "down",
            "intensity":      _heat(chg_pct),
        })
    return stocks


def _parse_indices(raw: Dict) -> List[Dict]:
    """Parse NSE allIndices API response into normalised list."""
    indices = []
    for item in raw.get("data", []):
        name = (item.get("index") or item.get("indexSymbol") or "").strip()
        if not name:
            continue
        price   = float(item.get("last") or item.get("previousClose") or 0.0)
        chg_pct = float(item.get("percentChange") or item.get("pChange") or 0.0)
        indices.append({
            "symbol":         name,
            "name":           name,
            "price":          price,
            "change_percent": round(chg_pct, 2),
            "advances":       int(item.get("advances") or 0),
            "declines":       int(item.get("declines") or 0),
        })
    return indices


def _build_payload(nifty50: List[Dict], indices: List[Dict]) -> Dict:
    """Combine parsed data into the full normalised payload."""

    # Sort by market cap (descending) for heatmap ordering
    nifty50_sorted = sorted(nifty50, key=lambda x: x["market_cap"], reverse=True)
    by_change = sorted(nifty50, key=lambda x: x["change_percent"], reverse=True)

    # Index lookup
    idx_map = {i["symbol"]: i for i in indices}

    def _idx(name: str) -> Dict:
        row = idx_map.get(name, {})
        return {
            "symbol":         name,
            "price":          float(row.get("price") or 0.0),
            "change_percent": float(row.get("change_percent") or 0.0),
            "advances":       int(row.get("advances") or 0),
            "declines":       int(row.get("declines") or 0),
        }

    nifty_row     = idx_map.get("NIFTY 50", {})
    banknifty_row = idx_map.get("NIFTY BANK", {})

    # Sector aggregation
    sector_totals: Dict[str, List[float]] = defaultdict(list)
    for c in nifty50:
        sector_totals[c.get("sector") or "Other"].append(c["change_percent"])
    sector_performance = sorted([
        {"sector": s, "performance": round(sum(v) / len(v), 2), "count": len(v)}
        for s, v in sector_totals.items()
    ], key=lambda x: x["sector"])

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "as_of":             now,
        "source":            "nse_worker",
        # Index snapshots
        "nifty": {
            "name":           "NIFTY 50",
            "value":          float(nifty_row.get("price") or 0.0),
            "change_percent": float(nifty_row.get("change_percent") or 0.0),
        },
        "banknifty": {
            "name":           "NIFTY BANK",
            "value":          float(banknifty_row.get("price") or 0.0),
            "change_percent": float(banknifty_row.get("change_percent") or 0.0),
        },
        # NIFTY 50 constituents
        "nifty50":           nifty50_sorted,
        "heatmap":           nifty50_sorted,     # legacy alias
        # Movers
        "top_gainers":       by_change[:10],
        "top_losers":        by_change[-10:][::-1],
        # Sector rollup
        "sector_performance": sector_performance,
        # Key indices
        "indices": [
            i for i in [
                _idx("NIFTY 50"),
                _idx("NIFTY BANK"),
                _idx("NIFTY IT"),
                _idx("NIFTY MIDCAP 100"),
                _idx("NIFTY FINANCIAL SERVICES"),
                _idx("INDIA VIX"),
            ] if i["price"] > 0
        ],
        "constituent_count": len(nifty50),
    }


# ---------------------------------------------------------------------------
# Redis helpers
# ---------------------------------------------------------------------------

def _redis_client() -> redis.Redis:
    """Synchronous redis-py client — used from async code via run_in_executor."""
    return redis.from_url(REDIS_URL, decode_responses=True)


_redis: Optional[redis.Redis] = None


def _get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = _redis_client()
    return _redis


def _write_to_redis(payload: Dict) -> None:
    """Write all keys synchronously (called via run_in_executor)."""
    r = _get_redis()
    serialised = json.dumps(payload)

    # Primary keys
    r.setex(KEY_MARKET,         CACHE_TTL, serialised)
    r.setex(KEY_INDIA_OVERVIEW, CACHE_TTL, serialised)
    r.setex(KEY_HEATMAP,        CACHE_TTL, serialised)
    r.setex(KEY_HEATMAP_LEGACY, CACHE_TTL, serialised)

    # Per-component keys (useful for endpoints that only need one piece)
    if payload.get("nifty50"):
        r.setex(KEY_NIFTY50, CACHE_TTL, json.dumps(payload["nifty50"]))
    if payload.get("indices"):
        r.setex(KEY_ALL_INDICES, CACHE_TTL, json.dumps(payload["indices"]))

    # Per-symbol fast-path  (individual quote lookups)
    now_ts = int(time.time())
    for stock in payload.get("nifty50") or []:
        sym = stock.get("symbol", "")
        if not sym:
            continue
        quote = {
            "symbol":         sym,
            "exchange":       "NSE",
            "currency":       "INR",
            "price":          stock["price"],
            "change":         stock["change"],
            "change_percent": stock["change_percent"],
            "volume":         stock["volume"],
            "timestamp":      now_ts,
            "source":         "nse_worker",
            "as_of":          payload["as_of"],
            "market_cap":     stock.get("market_cap"),
            "sector":         stock.get("sector"),
        }
        r.setex(f"stock:price:{sym}",     QUOTE_TTL, json.dumps(quote))
        r.setex(f"stock:price:{sym}.NS",  QUOTE_TTL, json.dumps(quote))  # .NS alias


# ---------------------------------------------------------------------------
# Core fetch-and-store logic
# ---------------------------------------------------------------------------

async def fetch_and_store(session: NSESession) -> None:
    """Single cycle: fetch NSE data → normalise → write to Redis."""

    logger.info("Fetching NIFTY 50 and indices from NSE…")

    # Parallel fetch
    nifty50_raw, indices_raw = await asyncio.gather(
        session.get(_NSE_NIFTY50_URL),
        session.get(_NSE_INDICES_URL),
    )

    nifty50  = _parse_nifty50(nifty50_raw)
    indices  = _parse_indices(indices_raw)
    payload  = _build_payload(nifty50, indices)

    if not nifty50:
        raise ValueError("NIFTY 50 parse returned 0 stocks — likely malformed response")

    # Write to Redis (sync call in thread pool to avoid blocking event loop)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _write_to_redis, payload)

    logger.info(
        "Redis updated — %d stocks | NIFTY 50: %.2f (%+.2f%%)",
        len(nifty50),
        payload["nifty"]["value"],
        payload["nifty"]["change_percent"],
    )


# ---------------------------------------------------------------------------
# Worker loop
# ---------------------------------------------------------------------------

async def run_worker() -> None:
    """
    Main worker loop.  Never crashes — all exceptions are caught and logged.
    Re-warms NSE session automatically on cookie expiry.
    """
    logger.info("NSE Worker starting (cycle=%ds, TTL=%ds, Redis=%s)",
                CYCLE_SECONDS, CACHE_TTL, REDIS_URL.split("@")[-1])

    session = NSESession()

    # Initial session warm
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            await session.warm()
            break
        except Exception as exc:
            logger.warning("Session warm attempt %d/%d failed: %s", attempt, MAX_RETRIES, exc)
            if attempt == MAX_RETRIES:
                logger.error("Could not warm NSE session after %d attempts — will retry in main loop", MAX_RETRIES)
            else:
                await asyncio.sleep(RETRY_DELAY)

    cycle = 0
    while True:
        cycle += 1
        t0 = time.monotonic()
        logger.info("─── Cycle %d ───", cycle)

        success = False
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                await fetch_and_store(session)
                success = True
                break
            except Exception as exc:
                logger.warning(
                    "Cycle %d attempt %d/%d failed: %s",
                    cycle, attempt, MAX_RETRIES, exc,
                )
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_DELAY)

        elapsed = time.monotonic() - t0
        if success:
            logger.info("Cycle %d done in %.2fs — sleeping %ds", cycle, elapsed, CYCLE_SECONDS)
        else:
            logger.error("Cycle %d FAILED all %d attempts — sleeping %ds before retry",
                         cycle, MAX_RETRIES, CYCLE_SECONDS)

        await asyncio.sleep(CYCLE_SECONDS)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        logger.info("NSE Worker stopped by user")
