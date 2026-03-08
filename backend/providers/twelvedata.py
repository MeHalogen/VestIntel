from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx


@dataclass(frozen=True)
class TwelveDataQuote:
    symbol: str
    price: float
    change: float
    change_percent: float
    timestamp: int
    volume: Optional[int] = None


class TwelveDataProvider:
    """Twelve Data provider.

    Docs:
    - Quote: https://twelvedata.com/docs#quote
    - Quote (batch via comma symbols): supported by TwelveData `quote` endpoint.

    Note: TwelveData symbols vary (e.g., `RELIANCE.NSE`, `AAPL`).
    """

    def __init__(self, api_key: str):
        self.api_key = (api_key or "").strip()

    @staticmethod
    def _normalize_symbol(symbol: str) -> str:
        """Normalize symbol format for TwelveData.

        TwelveData commonly uses `.NSE` (and not `.NS`) for NSE listings.
        """
        sym = symbol.upper().strip()
        if sym.endswith(".NS"):
            return sym[:-3] + ".NSE"
        return sym

    async def fetch_quote(self, symbol: str) -> TwelveDataQuote:
        if not self.api_key:
            raise RuntimeError("TWELVEDATA_API_KEY not configured")

        symbol = self._normalize_symbol(symbol)

        url = "https://api.twelvedata.com/quote"
        params = {
            "symbol": symbol,
            "apikey": self.api_key,
        }
        timeout = httpx.Timeout(8.0, connect=2.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data: Dict[str, Any] = r.json()

        # TwelveData returns a `status` field on error
        if (data.get("status") or "").lower() == "error":
            msg = data.get("message") or "TwelveData error"
            code = data.get("code")
            raise RuntimeError(f"{msg}{' (' + str(code) + ')' if code else ''}")

        # Normalize
        price = float(data.get("close") or data.get("price") or 0.0)
        change = float(data.get("change") or 0.0)
        change_percent = float(data.get("percent_change") or 0.0)

        # volume can be missing
        vol_raw = data.get("volume")
        volume = int(float(vol_raw)) if vol_raw not in (None, "") else None

        ts = int(datetime.utcnow().timestamp())
        return TwelveDataQuote(
            symbol=symbol.upper().strip(),
            price=price,
            change=change,
            change_percent=change_percent,
            timestamp=ts,
            volume=volume,
        )

    async def fetch_quotes_batch(self, symbols: List[str]) -> Dict[str, TwelveDataQuote]:
        """Fetch multiple quotes in one request where possible.

        Returns a mapping symbol->quote (best-effort). Symbols that error are omitted.
        """
        if not symbols:
            return {}
        if not self.api_key:
            raise RuntimeError("TWELVEDATA_API_KEY not configured")

        symbols = [self._normalize_symbol(s) for s in symbols]

        url = "https://api.twelvedata.com/quote"
        params = {
            "symbol": ",".join([s.upper().strip() for s in symbols if s.strip()]),
            "apikey": self.api_key,
        }
        timeout = httpx.Timeout(10.0, connect=2.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data: Any = r.json()

        # When requesting multiple symbols, TwelveData returns an object keyed by symbol.
        if isinstance(data, dict) and (data.get("status") or "").lower() == "error":
            raise RuntimeError(data.get("message") or "TwelveData error")

        out: Dict[str, TwelveDataQuote] = {}
        if isinstance(data, dict):
            for sym, payload in data.items():
                if not isinstance(payload, dict):
                    continue
                if (payload.get("status") or "").lower() == "error":
                    continue
                try:
                    out[sym.upper()] = TwelveDataQuote(
                        symbol=sym.upper(),
                        price=float(payload.get("close") or payload.get("price") or 0.0),
                        change=float(payload.get("change") or 0.0),
                        change_percent=float(payload.get("percent_change") or 0.0),
                        timestamp=int(datetime.utcnow().timestamp()),
                        volume=(
                            int(float(payload.get("volume")))
                            if payload.get("volume") not in (None, "")
                            else None
                        ),
                    )
                except Exception:
                    continue

        return out
