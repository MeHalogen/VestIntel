from __future__ import annotations

import asyncio
import json
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol, Tuple

import httpx

from core.cache import CacheService
from core.config import settings


class Exchange(str, Enum):
    US = "US"
    NSE = "NSE"
    BSE = "BSE"


@dataclass(frozen=True)
class NormalizedSymbol:
    raw: str
    base: str
    exchange: Exchange
    provider_symbol: str


@dataclass(frozen=True)
class Quote:
    symbol: str
    exchange: str
    price: float
    change: float
    change_percent: float
    currency: str = "USD"
    as_of: str = ""
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    source: str = ""


@dataclass(frozen=True)
class Bar:
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: Optional[int] = None


class ProviderAdapter(Protocol):
    name: str

    async def fetch_quote(self, symbol: NormalizedSymbol) -> Quote:
        ...

    async def fetch_history(self, symbol: NormalizedSymbol, period: str) -> List[Bar]:
        ...

    async def search(self, query: str) -> List[Dict[str, str]]:
        ...


class ProviderError(RuntimeError):
    pass


def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _parse_period(period: str) -> int:
    period = (period or "").upper().strip()
    if period in {"1D", "D"}:
        return 1
    if period in {"5D"}:
        return 5
    if period in {"1M", "M"}:
        return 30
    if period in {"3M"}:
        return 90
    if period in {"6M"}:
        return 180
    if period in {"1Y", "Y"}:
        return 365
    return 30


def normalize_symbol(raw: str) -> NormalizedSymbol:
    raw = (raw or "").strip()
    if not raw:
        raise ValueError("symbol is required")

    upper = raw.upper()
    exchange = Exchange.US
    base = upper

    # Common patterns:
    # - AAPL (US)
    # - RELIANCE.NS / RELIANCE.NSE (NSE)
    # - TCS.BO / TCS.BSE (BSE)
    if "." in upper:
        base, suffix = upper.split(".", 1)
        suffix = suffix.strip()
        if suffix in {"NS", "NSE"}:
            exchange = Exchange.NSE
        elif suffix in {"BO", "BSE"}:
            exchange = Exchange.BSE
        else:
            exchange = Exchange.US

    provider_symbol = base
    if exchange == Exchange.NSE:
        provider_symbol = f"{base}.NS"
    elif exchange == Exchange.BSE:
        provider_symbol = f"{base}.BO"

    return NormalizedSymbol(raw=raw, base=base, exchange=exchange, provider_symbol=provider_symbol)


class MockProvider:
    name = "mock"

    async def fetch_quote(self, symbol: NormalizedSymbol) -> Quote:
        # Deterministic-ish mock by symbol hash for stable UI.
        seed = sum(ord(c) for c in symbol.base)
        price = 50.0 + (seed % 200) + ((seed % 100) / 100)
        change = ((seed % 200) - 100) / 50
        change_percent = (change / max(price - change, 1)) * 100
        currency = "INR" if symbol.exchange in {Exchange.NSE, Exchange.BSE} else "USD"
        return Quote(
            symbol=symbol.base,
            exchange=symbol.exchange.value,
            price=round(price, 2),
            change=round(change, 2),
            change_percent=round(change_percent, 2),
            currency=currency,
            as_of=_now_iso(),
            volume=10_000_000 + (seed % 3_000_000),
            market_cap=float(1e11 + (seed % 200) * 1e9),
            pe_ratio=round(10 + (seed % 30) / 1.7, 2),
            source=self.name,
        )

    async def fetch_history(self, symbol: NormalizedSymbol, period: str) -> List[Bar]:
        days = _parse_period(period)
        seed = sum(ord(c) for c in symbol.base)
        base_price = 50.0 + (seed % 200)
        out: List[Bar] = []
        for i in range(days):
            d = (date.today() - timedelta(days=(days - 1 - i)))
            drift = ((seed % 17) - 8) * 0.03
            noise = (((seed + i) % 19) - 9) * 0.12
            close = base_price + drift * i + noise
            open_ = close - (((seed + i) % 7) - 3) * 0.08
            high = max(open_, close) + (((seed + i) % 5) + 1) * 0.12
            low = min(open_, close) - (((seed + i) % 5) + 1) * 0.12
            out.append(
                Bar(
                    date=d.isoformat(),
                    open=round(open_, 2),
                    high=round(high, 2),
                    low=round(low, 2),
                    close=round(close, 2),
                    volume=1_000_000 + ((seed + i) % 900_000),
                )
            )
        return out

    async def search(self, query: str) -> List[Dict[str, str]]:
        q = (query or "").strip().upper()
        if not q:
            return []
        # Tiny mock list; real provider adapters can override.
        universe = [
            {"symbol": "AAPL", "name": "Apple Inc", "exchange": "US"},
            {"symbol": "MSFT", "name": "Microsoft Corporation", "exchange": "US"},
            {"symbol": "GOOGL", "name": "Alphabet Inc", "exchange": "US"},
            {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "exchange": "NSE"},
            {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "exchange": "NSE"},
        ]
        return [u for u in universe if q in u["symbol"] or q in u["name"].upper()]


class FinnhubProvider:
    name = "finnhub"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def fetch_quote(self, symbol: NormalizedSymbol) -> Quote:
        if not self.api_key:
            raise ProviderError("FINNHUB_API_KEY not configured")

        # Finnhub doesn't support NSE/BSE without special coverage; we keep US-only here.
        if symbol.exchange != Exchange.US:
            raise ProviderError(f"finnhub unsupported exchange: {symbol.exchange}")

        url = "https://finnhub.io/api/v1/quote"
        params = {"symbol": symbol.base, "token": self.api_key}
        timeout = httpx.Timeout(5.0, connect=2.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()

        # Finnhub can return zeroed payloads for unsupported symbols/coverage.
        # Treat this as provider failure so fallback adapters can take over.
        c = float(data.get("c") or 0.0)
        d = float(data.get("d") or 0.0)
        dp = float(data.get("dp") or 0.0)
        if c <= 0.0 and d == 0.0 and dp == 0.0:
            raise ProviderError(f"finnhub returned empty quote for {symbol.base}")
        # Finnhub: c=current, d=change, dp=percent, t=timestamp
        as_of = _now_iso()
        if isinstance(data.get("t"), (int, float)) and data.get("t"):
            as_of = datetime.utcfromtimestamp(data["t"]).replace(microsecond=0).isoformat() + "Z"
        return Quote(
            symbol=symbol.base,
            exchange=symbol.exchange.value,
            price=c,
            change=d,
            change_percent=dp,
            currency="USD",
            as_of=as_of,
            source=self.name,
        )

    async def fetch_history(self, symbol: NormalizedSymbol, period: str) -> List[Bar]:
        raise ProviderError("finnhub history not implemented")

    async def search(self, query: str) -> List[Dict[str, str]]:
        raise ProviderError("finnhub search not implemented")


class MarketDataService:
    """Fetch → normalize → cache → fail over across providers.

    Design goals:
    - Fast: cache-first (Redis)
    - Resilient: provider fallbacks
    - Deterministic local dev: mock provider always available
    """

    def __init__(self):
        adapters: List[ProviderAdapter] = []
        if settings.FINNHUB_API_KEY:
            adapters.append(FinnhubProvider(settings.FINNHUB_API_KEY))
        self.adapters = adapters

        # Fine-grained TTLs (seconds)
        self.quote_ttl = 15
        self.history_ttl = 60 * 5
        self.search_ttl = 60 * 10

    def _cache_key_quote(self, ns: NormalizedSymbol) -> str:
        return f"md:quote:{ns.exchange.value}:{ns.base}"

    def _cache_key_history(self, ns: NormalizedSymbol, period: str) -> str:
        return f"md:history:{ns.exchange.value}:{ns.base}:{period.upper()}"

    def _cache_key_search(self, query: str) -> str:
        return f"md:search:{query.strip().upper()}"

    async def get_quote(self, symbol: str) -> Optional[dict]:
        ns = normalize_symbol(symbol)
        cache_key = self._cache_key_quote(ns)

        cached = await CacheService.get(cache_key)
        if cached:
            return cached

        if not self.adapters:
            return None

        last_err: Optional[Exception] = None
        for adapter in self.adapters:
            try:
                quote = await adapter.fetch_quote(ns)
                payload = asdict(quote)
                await CacheService.set(cache_key, payload, ttl=self.quote_ttl)
                return payload
            except Exception as e:
                last_err = e
                continue

        # All providers failed
        if last_err:
            print(f"get_quote failed for {symbol}: {last_err}")
        return None

    async def get_history(self, symbol: str, period: str = "1M") -> List[dict]:
        ns = normalize_symbol(symbol)
        cache_key = self._cache_key_history(ns, period)

        cached = await CacheService.get(cache_key)
        if cached:
            return cached

        if not self.adapters:
            return []

        last_err: Optional[Exception] = None
        for adapter in self.adapters:
            try:
                bars = await adapter.fetch_history(ns, period)
                payload = [asdict(b) for b in bars]
                await CacheService.set(cache_key, payload, ttl=self.history_ttl)
                return payload
            except Exception as e:
                last_err = e
                continue

        if last_err:
            print(f"get_history failed for {symbol}/{period}: {last_err}")
        return []

    async def search(self, query: str) -> List[dict]:
        cache_key = self._cache_key_search(query)
        cached = await CacheService.get(cache_key)
        if cached:
            return cached

        if not self.adapters:
            return []

        # Let the first adapter that supports search win.
        last_err: Optional[Exception] = None
        for adapter in self.adapters:
            try:
                res = await adapter.search(query)
                await CacheService.set(cache_key, res, ttl=self.search_ttl)
                return res
            except Exception as e:
                last_err = e
                continue

        if last_err:
            print(f"search failed for {query}: {last_err}")
        return []
