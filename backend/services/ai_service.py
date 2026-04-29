"""
VestIntel AI Service
====================
Wraps OpenAI GPT-4o-mini for structured financial analysis.

When OPENAI_API_KEY is set, every method calls the API and returns
GPT-generated JSON.  When the key is absent or the call fails, a
deterministic local fallback kicks in so the rest of the app keeps
working without errors.

Methods
-------
analyze_stock(symbol, *, quote, history, sector_performance)
    → sentiment_score, technical_rating, risk_level, summary, key_insights

analyze_portfolio(portfolio)
    → risk_score, diversification_score, suggestions

copilot_query(query, *, context_data)
    → answer, data_points, related_stocks

generate_market_brief()          [legacy]
calculate_sentiment(symbol)      [legacy]
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("vestintel.ai")

# ---------------------------------------------------------------------------
# OpenAI client — initialised lazily so missing key doesn't crash import
# ---------------------------------------------------------------------------

_openai_client = None


def _get_client():
    global _openai_client
    if _openai_client is not None:
        return _openai_client
    try:
        from openai import AsyncOpenAI
        from core.config import settings
        key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")
        if not key:
            return None
        _openai_client = AsyncOpenAI(api_key=key, timeout=30.0)
        logger.info("OpenAI client initialised (model=gpt-4o-mini)")
        return _openai_client
    except Exception as exc:
        logger.warning("Could not initialise OpenAI client: %s", exc)
        return None


MODEL       = "gpt-4o-mini"
MAX_TOKENS  = 600
TEMPERATURE = 0.2   # low temp → consistent, structured output

SYSTEM_PROMPT = (
    "You are a professional financial analyst specialising in Indian and global equity markets. "
    "Give concise, actionable insights based solely on the data provided — no hallucination. "
    "Always respond with valid JSON only, no markdown fences, no extra text."
)


async def _chat(messages: List[Dict], *, max_tokens: int = MAX_TOKENS) -> Dict[str, Any]:
    """
    Call GPT and parse the response as JSON.
    Raises on failure so callers can fall back to local logic.
    """
    client = _get_client()
    if client is None:
        raise RuntimeError("OpenAI client not available (OPENAI_API_KEY not set)")

    response = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=TEMPERATURE,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rating(score: int) -> str:
    if score >= 85: return "A+"
    if score >= 75: return "A"
    if score >= 65: return "B+"
    if score >= 55: return "B"
    if score >= 45: return "C"
    return "D"


# ---------------------------------------------------------------------------
# AIService
# ---------------------------------------------------------------------------

class AIService:
    def __init__(self) -> None:
        pass

    # ------------------------------------------------------------------
    # analyze_stock
    # ------------------------------------------------------------------

    async def analyze_stock(
        self,
        symbol: str,
        *,
        quote: Optional[Dict] = None,
        history: Optional[List[Dict]] = None,
        sector_performance: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        AI-powered single-stock analysis.

        Returns:
          sentiment_score  (0–100)
          technical_rating (A+/A/B+/B/C/D)
          risk_level       (Low/Medium/High)
          summary          (string)
          key_insights     (list[str])
          data_points      (list[{label, value}])
          source           ("openai" | "derived")
        """
        sym = (symbol or "").upper().strip()
        q   = quote or {}
        h   = history or []

        price       = float(q.get("price") or 0.0)
        change_pct  = float(q.get("change_percent") or 0.0)
        volume      = int(q.get("volume") or 0)
        pe_ratio    = q.get("pe_ratio")
        market_cap  = q.get("market_cap")

        closes = [float(x.get("close") or 0.0) for x in h if x.get("close") is not None]
        vols   = [int(x.get("volume") or 0) for x in h]

        # --- Try OpenAI ---
        try:
            # Summarise history to avoid exceeding token limits
            recent = closes[-30:] if len(closes) > 30 else closes
            avg_vol = (sum(vols[-20:]) / len(vols[-20:])) if vols else 0

            prompt = (
                f"Analyse the following stock data and return a JSON object with exactly these keys: "
                f"sentiment_score (integer 0-100), risk_level (one of: Low/Medium/High), "
                f"summary (2-3 sentence string), key_insights (list of 3-5 strings).\n\n"
                f"Symbol: {sym}\n"
                f"Current price: {price}\n"
                f"Change today: {change_pct:+.2f}%\n"
                f"Volume: {volume:,}\n"
                f"PE ratio: {pe_ratio}\n"
                f"Market cap: {market_cap}\n"
                f"Sector relative performance: {sector_performance}\n"
                f"Last {len(recent)} closing prices: {[round(c, 2) for c in recent]}\n"
                f"20-session average volume: {avg_vol:,.0f}\n"
                f"Base your analysis solely on this data."
            )
            result = await _chat([
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ])

            sentiment = int(max(0, min(100, result.get("sentiment_score", 50))))
            risk      = result.get("risk_level", "Medium")
            summary   = result.get("summary", "")
            insights  = result.get("key_insights") or []

            return {
                "symbol":           sym,
                "sentiment_score":  sentiment,
                "technical_rating": _rating(sentiment),
                "risk_level":       risk,
                "summary":          summary,
                "key_insights":     insights,
                "data_points": [
                    {"label": "Price",      "value": f"{price:.2f}"},
                    {"label": "Change",     "value": f"{change_pct:+.2f}%"},
                    {"label": "Volume",     "value": f"{volume:,}"},
                    {"label": "PE Ratio",   "value": str(pe_ratio or "N/A")},
                    {"label": "Market Cap", "value": str(market_cap or "N/A")},
                ],
                "source": "openai",
                "as_of": datetime.now(timezone.utc).replace(microsecond=0),
            }

        except Exception as exc:
            logger.warning("analyze_stock OpenAI call failed for %s: %s — using local fallback", sym, exc)

        # --- Local deterministic fallback ---
        return self._local_analyze_stock(sym, q, closes, vols, sector_performance)

    def _local_analyze_stock(self, sym, q, closes, vols, sector_performance):
        price      = float(q.get("price") or 0.0)
        change_pct = float(q.get("change_percent") or 0.0)
        volume     = int(q.get("volume") or 0)

        last_close = closes[-1] if closes else price
        sma_20     = sum(closes[-20:]) / min(20, len(closes)) if closes else last_close
        avg_vol    = (sum(vols[-20:]) / min(20, len(vols))) if vols else 0.0
        vol_ratio  = (volume / avg_vol) if avg_vol > 0 else 1.0

        returns = [((closes[i] - closes[i-1]) / closes[i-1]) * 100
                   for i in range(1, len(closes)) if closes[i-1]]
        realized_vol = (sum(abs(r) for r in returns[-30:]) / len(returns[-30:])) if returns else abs(change_pct)
        trend = ((last_close - sma_20) / sma_20) * 100 if sma_20 else 0.0

        raw_score = (
            50.0
            + (change_pct * 5.5)
            + (trend * 4.0)
            + ((vol_ratio - 1.0) * 12.0)
            + ((sector_performance or 0.0) * 2.5)
            - (realized_vol * 1.2)
        )
        sentiment = int(max(0, min(100, round(raw_score))))
        risk      = "Low" if realized_vol < 1.0 else "Medium" if realized_vol < 2.8 else "High"
        momentum  = "bullish" if sentiment >= 65 else "neutral" if sentiment >= 45 else "bearish"

        return {
            "symbol":           sym,
            "sentiment_score":  sentiment,
            "technical_rating": _rating(sentiment),
            "risk_level":       risk,
            "summary": (
                f"{sym} trades at {price:.2f} ({change_pct:+.2f}%). "
                f"Trend vs 20-bar average: {trend:+.2f}%. "
                f"Volume confirmation {vol_ratio:.2f}x. Setup is {momentum}."
            ),
            "key_insights": [
                f"Price vs 20-bar average: {trend:+.2f}%",
                f"Realised volatility: {realized_vol:.2f}%",
                f"Volume ratio: {vol_ratio:.2f}x",
                *([] if sector_performance is None else [f"Sector move: {sector_performance:+.2f}%"]),
            ],
            "data_points": [
                {"label": "Price",        "value": f"{price:.2f}"},
                {"label": "Change",       "value": f"{change_pct:+.2f}%"},
                {"label": "SMA(20) Drift","value": f"{trend:+.2f}%"},
                {"label": "Volume Ratio", "value": f"{vol_ratio:.2f}x"},
                {"label": "Volatility",   "value": f"{realized_vol:.2f}%"},
            ],
            "source": "derived",
            "as_of": datetime.now(timezone.utc).replace(microsecond=0),
        }

    # ------------------------------------------------------------------
    # analyze_portfolio
    # ------------------------------------------------------------------

    async def analyze_portfolio(self, portfolio: List[Dict]) -> Dict[str, Any]:
        """
        AI-powered portfolio analysis.

        Input:  [{"symbol": "TCS", "weight": 40, "change_percent": -1.2}, ...]
        Returns: risk_score, diversification_score, suggestions
        """
        if not portfolio:
            return {
                "risk_score": 50, "diversification_score": 50,
                "suggestions": ["Add holdings to get an analysis."],
                "source": "derived",
            }

        try:
            prompt = (
                f"Analyse this investment portfolio and return a JSON object with exactly these keys: "
                f"risk_score (integer 0-100, higher = riskier), "
                f"diversification_score (integer 0-100, higher = more diversified), "
                f"suggestions (list of 3-5 concise actionable strings).\n\n"
                f"Portfolio:\n{json.dumps(portfolio, indent=2)}\n\n"
                f"Consider sector concentration, single-stock risk, and weight distribution."
            )
            result = await _chat([
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ])
            return {
                "risk_score":            int(max(0, min(100, result.get("risk_score", 50)))),
                "diversification_score": int(max(0, min(100, result.get("diversification_score", 50)))),
                "suggestions":           result.get("suggestions") or [],
                "source": "openai",
            }
        except Exception as exc:
            logger.warning("analyze_portfolio OpenAI call failed: %s — using local fallback", exc)

        # Local fallback
        n = len(portfolio)
        weights = [float(h.get("weight") or (100 / n)) for h in portfolio]
        hhi = sum((w / 100) ** 2 for w in weights)   # Herfindahl index
        diversification = int(max(0, min(100, round((1 - hhi) * 100))))
        risk = int(max(0, min(100, round(100 - diversification + 10))))
        suggestions = ["Consider spreading weight more evenly across holdings."] if hhi > 0.3 else []
        suggestions += ["Review your largest positions for concentration risk."] if n < 5 else []
        suggestions += ["Portfolio looks reasonably diversified." ] if diversification > 70 else []
        return {
            "risk_score": risk,
            "diversification_score": diversification,
            "suggestions": suggestions or ["No major issues detected."],
            "source": "derived",
        }

    # ------------------------------------------------------------------
    # copilot_query
    # ------------------------------------------------------------------

    async def copilot_query(
        self,
        query: str,
        *,
        context_data: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        AI Copilot: answers freeform financial questions grounded in context_data.

        Returns: answer (str), data_points (list), related_stocks (list[str])
        """
        ctx = context_data or {}
        try:
            context_str = json.dumps(ctx, default=str)[:3000]  # cap tokens
            prompt = (
                f"A user asked: \"{query}\"\n\n"
                f"Use only the following market data to answer. "
                f"Return a JSON object with keys: "
                f"answer (string), data_points (list of {{label, value}} objects), "
                f"related_stocks (list of ticker strings).\n\n"
                f"Context data:\n{context_str}"
            )
            result = await _chat([
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ], max_tokens=800)

            return {
                "answer":         result.get("answer", ""),
                "data_points":    result.get("data_points") or [],
                "related_stocks": result.get("related_stocks") or [],
                "source": "openai",
            }
        except Exception as exc:
            logger.warning("copilot_query OpenAI call failed: %s", exc)
            return {
                "answer": (
                    "I'm unable to process your query right now. "
                    "Please check your OpenAI API key or try again later."
                ),
                "data_points":    [],
                "related_stocks": [],
                "source":         "error",
                "error":          str(exc),
            }

    # ------------------------------------------------------------------
    # Legacy / compat methods
    # ------------------------------------------------------------------

    async def generate_market_brief(self) -> Dict[str, Any]:
        """Generate a daily market brief.  Falls back to a static summary."""
        try:
            result = await _chat([
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": (
                    "Generate a brief daily Indian equity market outlook. "
                    "Return JSON with keys: summary (string), "
                    "highlights (list of 3 strings), outlook (Bullish/Neutral/Bearish)."
                )},
            ], max_tokens=400)
            return {
                "summary":    result.get("summary", ""),
                "highlights": result.get("highlights") or [],
                "outlook":    result.get("outlook", "Neutral"),
                "source":     "openai",
                "as_of":      datetime.now(timezone.utc).replace(microsecond=0).isoformat() + "Z",
            }
        except Exception as exc:
            logger.warning("generate_market_brief OpenAI failed: %s", exc)

        return {
            "summary":    "Markets are rotating across sectors with selective momentum pockets in large caps.",
            "highlights": [
                "India breadth remains mixed with stock-specific leadership",
                "High-volume movers are driving short-term opportunity",
                "Risk remains event-sensitive despite stable index action",
            ],
            "outlook": "Neutral",
            "source":  "derived",
            "as_of":   datetime.now(timezone.utc).replace(microsecond=0).isoformat() + "Z",
        }

    async def calculate_sentiment(self, symbol: str) -> int:
        """Legacy fallback sentiment score (0–100)."""
        return 50

