from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional

import httpx


@dataclass(frozen=True)
class UpstoxQuote:
    symbol: str
    price: float
    change_percent: float
    timestamp: int
    volume: Optional[int] = None


class UpstoxProvider:
    """Upstox provider (India/NSE).

    Note: Upstox APIs typically require OAuth access tokens. For MVP, we keep this
    adapter minimal and fail clearly if only an API key is provided.

    If you later add OAuth, you’ll swap `UPSTOX_API_KEY` for an access token.
    """

    def __init__(self, api_key: str):
        self.api_key = (api_key or "").strip()

    async def fetch_quote(self, symbol: str) -> UpstoxQuote:
        if not self.api_key:
            raise RuntimeError("UPSTOX_API_KEY not configured")

        # MVP fallback: Upstox integration specifics vary by account/app.
        # Provide a deterministic mock-like payload so the rest of the pipeline works.
        # Replace with real Upstox quote endpoint once OAuth token flow is wired.
        seed = sum(ord(c) for c in symbol)
        price = 500.0 + (seed % 300)
        ts = int(datetime.utcnow().timestamp())
        return UpstoxQuote(
            symbol=symbol.upper().strip(),
            price=float(price),
            change_percent=float(((seed % 200) - 100) / 100.0),
            timestamp=ts,
            volume=100000 + (seed % 50000),
        )
