"""
NSE Heatmap Ingestion Worker
============================
Runs every 60 seconds.  Uses NSEClient (session-cookie-aware, retry-safe)
to pull the full NIFTY 50 list + all-indices in a single asyncio gather.

Redis output
------------
key : nse:heatmap           TTL : 120 s
key : market:india:heatmap  TTL : 120 s  (legacy compat)
key : stock:price:<SYM>     TTL :  60 s  (per-symbol fast-path)

Payload shape
-------------
{
  "as_of": "2026-04-29T10:30:00Z",
  "source": "nse",
  "heatmap": [
    {
      "symbol": "RELIANCE",
      "name": "Reliance Industries Limited",
      "price": 2450.5,
      "change_percent": 1.2,
      "pChange": 1.2,          # legacy alias
      "volume": 1234567,
      "market_cap": 0.0,
      "marketCap": 0.0,        # legacy alias
      "sector": "Energy",
      "direction": "up" | "down",
      "intensity": "extreme" | "strong" | "moderate" | "weak"
    }, ...
  ],
  "top_gainers": [...],  # top 10 by change_percent
  "top_losers": [...],   # worst 10 by change_percent
  "sector_performance": [{"sector": ..., "performance": ..., "count": ...}],
  "nifty": {"name": "NIFTY 50", "value": 23995.7, "change_percent": -0.4},
  "banknifty": {"name": "NIFTY BANK", "value": 55400.0, "change_percent": -1.5},
  "indices": [...]
}
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List

from core.cache import CacheService
from core.database import SessionLocal
from models.models import Stock, StockPrice
from providers.nse import NSEClient

logger = logging.getLogger("vestintel.workers.nse")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

HEATMAP_CACHE_KEY = "market:india:heatmap"   # legacy key (existing widgets)
NSE_HEATMAP_KEY   = "nse:heatmap"            # new primary key
INDIA_OVERVIEW_KEY = "nse:india_overview"    # key used by /api/markets/india

CYCLE_SECONDS = 60   # how often to run
CACHE_TTL     = 120  # Redis TTL for heatmap payloads
QUOTE_TTL     = 60   # Redis TTL for per-symbol prices


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat() + "Z"


def _now_ts() -> int:
    return int(time.time())


def _heat(chg: float) -> str:
    """Colour-intensity bucket for frontend treemap."""
    a = abs(chg)
    if a >= 4: return "extreme"
    if a >= 2: return "strong"
    if a >= 1: return "moderate"
    return "weak"


def _sector_from_name(name: str) -> str:
    """Guess sector from company name when NSE doesn't supply one."""
    n = (name or "").upper()
    if any(x in n for x in ("BANK", "FINANCE", "FINANCIAL", "NBFC")):   return "Banking & Finance"
    if any(x in n for x in ("TECH", "INFOSY", "WIPRO", "HCL", "TCS")):  return "IT"
    if any(x in n for x in ("PHARMA", "LAB", "HEALTH", "CIPLA", "DR.REDDY")): return "Pharma"
    if any(x in n for x in ("MOTOR", "AUTO", "MAHIND", "MARUTI", "HERO")): return "Auto"
    if any(x in n for x in ("ENERGY", "OIL", "GAS", "PETRO", "RELIANCE")): return "Energy"
    if any(x in n for x in ("CEMENT", "STEEL", "METAL", "JSPL", "TATA")): return "Materials"
    if any(x in n for x in ("FMCG", "CONSUMER", "NESTLE", "HUL", "BRIT")): return "FMCG"
    return "Unknown"


def _compute_sector_performance(stocks: List[Dict]) -> List[Dict]:
    bucket: Dict[str, List[float]] = defaultdict(list)
    for s in stocks:
        bucket[s.get("sector") or "Unknown"].append(float(s.get("change_percent") or 0.0))
    return sorted(
        [{"sector": k, "performance": round(sum(v) / len(v), 2), "count": len(v)} for k, v in bucket.items()],
        key=lambda x: x["performance"],
        reverse=True,
    )


def _persist_to_db(stocks: List[Dict]) -> None:
    """Write latest prices to Postgres (best-effort, never raises)."""
    ts = _now_ts()
    db = SessionLocal()
    try:
        for s in stocks:
            sym = s["symbol"]
            if not db.query(Stock).filter(Stock.symbol == sym).first():
                db.add(Stock(symbol=sym, exchange="NSE", company_name=s.get("name") or s.get("sector")))
            db.add(StockPrice(symbol=sym, price=float(s["price"]), volume=s.get("volume"), timestamp=ts))
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("DB write failed: %s", exc)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Core ingestion logic
# ---------------------------------------------------------------------------

async def ingest_once(client: NSEClient) -> Dict[str, Any]:
    """
    Fetch NIFTY 50 constituents + all-indices in parallel.
    Returns the full heatmap payload dict.
    Raises on unrecoverable failure (caller logs and continues the loop).
    """
    logger.info("NSE ingestion cycle starting")
    t0 = time.monotonic()

    # Two API calls in parallel: constituents list + index headlines
    constituents_raw, all_indices_raw = await asyncio.gather(
        client.get_nifty50(),
        client.get_indices(),
    )

    now_iso = _now_iso()
    ts      = _now_ts()

    # --- Build enriched stock list ---
    stocks: List[Dict[str, Any]] = []
    for c in constituents_raw:
        chg  = float(c.get("change_percent") or 0.0)
        name = c.get("name") or c["symbol"]
        sector = c.get("sector") or _sector_from_name(name)
        stocks.append({
            "symbol":         c["symbol"],
            "name":           name,
            "price":          float(c.get("price") or 0.0),
            "change_percent": chg,
            "pChange":        chg,                              # legacy alias
            "volume":         int(c.get("volume") or 0),
            "market_cap":     float(c.get("market_cap") or 0.0),
            "marketCap":      float(c.get("market_cap") or 0.0),  # legacy alias
            "sector":         sector,
            "direction":      "up" if chg >= 0 else "down",
            "intensity":      _heat(chg),
            "as_of":          now_iso,
        })

    # Sort heatmap by market_cap desc for treemap rendering
    stocks.sort(key=lambda x: x["market_cap"], reverse=True)

    sorted_by_chg  = sorted(stocks, key=lambda x: x["change_percent"], reverse=True)
    top_gainers    = sorted_by_chg[:10]
    top_losers     = sorted_by_chg[-10:][::-1]

    # --- Index summary ---
    idx_map = {i["symbol"]: i for i in all_indices_raw}

    def _idx_row(name: str) -> Dict[str, Any]:
        row = idx_map.get(name, {})
        return {
            "name":           name,
            "value":          float(row.get("price") or 0.0),
            "change_percent": float(row.get("change_percent") or 0.0),
            "advances":       int(row.get("advances") or 0),
            "declines":       int(row.get("declines") or 0),
        }

    nifty_row    = _idx_row("NIFTY 50")
    banknifty_row= _idx_row("NIFTY BANK")

    indices_list = [
        {
            "symbol":         "^NSEI",
            "name":           "NIFTY 50",
            "region":         "IN",
            "value":          nifty_row["value"],
            "change":         0.0,
            "change_percent": nifty_row["change_percent"],
            "source":         "nse",
            "as_of":          now_iso,
        },
        {
            "symbol":         "^NSEBANK",
            "name":           "NIFTY BANK",
            "region":         "IN",
            "value":          banknifty_row["value"],
            "change":         0.0,
            "change_percent": banknifty_row["change_percent"],
            "source":         "nse",
            "as_of":          now_iso,
        },
    ]

    sector_perf = _compute_sector_performance(stocks)

    payload: Dict[str, Any] = {
        "as_of":              now_iso,
        "source":             "nse",
        "heatmap":            stocks,
        "top_gainers":        top_gainers,
        "top_losers":         top_losers,
        "sector_performance": sector_perf,
        "nifty":              {"name": "NIFTY 50",   **{k: nifty_row[k]     for k in ("value", "change_percent")}},
        "banknifty":          {"name": "NIFTY BANK", **{k: banknifty_row[k] for k in ("value", "change_percent")}},
        "indices":            indices_list,
        # new fields used by /api/markets/india
        "nifty50":            stocks,
        "constituent_count":  len(stocks),
    }

    # --- Persist ---
    # Redis: heatmap (two keys for compat)
    await asyncio.gather(
        CacheService.set(NSE_HEATMAP_KEY,    payload, ttl=CACHE_TTL),
        CacheService.set(HEATMAP_CACHE_KEY,  payload, ttl=CACHE_TTL),
        CacheService.set(INDIA_OVERVIEW_KEY, payload, ttl=CACHE_TTL),
    )

    # Redis: per-symbol fast-path
    for s in stocks:
        await CacheService.set(
            f"stock:price:{s['symbol']}",
            {
                "symbol":         s["symbol"],
                "exchange":       "NSE",
                "price":          s["price"],
                "change_percent": s["change_percent"],
                "volume":         s["volume"],
                "market_cap":     s["market_cap"],
                "sector":         s["sector"],
                "source":         "nse_worker",
                "timestamp":      ts,
                "as_of":          now_iso,
                "currency":       "INR",
            },
            ttl=QUOTE_TTL,
        )
        # Also write under the dotted key so .NS lookups hit cache
        await CacheService.set(
            f"stock:price:{s['symbol']}.NS",
            {"symbol": s["symbol"], "exchange": "NSE", "price": s["price"],
             "change_percent": s["change_percent"], "volume": s["volume"],
             "source": "nse_worker", "timestamp": ts, "as_of": now_iso, "currency": "INR"},
            ttl=QUOTE_TTL,
        )

    # Postgres (fire-and-forget thread — doesn't block the event loop)
    import concurrent.futures
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        await loop.run_in_executor(pool, _persist_to_db, stocks)

    elapsed = time.monotonic() - t0
    logger.info(
        "NSE ingestion done in %.2fs — %d stocks | top gainer %s +%.2f%% | top loser %s %.2f%%",
        elapsed,
        len(stocks),
        top_gainers[0]["symbol"] if top_gainers else "-",
        top_gainers[0]["change_percent"] if top_gainers else 0.0,
        top_losers[0]["symbol"] if top_losers else "-",
        top_losers[0]["change_percent"] if top_losers else 0.0,
    )
    return payload


# ---------------------------------------------------------------------------
# Long-running loop
# ---------------------------------------------------------------------------

async def run_forever() -> None:
    """
    Async loop that calls ingest_once() every CYCLE_SECONDS.
    Never raises — all exceptions are caught and logged so the worker
    stays alive across transient NSE 403s, network blips, DB outages, etc.
    """
    logger.info("NSE heatmap worker starting (interval=%ds)", CYCLE_SECONDS)
    client = NSEClient()

    # Warm session on startup so the first cycle is fast
    try:
        await client._warm_session()
    except Exception as exc:
        logger.warning("NSE session warm-up failed at startup: %s", exc)

    while True:
        cycle_start = time.monotonic()
        try:
            await ingest_once(client)
        except Exception as exc:
            logger.error("NSE ingestion cycle failed: %s — will retry in %ds", exc, CYCLE_SECONDS)

        elapsed  = time.monotonic() - cycle_start
        sleep_for = max(0.0, CYCLE_SECONDS - elapsed)
        logger.debug("NSE worker sleeping %.1fs", sleep_for)
        await asyncio.sleep(sleep_for)

