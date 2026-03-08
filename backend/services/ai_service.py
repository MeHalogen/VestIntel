from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional


class AIService:
    def __init__(self):
        pass

    @staticmethod
    def _rating(score: int) -> str:
        if score >= 85:
            return "A+"
        if score >= 75:
            return "A"
        if score >= 65:
            return "B+"
        if score >= 55:
            return "B"
        if score >= 45:
            return "C"
        return "D"

    async def analyze_stock(
        self,
        symbol: str,
        *,
        quote: Optional[dict] = None,
        history: Optional[list[dict]] = None,
        sector_performance: Optional[float] = None,
    ) -> dict:
        """Generate deterministic, symbol-specific analysis from live market context."""
        sym = (symbol or "").upper().strip()
        q = quote or {}
        h = history or []

        price = float(q.get("price") or 0.0)
        change_pct = float(q.get("change_percent") or 0.0)
        volume = int(q.get("volume") or 0)
        source = q.get("source") or "derived"

        closes = [float(x.get("close") or 0.0) for x in h if x.get("close") is not None]
        vols = [int(x.get("volume") or 0) for x in h]
        last_close = closes[-1] if closes else price
        sma_5 = sum(closes[-5:]) / min(5, len(closes)) if closes else last_close
        sma_20 = sum(closes[-20:]) / min(20, len(closes)) if closes else last_close

        # Simple realized volatility proxy over available bars.
        returns: list[float] = []
        for i in range(1, len(closes)):
            prev = closes[i - 1]
            cur = closes[i]
            if prev:
                returns.append(((cur - prev) / prev) * 100.0)
        vol_lookback = returns[-30:] if len(returns) > 30 else returns
        realized_vol = (sum(abs(r) for r in vol_lookback) / len(vol_lookback)) if vol_lookback else abs(change_pct)

        avg_vol = (sum(vols[-20:]) / min(20, len(vols))) if vols else 0.0
        vol_ratio = (volume / avg_vol) if avg_vol > 0 else 1.0

        trend_component = 0.0
        if sma_20:
            trend_component = ((last_close - sma_20) / sma_20) * 100.0

        # Score composition: price move + trend + volume confirmation + sector tilt.
        sector_component = sector_performance or 0.0
        raw_score = (
            50.0
            + (change_pct * 5.5)
            + (trend_component * 4.0)
            + ((vol_ratio - 1.0) * 12.0)
            + (sector_component * 2.5)
            - (realized_vol * 1.2)
        )
        sentiment = int(max(0, min(100, round(raw_score))))
        technical_rating = self._rating(sentiment)
        risk_level = "Low" if realized_vol < 1.0 else "Medium" if realized_vol < 2.8 else "High"

        momentum_word = "bullish" if sentiment >= 65 else "neutral" if sentiment >= 45 else "bearish"
        summary = (
            f"{sym} trades at {price:.2f} ({change_pct:+.2f}%). "
            f"Trend vs 20-bar average is {trend_component:+.2f}%, volume confirmation is {vol_ratio:.2f}x, "
            f"and the current setup is {momentum_word} with {risk_level.lower()}-to-medium confidence."
        )

        key_insights = [
            f"Price vs 20-bar average: {trend_component:+.2f}%",
            f"Recent realized volatility: {realized_vol:.2f}%",
            f"Current volume vs 20-bar average: {vol_ratio:.2f}x",
        ]
        if sector_performance is not None:
            key_insights.append(f"Sector relative move: {sector_performance:+.2f}%")

        return {
            "symbol": sym,
            "sentiment_score": sentiment,
            "technical_rating": technical_rating,
            "risk_level": risk_level,
            "summary": summary,
            "key_insights": key_insights,
            "data_points": [
                {"label": "Price", "value": f"{price:.2f}"},
                {"label": "Change", "value": f"{change_pct:+.2f}%"},
                {"label": "SMA(20) Drift", "value": f"{trend_component:+.2f}%"},
                {"label": "Volume Ratio", "value": f"{vol_ratio:.2f}x"},
                {"label": "Volatility", "value": f"{realized_vol:.2f}%"},
            ],
            "source": source,
            "as_of": datetime.now(timezone.utc).replace(microsecond=0),
        }

    async def generate_market_brief(self) -> dict:
        """Generate daily AI market brief."""
        return {
            "summary": "Markets are rotating across sectors with selective momentum pockets in large caps.",
            "highlights": [
                "India breadth remains mixed with stock-specific leadership",
                "High-volume movers are driving short-term opportunity",
                "Risk remains event-sensitive despite stable index action",
            ],
            "outlook": "Neutral",
        }

    async def calculate_sentiment(self, symbol: str) -> int:
        """Fallback sentiment score (0-100)."""
        # Preserve API compatibility for old callers.
        return 50
