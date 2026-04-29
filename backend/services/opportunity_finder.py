"""
Rule-Based Opportunity Finder — VestIntel
"""
from __future__ import annotations
from typing import Any

MOMENTUM_THRESHOLD  =  2.0
DIP_THRESHOLD       = -2.0
HIGH_VOL_MULTIPLIER =  1.5
CONSOLIDATION_BAND  =  0.5
STRONG_MOMENTUM     =  4.0
DEEP_DIP            = -4.0


def _apply_rules(stock: dict[str, Any], median_volume: float) -> list[dict[str, Any]]:
    sym    = stock.get("symbol", "")
    name   = stock.get("name", sym)
    pct    = float(stock.get("pChange", stock.get("change_percent", 0)) or 0)
    price  = float(stock.get("price", 0) or 0)
    volume = float(stock.get("volume", 0) or 0)
    sector = stock.get("sector", "Other")
    signals: list[dict] = []

    if pct > MOMENTUM_THRESHOLD:
        strength = "strong breakout" if pct > STRONG_MOMENTUM else "bullish momentum"
        signals.append({
            "symbol": sym, "name": name, "price": price,
            "change_percent": round(pct, 2), "sector": sector,
            "type": "momentum",
            "reason": f"Strong upward move (+{pct:.2f}%) — {strength}.",
            "confidence": "high" if pct > STRONG_MOMENTUM else "medium",
        })

    if pct < DIP_THRESHOLD:
        caution = pct < DEEP_DIP
        label = "deep dip — approach with caution" if caution else "potential rebound"
        signals.append({
            "symbol": sym, "name": name, "price": price,
            "change_percent": round(pct, 2), "sector": sector,
            "type": "dip",
            "reason": f"Sharp decline ({pct:.2f}%) — {label}.",
            "confidence": "low" if caution else "medium",
        })

    if median_volume > 0 and volume > median_volume * HIGH_VOL_MULTIPLIER and pct > 0:
        signals.append({
            "symbol": sym, "name": name, "price": price,
            "change_percent": round(pct, 2), "sector": sector,
            "type": "volume_breakout",
            "reason": (
                f"Volume {volume/median_volume:.1f}x above median with positive price action "
                f"(+{pct:.2f}%) — institutional interest likely."
            ),
            "confidence": "high",
        })

    if abs(pct) < CONSOLIDATION_BAND and volume > 0:
        signals.append({
            "symbol": sym, "name": name, "price": price,
            "change_percent": round(pct, 2), "sector": sector,
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
    return s[mid] if len(s) % 2 else (s[mid - 1] + s[mid]) / 2


def find_opportunities(overview: dict[str, Any], types: list[str] | None = None) -> dict[str, Any]:
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

    if types:
        all_signals = [s for s in all_signals if s["type"] in types]

    confidence_rank = {"high": 0, "medium": 1, "low": 2}
    all_signals.sort(key=lambda s: (confidence_rank.get(s["confidence"], 2), -abs(s["change_percent"])))

    summary = {
        "total": len(all_signals),
        "momentum":        sum(1 for s in all_signals if s["type"] == "momentum"),
        "dip":             sum(1 for s in all_signals if s["type"] == "dip"),
        "volume_breakout": sum(1 for s in all_signals if s["type"] == "volume_breakout"),
        "consolidation":   sum(1 for s in all_signals if s["type"] == "consolidation"),
    }

    return {
        "opportunities": all_signals,
        "summary": summary,
        "as_of": overview.get("as_of"),
        "source": overview.get("source", "nse_worker"),
    }
