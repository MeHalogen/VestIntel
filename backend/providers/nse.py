"""
NSEClient — production-ready async client for National Stock Exchange India.

Endpoints used (all free, no API key required):
  - GET /api/quote-equity?symbol=<SYMBOL>
  - GET /api/equity-stockIndices?index=NIFTY%2050
  - GET /api/allIndices

Cookie strategy
---------------
NSE's API endpoints return 401/403 when called without a valid browser
session cookie.  The fix is to hit the HTML homepage first so that the
server sets `nsit` / `nseappid` cookies, then reuse the same httpx
AsyncClient (which persists cookies automatically) for all subsequent
API calls.  We re-warm the session on every 401/403 and retry up to
MAX_RETRIES times with exponential back-off.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional, TypedDict

import httpx

logger = logging.getLogger("vestintel.nse")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NSE_BASE = "https://www.nseindia.com"
MAX_RETRIES = 3
BACKOFF_BASE = 0.8  # seconds; multiplied by attempt index

# Mimic a real browser as closely as possible to pass NSE's bot checks.
_BROWSER_HEADERS: Dict[str, str] = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    # No Accept-Encoding — avoid brotli (not installed in the container).
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

_API_HEADERS: Dict[str, str] = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    # Omit Accept-Encoding — let httpx negotiate gzip/deflate automatically.
    # Brotli is NOT requested because the brotli package is not installed,
    # and NSE would send back br-encoded bytes that httpx cannot decompress.
    "Referer": "https://www.nseindia.com/",
    "Origin": "https://www.nseindia.com",
    "Connection": "keep-alive",
    "X-Requested-With": "XMLHttpRequest",
}

# ---------------------------------------------------------------------------
# Output schemas (TypedDict for IDE type hints)
# ---------------------------------------------------------------------------


class StockQuote(TypedDict):
    symbol: str
    name: str
    price: float
    open: float
    high: float
    low: float
    prev_close: float
    change: float
    change_percent: float
    volume: int
    market_cap: float
    fifty_two_week_high: float
    fifty_two_week_low: float
    pe_ratio: Optional[float]
    series: str


class IndexQuote(TypedDict):
    symbol: str          # e.g. "NIFTY 50"
    price: float
    change: float
    change_percent: float
    advances: int
    declines: int
    unchanged: int


class IndexConstituent(TypedDict):
    symbol: str
    name: str
    price: float
    change_percent: float
    volume: int
    market_cap: float
    sector: Optional[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_float(v: Any) -> Optional[float]:
    """Safely convert NSE's mixed-type numeric fields to float."""
    if v in (None, "", "-", "--", "NA", "N/A"):
        return None
    try:
        return float(str(v).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _to_int(v: Any) -> int:
    f = _to_float(v)
    return int(f) if f is not None else 0


# ---------------------------------------------------------------------------
# NSEClient
# ---------------------------------------------------------------------------


class NSEClient:
    """
    Async NSE client.  Create once at app startup, close at shutdown.

    Usage (standalone)::

        client = NSEClient()
        quote = await client.get_quote("RELIANCE")
        await client.aclose()

    Usage (FastAPI dependency)::

        from providers.nse import get_nse_client
        @router.get("/quote/{symbol}")
        async def quote(symbol: str, nse: NSEClient = Depends(get_nse_client)):
            return await nse.get_quote(symbol)
    """

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
            follow_redirects=True,
            http2=False,  # NSE's CDN sometimes drops HTTP/2 upgrades
        )
        self._session_warmed: bool = False

    # ------------------------------------------------------------------
    # Session / cookie management
    # ------------------------------------------------------------------

    async def _warm_session(self) -> None:
        """
        Hit the NSE homepage to acquire session cookies (`nsit`, `nseappid`).
        Must be called before any API request.
        """
        try:
            logger.debug("NSE: warming session cookies")
            resp = await self._client.get(NSE_BASE, headers=_BROWSER_HEADERS)
            resp.raise_for_status()
            self._session_warmed = True
            logger.debug(
                "NSE: session warmed, cookies=%s",
                list(self._client.cookies.keys()),
            )
        except Exception as exc:
            logger.warning("NSE: session warm-up failed: %s", exc)
            self._session_warmed = False

    # ------------------------------------------------------------------
    # Core request helper
    # ------------------------------------------------------------------

    async def _get(
        self,
        path: str,
        params: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Make an authenticated GET request to the NSE API with retry + re-warm
        logic.  Raises RuntimeError after MAX_RETRIES failures.
        """
        url = f"{NSE_BASE}{path}"
        last_exc: Optional[Exception] = None

        for attempt in range(MAX_RETRIES):
            if not self._session_warmed or attempt > 0:
                await self._warm_session()

            try:
                logger.debug("NSE: GET %s params=%s (attempt %d)", url, params, attempt + 1)
                resp = await self._client.get(url, headers=_API_HEADERS, params=params)

                if resp.status_code in (401, 403):
                    logger.warning(
                        "NSE: %d on %s, re-warming session (attempt %d/%d)",
                        resp.status_code, path, attempt + 1, MAX_RETRIES,
                    )
                    self._session_warmed = False
                    await asyncio.sleep(BACKOFF_BASE * (attempt + 1))
                    continue

                resp.raise_for_status()
                data: Dict[str, Any] = resp.json()
                logger.debug("NSE: OK %s", path)
                return data

            except httpx.HTTPStatusError as exc:
                logger.warning("NSE: HTTP error %s on %s: %s", exc.response.status_code, path, exc)
                last_exc = exc
            except Exception as exc:
                logger.warning("NSE: request error on %s: %s", path, exc)
                last_exc = exc

            await asyncio.sleep(BACKOFF_BASE * (attempt + 1))

        raise RuntimeError(
            f"NSE: all {MAX_RETRIES} retries exhausted for {path}. "
            f"Last error: {last_exc}"
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_quote(self, symbol: str) -> StockQuote:
        """
        Fetch a single equity quote.

        Returns a normalised StockQuote dict.  Raises on failure (caller
        should catch and return a fallback / cached value).
        """
        sym = symbol.upper().strip()
        data = await self._get("/api/quote-equity", params={"symbol": sym})

        info: Dict[str, Any] = data.get("priceInfo") or {}
        meta: Dict[str, Any] = data.get("info") or {}
        sec: Dict[str, Any] = data.get("securityInfo") or {}
        wk52: Dict[str, Any] = info.get("weekHighLow") or {}
        intra: Dict[str, Any] = info.get("intraDayHighLow") or {}

        return StockQuote(
            symbol=meta.get("symbol") or sym,
            name=meta.get("companyName") or meta.get("symbol") or sym,
            price=_to_float(info.get("lastPrice")) or 0.0,
            open=_to_float(intra.get("min")) or _to_float(info.get("open")) or 0.0,
            high=_to_float(intra.get("max")) or _to_float(info.get("intraDayHighLow", {}).get("max")) or 0.0,
            low=_to_float(info.get("intraDayHighLow", {}).get("min")) or 0.0,
            prev_close=_to_float(info.get("previousClose")) or 0.0,
            change=_to_float(info.get("change")) or 0.0,
            change_percent=_to_float(info.get("pChange")) or 0.0,
            volume=_to_int(info.get("totalTradedVolume")),
            market_cap=_to_float(sec.get("issuedCap")) or 0.0,
            fifty_two_week_high=_to_float(wk52.get("max")) or 0.0,
            fifty_two_week_low=_to_float(wk52.get("min")) or 0.0,
            pe_ratio=_to_float(data.get("metadata", {}).get("pdSectorPe"))
                or _to_float(sec.get("pe")),
            series=sec.get("series") or "EQ",
        )

    async def get_nifty50(self) -> List[IndexConstituent]:
        """
        Return the current NIFTY 50 constituent list with per-stock quote data.
        """
        data = await self._get("/api/equity-stockIndices", params={"index": "NIFTY 50"})
        rows: List[Dict[str, Any]] = data.get("data") or []

        result: List[IndexConstituent] = []
        for row in rows:
            sym = (row.get("symbol") or "").strip().upper()
            if not sym or sym == "NIFTY 50":
                # Skip the aggregate / index row itself
                continue
            result.append(
                IndexConstituent(
                    symbol=sym,
                    name=row.get("meta", {}).get("companyName") or row.get("companyName") or sym,
                    price=_to_float(row.get("lastPrice")) or 0.0,
                    change_percent=_to_float(row.get("pChange")) or 0.0,
                    volume=_to_int(row.get("totalTradedVolume")),
                    market_cap=_to_float(row.get("totalMarketCap"))
                        or _to_float(row.get("marketCap"))
                        or _to_float(row.get("totalTradedValue"))
                        or 0.0,
                    sector=row.get("industry") or row.get("sector") or None,
                )
            )

        logger.info("NSE: fetched %d NIFTY 50 constituents", len(result))
        return result

    async def get_indices(self) -> List[IndexQuote]:
        """
        Return headline data for all NSE indices (NIFTY 50, BANK NIFTY, etc.).
        """
        data = await self._get("/api/allIndices")
        rows: List[Dict[str, Any]] = data.get("data") or []

        result: List[IndexQuote] = []
        for row in rows:
            name = (row.get("index") or row.get("indexSymbol") or "").strip()
            if not name:
                continue
            result.append(
                IndexQuote(
                    symbol=name,
                    price=_to_float(row.get("last")) or _to_float(row.get("lastPrice")) or 0.0,
                    change=_to_float(row.get("variation")) or _to_float(row.get("change")) or 0.0,
                    change_percent=_to_float(row.get("percentChange"))
                        or _to_float(row.get("pChange"))
                        or 0.0,
                    advances=_to_int(row.get("advances")),
                    declines=_to_int(row.get("declines")),
                    unchanged=_to_int(row.get("unchanged")),
                )
            )

        logger.info("NSE: fetched %d indices", len(result))
        return result

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def aclose(self) -> None:
        await self._client.aclose()
        logger.debug("NSE: client closed")

    async def __aenter__(self) -> "NSEClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.aclose()


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

# Module-level singleton — created on first import, reused across requests.
_nse_client: Optional[NSEClient] = None


def get_nse_client() -> NSEClient:
    """
    FastAPI dependency.  Returns the shared NSEClient singleton.

    Add to your router::

        from providers.nse import get_nse_client
        from fastapi import Depends

        @router.get("/quote/{symbol}")
        async def quote(symbol: str, nse: NSEClient = Depends(get_nse_client)):
            return await nse.get_quote(symbol)
    """
    global _nse_client
    if _nse_client is None:
        _nse_client = NSEClient()
    return _nse_client


async def close_nse_client() -> None:
    """Call from FastAPI shutdown event to cleanly close HTTP connections."""
    global _nse_client
    if _nse_client is not None:
        await _nse_client.aclose()
        _nse_client = None


# ---------------------------------------------------------------------------
# Backwards-compat alias (existing code uses NSEProvider)
# ---------------------------------------------------------------------------

class NSEProvider(NSEClient):
    """Alias for backwards compatibility with existing service layer."""

    async def fetch_quote(self, symbol: str) -> Dict[str, Any]:
        return dict(await self.get_quote(symbol))

    async def fetch_index(self, index_name: str) -> List[Dict[str, Any]]:
        if index_name.upper() == "NIFTY 50":
            return [dict(r) for r in await self.get_nifty50()]
        data = await self._get("/api/equity-stockIndices", params={"index": index_name})
        rows: List[Dict[str, Any]] = data.get("data") or []
        out = []
        for row in rows:
            sym = (row.get("symbol") or "").strip().upper()
            if not sym or sym == index_name.upper():
                continue
            out.append({
                "symbol": sym,
                "price": _to_float(row.get("lastPrice")) or 0.0,
                "change_percent": _to_float(row.get("pChange")) or 0.0,
                "volume": _to_int(row.get("totalTradedVolume")),
                "market_cap": _to_float(row.get("totalMarketCap"))
                    or _to_float(row.get("marketCap"))
                    or 0.0,
                "sector": row.get("industry") or row.get("sector") or None,
                "index_name": index_name,
            })
        return out

    async def fetch_index_bundle(self, index_name: str) -> Dict[str, Any]:
        rows = await self.fetch_index(index_name)
        return {"meta": {"name": index_name}, "rows": rows}
