from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx


@dataclass(frozen=True)
class FinnhubQuote:
    symbol: str
    price: float
    change: float
    change_percent: float
    timestamp: int
    volume: Optional[int] = None


class FinnhubProvider:
    """Finnhub market data provider (global stocks).

    API:
    - Quote: https://finnhub.io/api/v1/quote?symbol=AAPL&token=...
    """

    def __init__(self, api_key: str):
        self.api_key = (api_key or "").strip()

    async def fetch_quote(self, symbol: str) -> FinnhubQuote:
        if not self.api_key:
            raise RuntimeError("FINNHUB_API_KEY not configured")

        url = "https://finnhub.io/api/v1/quote"
        params = {"symbol": symbol.upper().strip(), "token": self.api_key}
        timeout = httpx.Timeout(6.0, connect=2.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data: Dict[str, Any] = r.json()

        ts = int(data.get("t") or 0)
        if ts <= 0:
            ts = int(datetime.utcnow().timestamp())

        return FinnhubQuote(
            symbol=symbol.upper().strip(),
            price=float(data.get("c") or 0.0),
            change=float(data.get("d") or 0.0),
            change_percent=float(data.get("dp") or 0.0),
            timestamp=ts,
            volume=None,
        )

    async def fetch_history(self, symbol: str, period: str = "1M") -> List[Dict[str, Any]]:
        # MVP: keep history mocked until we add Finnhub candles endpoint mapping.
        # This avoids breaking UI while quote path is made real.
        from datetime import date, timedelta

        days = 30
        if period.upper() == "1Y":
            days = 365

        base_price = 100.0
        out: List[Dict[str, Any]] = []
        for i in range(days):
            d = date.today() - timedelta(days=(days - 1 - i))
            close = base_price + (i * 0.05)
            out.append(
                {
                    "date": datetime.combine(d, datetime.min.time()).isoformat(),
                    "open": close - 0.5,
                    "high": close + 0.8,
                    "low": close - 0.9,
                    "close": close,
                    "volume": 0,
                }
            )
        return out
