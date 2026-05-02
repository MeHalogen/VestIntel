from __future__ import annotations
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from core.cache import CacheService
from api.deps.auth import require_user

logger = logging.getLogger("vestintel.pulse")
router = APIRouter()

_KEY_INDIA_OVERVIEW = "nse:india_overview"
_KEY_NIFTY50 = "nse:nifty50"
_KEY_ALL_INDICES = "nse:allindices"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/")
async def get_market_pulse(_: str = Depends(require_user)):
    """Build a market pulse summary from NSE worker Redis data."""
    cache = CacheService()

    overview_raw = await cache.get(_KEY_INDIA_OVERVIEW)
    nifty50_raw = await cache.get(_KEY_NIFTY50)
    indices_raw = await cache.get(_KEY_ALL_INDICES)

    if not overview_raw:
        return {"error": "Market pulse data unavailable. Ensure the NSE worker is running."}

    overview = json.loads(overview_raw) if isinstance(overview_raw, str) else overview_raw
    nifty50 = (json.loads(nifty50_raw) if isinstance(nifty50_raw, str) else nifty50_raw) or []
    indices = (json.loads(indices_raw) if isinstance(indices_raw, str) else indices_raw) or []

    nifty = overview.get("nifty", {})
    banknifty = overview.get("banknifty", {})

    nifty_chg = nifty.get("change_percent", 0) or 0
    if nifty_chg > 0.5:
        direction, intensity = "bullish", ("strong" if nifty_chg > 1.5 else "moderate")
    elif nifty_chg < -0.5:
        direction, intensity = "bearish", ("strong" if nifty_chg < -1.5 else "moderate")
    else:
        direction, intensity = "neutral", "weak"

    # Build sectors from sector_performance
    sector_perf = overview.get("sector_performance", [])
    sectors = [
        {
            "sector": s["sector"],
            "performance": s["performance"],
            "direction": "bullish" if s["performance"] > 0 else "bearish",
            "intensity": "strong" if abs(s["performance"]) > 1.5 else "moderate" if abs(s["performance"]) > 0.5 else "weak",
            "count": s.get("count", 0),
        }
        for s in sector_perf
    ]
    sorted_sectors = sorted(sectors, key=lambda x: x["performance"], reverse=True)
    strongest = sorted_sectors[0] if sorted_sectors else None
    weakest = sorted_sectors[-1] if sorted_sectors else None

    # Top gainer / loser from nifty50 list
    gainers = sorted(nifty50, key=lambda x: x.get("change_percent", 0), reverse=True)
    losers = sorted(nifty50, key=lambda x: x.get("change_percent", 0))

    def _card(s: dict):
        return {
            "symbol": s.get("symbol"),
            "name": s.get("name", s.get("symbol")),
            "price": s.get("price"),
            "change_percent": s.get("change_percent"),
            "sector": s.get("sector"),
        }

    # Breadth from indices
    advances = sum(i.get("advances", 0) for i in indices)
    declines = sum(i.get("declines", 0) for i in indices)
    total = advances + declines
    adr = round(advances / declines, 2) if declines else 0

    narrative = (
        f"Markets are under {'strong' if intensity == 'strong' else 'moderate'} "
        f"{'buying' if direction == 'bullish' else 'selling' if direction == 'bearish' else 'sideways'} "
        f"pressure today, with NIFTY 50 at {nifty_chg:+.2f}%"
    )

    return {
        "as_of": overview.get("as_of", _now_iso()),
        "source": "nse_worker",
        "market_direction": direction,
        "market_intensity": intensity,
        "narrative": narrative,
        "summary": f"NIFTY {nifty_chg:+.2f}% | BankNIFTY {banknifty.get('change_percent', 0):+.2f}%",
        "indices": {
            "nifty": {
                "name": "NIFTY 50",
                "value": nifty.get("value"),
                "change_percent": nifty_chg,
                "direction": "up" if nifty_chg >= 0 else "down",
            },
            "banknifty": {
                "name": "NIFTY BANK",
                "value": banknifty.get("value"),
                "change_percent": banknifty.get("change_percent", 0),
                "direction": "up" if banknifty.get("change_percent", 0) >= 0 else "down",
            },
        },
        "top_gainer": _card(gainers[0]) if gainers else None,
        "top_loser": _card(losers[0]) if losers else None,
        "notable_movers": [_card(s) for s in gainers[:3]] + [_card(s) for s in losers[:2]],
        "breadth": {
            "advancing": advances,
            "declining": declines,
            "unchanged": 0,
            "total": total,
            "advance_decline_ratio": adr,
        },
        "sector_trend": strongest["sector"] if strongest else "—",
        "sectors": sectors,
        "strongest_sector": strongest,
        "weakest_sector": weakest,
    }
