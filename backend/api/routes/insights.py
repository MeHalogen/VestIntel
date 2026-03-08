from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, Query, HTTPException

from api.deps.auth import require_user
from api.deps.entitlements import get_user_and_plan, enforce_ai_quota
from core.plans import PlanType
from schemas.schemas import AIInsight
from services.ai_service import AIService
from services.market_data import MarketDataService

router = APIRouter()
ai_service = AIService()
market_data_service = MarketDataService()

WATCHLIST = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "ICICIBANK"]


def _rating(score: int) -> str:
    if score >= 80:
        return "A"
    if score >= 65:
        return "B"
    if score >= 50:
        return "C"
    return "D"


@router.get("/{symbol}", response_model=AIInsight)
async def get_ai_insights(symbol: str, _: str = Depends(require_user)):
    quote = await market_data_service.get_quote(symbol)
    price = float((quote or {}).get("price") or 0.0)
    chg = float((quote or {}).get("change_percent") or 0.0)

    sentiment = int(max(0, min(100, round(50 + (chg * 12)))))
    technical_rating = f"{_rating(sentiment)}+"
    risk_level = "Low" if sentiment >= 70 else "Medium" if sentiment >= 45 else "High"

    return {
        "symbol": symbol.upper(),
        "sentiment_score": sentiment,
        "technical_rating": technical_rating,
        "risk_level": risk_level,
        "summary": (
            f"{symbol.upper()} is trading near {price:.2f} with {chg:+.2f}% move. "
            "Signals indicate momentum-driven action with moderate near-term volatility."
        ),
        "key_insights": [
            "Price action is consistent with current index trend",
            "Volume and change profile indicate active participation",
            "Risk-adjusted positioning is favored over concentrated exposure",
        ],
        "data_points": [
            {"label": "Price", "value": f"{price:.2f}"},
            {"label": "Change", "value": f"{chg:+.2f}%"},
            {"label": "Sentiment", "value": f"{sentiment}/100"},
            {"label": "Source", "value": quote.get("source") if quote else "derived"},
        ],
        "related_stocks": [s for s in WATCHLIST if s != symbol.upper()][:4],
        "source": quote.get("source") if quote else "derived",
        "as_of": datetime.now(timezone.utc),
    }


@router.get("/market/brief")
async def get_market_brief(_: str = Depends(require_user)):
    symbols = WATCHLIST[:4]
    rows = []
    avg_change = 0.0
    for s in symbols:
        q = await market_data_service.get_quote(s)
        if not q:
            continue
        c = float(q.get("change_percent", 0.0))
        avg_change += c
        rows.append({"symbol": s, "change_percent": c, "price": float(q.get("price", 0.0))})

    avg_change = (avg_change / max(len(rows), 1))
    outlook = "Bullish" if avg_change >= 0.8 else "Neutral" if avg_change >= -0.5 else "Bearish"
    summary = (
        "Broad risk appetite is improving."
        if outlook == "Bullish"
        else "Markets are range-bound with mixed conviction."
        if outlook == "Neutral"
        else "Defensive posture is increasing amid weaker momentum."
    )

    return {
        "date": datetime.now(timezone.utc).date().isoformat(),
        "summary": summary,
        "highlights": [f"{r['symbol']} moved {r['change_percent']:+.2f}%" for r in rows[:3]],
        "outlook": outlook,
        "as_of": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": "derived",
    }


@router.get("/query/ask")
async def ask_copilot(
    q: str = Query(..., min_length=3),
    ctx = Depends(get_user_and_plan),
):
    user, plan = ctx
    if plan == PlanType.free:
        raise HTTPException(
            status_code=403,
            detail="This feature is available in VestIntel Pro.",
        )

    await enforce_ai_quota(user.id, plan)

    q_upper = q.upper()
    symbols = [s for s in WATCHLIST if s in q_upper] or WATCHLIST[:2]
    facts: List[str] = []
    datapoints: List[dict] = []
    for s in symbols[:3]:
        quote = await market_data_service.get_quote(s)
        if not quote:
            continue
        price = float(quote.get("price", 0.0))
        chg = float(quote.get("change_percent", 0.0))
        facts.append(f"{s} {chg:+.2f}% at {price:.2f}")
        datapoints.append({"label": s, "value": f"{price:.2f} ({chg:+.2f}%)"})

    analysis = await ai_service.generate_market_brief()
    return {
        "query": q,
        "answer": (
            f"{analysis['summary']} Live snapshot: " + ", ".join(facts)
            if facts
            else analysis["summary"]
        ),
        "data_points": datapoints,
        "related_stocks": symbols[:5],
        "as_of": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": "derived",
    }
