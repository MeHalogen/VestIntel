"""
Opportunity Finder API — GET /api/opportunities
"""

from fastapi import APIRouter, Query
from core.cache import CacheService
from services.opportunity_finder import find_opportunities
from typing import Any

router = APIRouter()

_CACHE_TTL = 60  # seconds


@router.get("/", summary="Rule-based opportunity finder (no AI)")
async def get_opportunities(
    types: list[str] | None = Query(
        default=None,
        description="Filter by signal type: momentum, dip, volume_breakout, consolidation",
    ),
) -> dict[str, Any]:
    """
    Scans all NIFTY 50 stocks from Redis and applies four rule-based signal rules:

    - **momentum** — `change_percent > 2%` → bullish momentum / strong breakout
    - **dip** — `change_percent < -2%` → potential rebound / deep dip caution
    - **volume_breakout** — volume > 1.5× median AND price up → institutional interest
    - **consolidation** — `abs(change_percent) < 0.5%` → watch for breakout

    One stock can appear in multiple categories.
    Results are sorted: high-confidence first, then by absolute move size.

    **No AI — pure rule-based logic on live NSE Redis data.**
    """
    cache_key = f"opportunities:{','.join(sorted(types)) if types else 'all'}"
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    overview = await CacheService.get("nse:india_overview")
    if not overview:
        return {
            "opportunities": [],
            "summary": {"total": 0, "momentum": 0, "dip": 0, "volume_breakout": 0, "consolidation": 0},
            "note": "NSE data not yet available. The nse_worker may still be warming up.",
        }

    result = find_opportunities(overview, types=types)
    await CacheService.set(cache_key, result, ttl=_CACHE_TTL)
    return result
