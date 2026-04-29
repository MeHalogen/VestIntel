"""
Rule-Based Market Pulse — VestIntel
"""
from __future__ import annotations
from typing import Any


def _direction(pct: float) -> str:
    if pct > 0.5: return "bullish"
    if pct < -0.5: return "bearish"
    return "neutral"

def _intensity(pct: float) -> str:
    a = abs(pct)
    if a >= 1.5: return "strong"
    if a >= 0.75: return "moderate"
    return "weak"

def _sector_trend(sectors: list[dict]) -> str:
    if not sectors: return "mixed"
    up   = sum(1 for s in sectors if s.get("performance", 0) > 0)
    down = sum(1 for s in sectors if s.get("performance", 0) < 0)
    if up > down * 2: return "broad-based rally"
    if down > up * 2: return "broad-based selloff"
    if up > down: return "more sectors advancing"
    if down > up: return "more sectors declining"
    return "mixed"

def _narrative(nifty_pct, advancing, declining, total, sector_trend, top_gainer, top_loser) -> str:
    dir_word = "rising" if nifty_pct > 0 else "falling" if nifty_pct < 0 else "flat"
    lines = [
        f"NIFTY 50 is {dir_word} {abs(nifty_pct):.2f}% with a {sector_trend} across sectors. "
        f"{advancing} of {total} stocks are advancing while {declining} are declining."
    ]
    if top_gainer:
        lines.append(f"{top_gainer['symbol']} leads today's gainers with a {top_gainer['change_percent']:+.2f}% move.")
    if top_loser:
        lines.append(f"{top_loser['symbol']} is the biggest laggard, down {abs(top_loser['change_percent']):.2f}%.")
    return " ".join(lines)


def build_pulse(overview: dict[str, Any]) -> dict[str, Any]:
    heatmap: list[dict] = overview.get("heatmap") or overview.get("nifty50") or []
    as_of   = overview.get("as_of")
    source  = overview.get("source", "nse_worker")
    nifty_data     = overview.get("nifty", {})
    banknifty_data = overview.get("banknifty", {})
    nifty_pct  = float(nifty_data.get("change_percent", 0) or 0)
    nifty_val  = float(nifty_data.get("value", 0) or 0)
    bnifty_pct = float(banknifty_data.get("change_percent", 0) or 0)
    bnifty_val = float(banknifty_data.get("value", 0) or 0)

    if not heatmap:
        return {
            "market_direction": "neutral", "market_intensity": "weak",
            "summary": "Market data unavailable — NSE worker may not be running.",
            "narrative": "No NIFTY 50 data in cache. Start the NSE worker to populate live data.",
            "as_of": as_of, "source": source,
            "indices": {
                "nifty":     {"name": "NIFTY 50",   "value": 0, "change_percent": 0, "direction": "neutral"},
                "banknifty": {"name": "NIFTY BANK",  "value": 0, "change_percent": 0, "direction": "neutral"},
            },
            "breadth": {"advancing": 0, "declining": 0, "unchanged": 0, "total": 0, "advance_decline_ratio": "N/A"},
            "sectors": [], "sector_trend": "mixed",
            "top_gainer": None, "top_loser": None, "notable_movers": [],
        }

    advancing = sum(1 for s in heatmap if float(s.get("change_percent", 0) or 0) > 0)
    declining = sum(1 for s in heatmap if float(s.get("change_percent", 0) or 0) < 0)
    unchanged = len(heatmap) - advancing - declining
    total     = len(heatmap)
    ad_ratio  = f"{advancing/declining:.2f}" if declining > 0 else "inf"

    sector_perf = overview.get("sector_performance", [])
    sectors = [
        {"sector": s["sector"], "performance": s["performance"], "count": s["count"],
         "direction": "up" if s["performance"] > 0 else "down" if s["performance"] < 0 else "flat"}
        for s in sector_perf
    ]
    s_trend = _sector_trend(sector_perf)

    sorted_stocks = sorted(heatmap, key=lambda x: float(x.get("change_percent", 0) or 0), reverse=True)
    top_gainer = sorted_stocks[0] if sorted_stocks else None
    top_loser  = sorted_stocks[-1] if sorted_stocks else None

    notable = [
        {"symbol": s["symbol"], "sector": s.get("sector", ""),
         "price": float(s.get("price", 0) or 0), "change_percent": float(s.get("change_percent", 0) or 0)}
        for s in heatmap if abs(float(s.get("change_percent", 0) or 0)) > 2.0
    ]
    notable.sort(key=lambda x: abs(x["change_percent"]), reverse=True)

    def _mover(s):
        return {"symbol": s["symbol"], "sector": s.get("sector", ""),
                "price": float(s.get("price", 0) or 0), "change_percent": float(s.get("change_percent", 0) or 0)}

    return {
        "market_direction": _direction(nifty_pct),
        "market_intensity": _intensity(nifty_pct),
        "summary": (
            f"NIFTY 50 {'up' if nifty_pct >= 0 else 'down'} {abs(nifty_pct):.2f}% — "
            f"{advancing}/{total} stocks advancing, {s_trend}."
        ),
        "narrative": _narrative(nifty_pct, advancing, declining, total, s_trend, top_gainer, top_loser),
        "as_of": as_of, "source": source,
        "indices": {
            "nifty":     {"name": "NIFTY 50",   "value": nifty_val,  "change_percent": nifty_pct,  "direction": _direction(nifty_pct)},
            "banknifty": {"name": "NIFTY BANK",  "value": bnifty_val, "change_percent": bnifty_pct, "direction": _direction(bnifty_pct)},
        },
        "breadth": {"advancing": advancing, "declining": declining, "unchanged": unchanged,
                    "total": total, "advance_decline_ratio": ad_ratio},
        "sectors": sectors, "sector_trend": s_trend,
        "top_gainer": _mover(top_gainer) if top_gainer else None,
        "top_loser":  _mover(top_loser)  if top_loser  else None,
        "notable_movers": notable[:10],
    }
