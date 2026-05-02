from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from services.risk_engine import analyze_risk

router = APIRouter()


class HoldingIn(BaseModel):
    symbol: str
    weight: float = Field(..., gt=0, le=100)


class RiskRequest(BaseModel):
    holdings: List[HoldingIn]


@router.post("/analyze")
async def analyze_portfolio_risk(body: RiskRequest):
    """
    POST /api/risk/analyze
    Body: { "holdings": [{ "symbol": "RELIANCE", "weight": 30 }, ...] }

    Returns a full RiskReport with score, breakdown, issues, and suggestions.
    """
    if not body.holdings:
        raise HTTPException(status_code=400, detail="holdings list cannot be empty")

    holdings_raw = [{"symbol": h.symbol, "weight": h.weight} for h in body.holdings]
    return analyze_risk(holdings_raw)
