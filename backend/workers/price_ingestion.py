from __future__ import annotations

import asyncio
import time
from typing import Iterable, List, Optional

from sqlalchemy.orm import Session

from core.cache import CacheService
from core.config import settings
from core.database import SessionLocal
from models.models import StockPrice
from providers.twelvedata import TwelveDataProvider


def _watchlist() -> List[str]:
    raw = settings.INGEST_WATCHLIST
    return [s.strip().upper() for s in raw.split(",") if s.strip()]


def _cache_key(symbol: str) -> str:
    return f"stock:price:{symbol.upper()}"


async def _fetch_quote(symbol: str) -> dict:
    # VestIntel is India-only — all symbols go through TwelveData (NSE)
    p = TwelveDataProvider(settings.TWELVEDATA_API_KEY)
    q = await p.fetch_quote(symbol)
    return {
        "symbol": q.symbol,
        "exchange": "NSE",
        "price": q.price,
        "change_percent": q.change_percent,
        "volume": q.volume,
        "timestamp": q.timestamp,
        "source": "twelvedata",
    }


async def ingest_once(symbols: Optional[Iterable[str]] = None) -> None:
    symbols_list = list(symbols) if symbols is not None else _watchlist()
    if not symbols_list:
        return

    # Batch quotes where possible (TwelveData supports comma-separated symbols)
    td_symbols = [s for s in symbols_list if s.endswith(".NS") or s.endswith(".NSE")]
    other_symbols = [s for s in symbols_list if s not in td_symbols]

    batched: dict[str, dict] = {}
    if td_symbols:
        try:
            td = TwelveDataProvider(settings.TWELVEDATA_API_KEY)
            quotes = await td.fetch_quotes_batch(td_symbols)
            for sym, q in quotes.items():
                batched[sym.upper()] = {
                    "symbol": q.symbol,
                    "exchange": "NSE",
                    "price": q.price,
                    "change_percent": q.change_percent,
                    "volume": q.volume,
                    "timestamp": q.timestamp,
                    "source": "twelvedata_batch",
                }
        except Exception as e:
            print(f"[price_ingestion] batch twelvedata failed: {e}")

    # Keep concurrency low so we don't spike API credits (especially on free tiers).
    sem = asyncio.Semaphore(2)

    async def one(sym: str) -> None:
        async with sem:
            # Small spacing for TwelveData symbols so we don't burst credits.
            if sym.upper().endswith(".NS") or sym.upper().endswith(".NSE"):
                await asyncio.sleep(0.3)
            payload = batched.get(sym.upper()) or await _fetch_quote(sym)

        # Store DB
        db: Session = SessionLocal()
        try:
            db.add(
                StockPrice(
                    symbol=payload["symbol"],
                    price=float(payload["price"]),
                    volume=payload.get("volume"),
                    timestamp=int(payload["timestamp"]),
                )
            )
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

        # Cache latest
        await CacheService.set(
            _cache_key(payload["symbol"]),
            {
                "symbol": payload["symbol"],
                "exchange": payload["exchange"],
                "price": payload["price"],
                "change_percent": payload["change_percent"],
                "volume": payload.get("volume"),
                "timestamp": payload["timestamp"],
            },
            ttl=settings.PRICE_CACHE_TTL_SECONDS,
        )

    await asyncio.gather(*(one(s) for s in symbols_list))


async def run_forever() -> None:
    while True:
        started = time.time()
        try:
            await ingest_once()
        except Exception as e:
            # Don’t crash the app; log and continue.
            print(f"[price_ingestion] error: {e}")

        elapsed = time.time() - started
        sleep_for = max(0.0, 60.0 - elapsed)
        await asyncio.sleep(sleep_for)
