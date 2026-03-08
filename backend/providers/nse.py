from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

import httpx


NSE_BASE_URL = "https://www.nseindia.com"
NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Referer": "https://www.nseindia.com/",
}


def _to_float(v: Any) -> Optional[float]:
    if v in (None, "", "-", "--"):
        return None
    try:
        if isinstance(v, str):
            return float(v.replace(",", ""))
        return float(v)
    except Exception:
        return None


class NSEProvider:
    def __init__(self):
        timeout = httpx.Timeout(12.0, connect=4.0)
        self.client = httpx.AsyncClient(
            timeout=timeout,
            headers=NSE_HEADERS,
            follow_redirects=True,
        )

    async def _request_json(self, path: str, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        last_err: Optional[Exception] = None
        url = f"{NSE_BASE_URL}{path}"
        for _ in range(3):
            try:
                # Warm cookies like a browser before hitting API routes.
                await self.client.get(NSE_BASE_URL)
                r = await self.client.get(url, params=params)
                if r.status_code == 403:
                    await asyncio.sleep(0.6)
                    continue
                r.raise_for_status()
                return r.json()
            except Exception as e:
                last_err = e
                await asyncio.sleep(0.6)
        raise RuntimeError(f"NSE request failed for {path}: {last_err}")

    async def fetch_quote(self, symbol: str) -> Dict[str, Any]:
        payload = await self._request_json("/api/quote-equity", params={"symbol": symbol.upper().strip()})
        info = payload.get("priceInfo") or {}
        sec = payload.get("securityInfo") or {}
        market_cap = _to_float(sec.get("marketCap")) or _to_float(sec.get("issuedCap")) or 0.0
        return {
            "symbol": (payload.get("info") or {}).get("symbol") or symbol.upper().strip(),
            "price": _to_float(info.get("lastPrice")) or 0.0,
            "change": _to_float(info.get("change")) or 0.0,
            "change_percent": _to_float(info.get("pChange")) or 0.0,
            "volume": int((_to_float(info.get("totalTradedVolume")) or 0)),
            "market_cap": market_cap,
        }

    async def fetch_index_bundle(self, index_name: str) -> Dict[str, Any]:
        payload = await self._request_json("/api/equity-stockIndices", params={"index": index_name})
        rows = payload.get("data") or []
        out: List[Dict[str, Any]] = []
        for row in rows:
            symbol = (row.get("symbol") or "").strip().upper()
            if not symbol:
                continue
            out.append(
                {
                    "symbol": symbol,
                    "price": _to_float(row.get("lastPrice")) or 0.0,
                    "change_percent": _to_float(row.get("pChange")) or 0.0,
                    "sector": (row.get("sector") or "").strip() or None,
                    "market_cap": _to_float(row.get("marketCap"))
                    or _to_float(row.get("totalTradedValue"))
                    or 0.0,
                    "volume": int((_to_float(row.get("totalTradedVolume")) or 0)),
                    "index_name": index_name,
                }
            )
        # NSE index-level fields vary by endpoint/version; parse defensively.
        index_row = None
        for row in rows:
            sym = str(row.get("symbol") or "").strip().upper()
            ident = str(row.get("identifier") or "").strip().upper()
            if sym == index_name.upper() or ident == index_name.upper():
                index_row = row
                break
        if index_row is None and rows:
            # For NSE index responses, the first item is usually the index aggregate.
            index_row = rows[0]

        meta = {
            "name": payload.get("name") or index_name,
            "value": _to_float(payload.get("last"))
            or _to_float(payload.get("lastPrice"))
            or _to_float((index_row or {}).get("lastPrice")),
            "change": _to_float(payload.get("variation"))
            or _to_float(payload.get("change"))
            or _to_float((index_row or {}).get("change")),
            "change_percent": _to_float(payload.get("percentChange"))
            or _to_float(payload.get("pChange"))
            or _to_float(payload.get("perChange"))
            or _to_float((index_row or {}).get("pChange")),
        }
        return {"meta": meta, "rows": out}

    async def fetch_index(self, index_name: str) -> List[Dict[str, Any]]:
        bundle = await self.fetch_index_bundle(index_name)
        return bundle["rows"]

    async def aclose(self) -> None:
        await self.client.aclose()
