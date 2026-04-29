"""
Daily Market Pulse API — GET /api/pulse
"""

from fastapi import APIRouter, HTTPException
from core.cache import CacheService
from services.market_pulse import compute_market_pulse
from typing import Any

router = APIRouter()

_PULSE_CACHE_KEY = "pulse:daily"
_PULSE_TTL = 60  # seconds


@router.get("/", summary="Daily Market Pulse from NSE data")
async def get_market_pulse() -> dict[str, Any]:
    """
    Returns a structured daily market pulse computed from live NSE Redis data.

    Includes:
    - Market direction (bullish / neutral / bearish)
    - NIFTY 50 + NIFTY BANK snapshot
    - Top gainer and top loser
    - Advance/decline breadth
    - Sector trend narrative + full sector breakdown

    **No AI — pure maths on NSE Redis data.**
    """
    # Try short-lived pulse cache first
    cached = await CacheService.get(_PULSE_CACHE_KEY)
    if cached:
        return cached

    # Load NSE overview from Redis
    overview = await CacheService.get("nse:india_overview")
    if not overview:
        raise HTTPException(
            status_code=503,
            detail="NSE data not yet available. The nse_worker may still be warming up.",
        )

    pulse = compute_market_pulse(overview)

    await CacheService.set(_PULSE_CACHE_KEY, pulse, ttl=_PULSE_TTL)
    return pulse
