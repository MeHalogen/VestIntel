"""
Rule-Based Opportunity Finder — VestIntel
Scans NIFTY 50 stocks from Redis and applies signal rules.
No AI. Pure logic.
"""

from __future__ import annotations
from typing import Any

# ─── Thresholds (easy to tune) ────────────────────────────────────────────────
MOMENTUM_THRESHOLD      =  2.0   # change_percent > this → momentum pick
DIP_THRESHOLD           = -2.0   # change_percent < this → dip opportunity
HIGH_VOL_MULTIPLIER     =  1.5   # volume > median * this → high volume flag
CONSOLIDATION_BAND      =  0.5   # abs(change_percent) < this → consolidation
STRONG_MOMENTUM         =  4.0   # change_percent > this → strong breakout
DEEP_DIP                = -4.0   # change_percent < this → deep dip / caution


# ─── Rules ────────────────────────────────────────────────────────────────────

def _apply_rules(stock: dict[str, Any], median_volume: float) -> list[dict[str, Any]]:
    """
    Return a list of opportunity signals for one stock.
    One stock can match multiple rules.
    """
    sym         = stock.get("symbol", "")
    name        = stock.get("name", sym)
    pct         = float(stock.get("pChange", stock.get("change_percent", 0)) or 0)
    price       = float(stock.get("price", 0) or 0)
    volume      = float(stock.get("volume", 0) or 0)
    sector      = stock.get("sector", "Other")
    signals: list[dict] = []

    # ── Rule 1: Bullish momentum ──
    if pct > MOMENTUM_THRESHOLD:
        strength = "strong breakout" if pct > STRONG_MOMENTUM else "bullish momentum"
        signals.append({
            "symbol": sym,
            "name": name,
            "price": price,
            "change_percent": round(pct, 2),
            "sector": sector,
            "type": "momentum",
            "reason": f"Strong upward move (+{pct:.2f}%) — {strength}.",
            "confidence": "high" if pct > STRONG_MOMENTUM else "medium",
        })

    # ── Rule 2: Dip / potential rebound ──
    if pct < DIP_THRESHOLD:
        caution = pct < DEEP_DIP
        label   = "deep dip — approach with caution" if caution else "potential rebound"
        signals.append({
            "symbol": sym,
            "name": name,
            "price": price,
            "change_percent": round(pct, 2),
            "sector": sector,
            "type": "dip",
            "reason": f"Sharp decline ({pct:.2f}%) — {label}.",
            "confidence": "low" if caution else "medium",
        })

    # ── Rule 3: High volume breakout ──
    if median_volume > 0 and volume > median_volume * HIGH_VOL_MULTIPLIER and pct > 0:
        signals.append({
            "symbol": sym,
            "name": name,
            "price": price,
            "change_percent": round(pct, 2),
            "sector": sector,
            "type": "volume_breakout",
            "reason": (
                f"Volume {volume/median_volume:.1f}× above median with positive price action "
                f"(+{pct:.2f}%) — institutional interest likely."
            ),
            "confidence": "high",
        })

    # ── Rule 4: Consolidation (tight range, watch for breakout) ──
    if abs(pct) < CONSOLIDATION_BAND and volume > 0:
        signals.append({
            "symbol": sym,
            "name": name,
            "price": price,
            "change_percent": round(pct, 2),
            "sector": sector,
            "type": "consolidation",
            "reason": (
                f"Price nearly flat ({pct:+.2f}%) — stock consolidating; "
                "watch for directional breakout."
            ),
            "confidence": "low",
        })

    return signals


def _median(values: list[float]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    mid = len(s) // 2
    return (s[mid] if len(s) % 2 else (s[mid - 1] + s[mid]) / 2)


# ─── Public API ───────────────────────────────────────────────────────────────

def find_opportunities(
    overview: dict[str, Any],
    types: list[str] | None = None,
) -> dict[str, Any]:
    """
    overview : dict from Redis `nse:india_overview`
    types    : optional filter list — "momentum", "dip", "volume_breakout", "consolidation"

    Returns structured opportunity report.
    """
    heatmap: list[dict] = overview.get("heatmap") or overview.get("nifty50") or []
    if not heatmap:
        return {
            "opportunities": [],
            "summary": {"total": 0, "momentum": 0, "dip": 0, "volume_breakout": 0, "consolidation": 0},
            "as_of": overview.get("as_of"),
            "source": "nse_worker",
            "note": "No NIFTY 50 data available yet.",
        }

    volumes = [float(s.get("volume", 0) or 0) for s in heatmap if s.get("volume")]
    median_vol = _median(volumes)

    all_signals: list[dict] = []
    for stock in heatmap:
        all_signals.extend(_apply_rules(stock, median_vol))

    # Apply type filter
    if types:
        all_signals = [s for s in all_signals if s["type"] in types]

    # Sort: high confidence first, then by abs(change_percent) descending
    confidence_rank = {"high": 0, "medium": 1, "low": 2}
    all_signals.sort(
        key=lambda s: (confidence_rank.get(s["confidence"], 2), -abs(s["change_percent"]))
    )

    # Summary counts
    summary = {
        "total": len(all_signals),
        "momentum": sum(1 for s in all_signals if s["type"] == "momentum"),
        "dip": sum(1 for s in all_signals if s["type"] == "dip"),
        "volume_breakout": sum(1 for s in all_signals if s["type"] == "volume_breakout"),
        "consolidation": sum(1 for s in all_signals if s["type"] == "consolidation"),
    }

    return {
        "opportunities": all_signals,
        "summary": summary,
        "as_of": overview.get("as_of"),
        "source": overview.get("source", "nse_worker"),
    }
