from __future__ import annotations
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from core.cache import CacheService
from api.deps.auth import require_user

logger = logging.getLogger("vestintel.opportunities")
router = APIRouter()

_KEY_NIFTY50 = "nse:nifty50"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _classify(stock: dict) -> Optional[dict]:
    chg = stock.get("change_percent", 0) or 0
    vol = stock.get("volume", 0) or 0
    symbol = stock.get("symbol", "")
    name = stock.get("name", symbol)
    price = stock.get("price", 0)
    sector = stock.get("sector", "Other")

    if chg >= 3.0:
        return {"type": "momentum", "reason": f"Strong upward momentum (+{chg:.1f}%)", "confidence": "high" if chg >= 5 else "medium"}
    if chg <= -3.0:
        return {"type": "dip", "reason": f"Significant dip ({chg:.1f}%) — potential reversal", "confidence": "medium"}
    if vol > 20_000_000 and abs(chg) < 1.0:
        return {"type": "consolidation", "reason": f"High volume ({vol/1e6:.0f}M) with tight range", "confidence": "low"}
    if chg >= 1.5 and vol > 10_000_000:
        return {"type": "volume_breakout", "reason": f"Volume surge with breakout (+{chg:.1f}%)", "confidence": "medium"}
    return None


@router.get("/")
async def get_opportunities(
    types: List[str] = Query(default=[]),
    _: str = Depends(require_user),
):
    """Detect opportunity setups from NSE NIFTY50 data."""
    cache = CacheService()
    nifty50_raw = await cache.get(_KEY_NIFTY50)

    if not nifty50_raw:
        return {
            "opportunities": [],
            "summary": {"momentum": 0, "dip": 0, "volume_breakout": 0, "consolidation": 0, "total": 0},
            "as_of": _now_iso(),
            "source": "nse_worker",
            "note": "NSE worker data not available",
        }

    nifty50 = json.loads(nifty50_raw) if isinstance(nifty50_raw, str) else nifty50_raw

    opportunities = []
    for stock in nifty50:
        result = _classify(stock)
        if not result:
            continue
        if types and result["type"] not in types:
            continue
        opportunities.append({
            "symbol": stock.get("symbol"),
            "name": stock.get("name", stock.get("symbol")),
            "price": stock.get("price"),
            "change_percent": stock.get("change_percent"),
            "sector": stock.get("sector", "Other"),
            "type": result["type"],
            "reason": result["reason"],
            "confidence": result["confidence"],
        })

    summary = {"momentum": 0, "dip": 0, "volume_breakout": 0, "consolidation": 0, "total": 0}
    for o in opportunities:
        summary[o["type"]] = summary.get(o["type"], 0) + 1
        summary["total"] += 1

    return {
        "opportunities": opportunities,
        "summary": summary,
        "as_of": _now_iso(),
        "source": "nse_worker",
    }
