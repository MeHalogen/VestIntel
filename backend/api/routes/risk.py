"""
Portfolio Risk Engine API — /api/risk
"""

from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import Any
from core.cache import CacheService
from services.risk_engine import compute_portfolio_risk

router = APIRouter()


# ─── Request / Response schemas ───────────────────────────────────────────────

class HoldingInput(BaseModel):
    symbol: str = Field(..., description="NSE stock symbol, e.g. RELIANCE")
    weight: float = Field(..., gt=0, description="Portfolio weight as a percentage (1–100)")

    @validator("symbol")
    def upper_symbol(cls, v: str) -> str:
        return v.strip().upper()


class RiskRequest(BaseModel):
    holdings: list[HoldingInput] = Field(..., min_items=1, max_items=50)


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post("/analyze", summary="Compute portfolio risk (no AI)")
async def analyze_risk(body: RiskRequest) -> dict[str, Any]:
    """
    Compute concentration, sector, and volatility risk for a given set of
    weighted holdings.  Uses live NSE % change data from Redis (written by
    nse_worker) when available; falls back gracefully to 0 when data is
    missing.

    **No AI / OpenAI dependency — pure math.**
    """
    holdings = [h.dict() for h in body.holdings]
    symbols = [h["symbol"] for h in holdings]

    # ── Pull live NSE pChange values from Redis ──
    nse_data: dict[str, float] = {}
    for sym in symbols:
        cached = await CacheService.get(f"stock:price:{sym}")
        if cached and isinstance(cached, dict):
            nse_data[sym] = float(cached.get("pChange", 0) or 0)

    # Also try the bulk india_overview for any missing symbols
    if len(nse_data) < len(symbols):
        overview = await CacheService.get("nse:india_overview")
        if overview:
            heatmap = overview.get("heatmap", [])
            heatmap_map = {row.get("symbol", ""): row for row in heatmap}
            for sym in symbols:
                if sym not in nse_data:
                    row = heatmap_map.get(sym)
                    if row:
                        nse_data[sym] = float(row.get("pChange", 0) or 0)

    # ── Compute ──
    try:
        result = compute_portfolio_risk(holdings, nse_data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return result
