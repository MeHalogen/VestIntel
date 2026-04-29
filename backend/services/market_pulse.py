"""
Daily Market Pulse — VestIntel
Computes a structured market pulse from NSE Redis data.
No AI dependency.
"""

from __future__ import annotations
from typing import Any


# ─── Direction helpers ────────────────────────────────────────────────────────

def _direction(change_pct: float) -> str:
    if change_pct >= 1.0:
        return "bullish"
    if change_pct <= -1.0:
        return "bearish"
    return "neutral"


def _intensity(change_pct: float) -> str:
    abs_c = abs(change_pct)
    if abs_c >= 2.0:
        return "strong"
    if abs_c >= 0.5:
        return "moderate"
    return "mild"


# ─── Sector trend narrative ───────────────────────────────────────────────────

def _generate_narrative(
    market_direction: str,
    market_intensity: str,
    nifty_change: float,
    banknifty_change: float,
    strongest_sector: dict | None,
    weakest_sector: dict | None,
    breadth: dict,
    top_gainer: dict | None,
    top_loser: dict | None,
) -> str:
    """
    Generates a 3–4 sentence plain-English market narrative.
    Pure rule-based logic — no AI.
    """
    sentences: list[str] = []
    sign = "+" if nifty_change >= 0 else ""

    # ── Sentence 1: Overall market direction ──────────────────────────────────
    direction_phrases: dict[str, dict[str, str]] = {
        "bullish": {
            "strong":   "Markets are strongly bullish today",
            "moderate": "Markets are moderately bullish today",
            "mild":     "Markets are mildly bullish today",
        },
        "bearish": {
            "strong":   "Markets are sharply bearish today",
            "moderate": "Markets are under moderate selling pressure today",
            "mild":     "Markets are slightly bearish today",
        },
        "neutral": {
            "strong":   "Markets are volatile but broadly flat today",
            "moderate": "Markets are broadly flat today",
            "mild":     "Markets are range-bound today",
        },
    }
    direction_phrase = direction_phrases.get(market_direction, {}).get(market_intensity, "Markets are mixed today")

    # Optionally mention BankNIFTY divergence
    bank_note = ""
    if abs(banknifty_change - nifty_change) >= 1.0:
        bank_sign = "+" if banknifty_change >= 0 else ""
        if banknifty_change > nifty_change:
            bank_note = f", with NIFTY BANK outperforming at {bank_sign}{banknifty_change:.2f}%"
        else:
            bank_note = f", with NIFTY BANK lagging at {bank_sign}{banknifty_change:.2f}%"

    sentences.append(
        f"{direction_phrase}, with NIFTY 50 at {sign}{nifty_change:.2f}%{bank_note}."
    )

    # ── Sentence 2: Sector leaders & laggards ────────────────────────────────
    sector_parts: list[str] = []
    if strongest_sector and strongest_sector.get("performance", 0) > 0:
        s = strongest_sector
        intensity_word = "surging" if s["performance"] >= 2.0 else "leading" if s["performance"] >= 1.0 else "nudging higher"
        sector_parts.append(f"{s['sector']} {intensity_word} (+{s['performance']:.2f}%)")
    if weakest_sector and weakest_sector.get("performance", 0) < 0:
        w = weakest_sector
        intensity_word = "under heavy pressure" if w["performance"] <= -2.0 else "showing weakness" if w["performance"] <= -1.0 else "slipping"
        sector_parts.append(f"{w['sector']} {intensity_word} ({w['performance']:.2f}%)")

    if len(sector_parts) == 2:
        sentences.append(f"Sector-wise, {sector_parts[0]}, while {sector_parts[1]}.")
    elif len(sector_parts) == 1:
        sentences.append(f"Sector-wise, {sector_parts[0]}.")

    # ── Sentence 3: Market breadth ────────────────────────────────────────────
    adv = breadth.get("advancing", 0)
    dec = breadth.get("declining", 0)
    total = breadth.get("total", 0)
    if total > 0:
        adv_pct = round(adv / total * 100)
        if adv > dec * 1.5:
            sentences.append(
                f"Breadth is clearly positive — {adv} of {total} stocks are advancing ({adv_pct}%), pointing to broad-based buying interest."
            )
        elif dec > adv * 1.5:
            sentences.append(
                f"Breadth is weak — only {adv} of {total} stocks are advancing ({adv_pct}%), indicating widespread selling pressure."
            )
        elif adv > dec:
            sentences.append(
                f"Breadth is mildly positive with {adv} advancing and {dec} declining out of {total} stocks tracked."
            )
        elif dec > adv:
            sentences.append(
                f"Breadth is mixed but leaning negative — {adv} advancing vs {dec} declining out of {total} stocks."
            )
        else:
            sentences.append(
                f"Breadth is evenly split — {adv} advancing and {dec} declining out of {total} NIFTY 50 stocks."
            )

    # ── Sentence 4: Top mover highlight ──────────────────────────────────────
    if top_gainer and top_loser:
        g_sign = "+" if top_gainer["change_percent"] >= 0 else ""
        sentences.append(
            f"Session standouts: {top_gainer['symbol']} ({g_sign}{top_gainer['change_percent']:.2f}%) led gains, "
            f"while {top_loser['symbol']} ({top_loser['change_percent']:.2f}%) was the biggest drag."
        )
    elif top_gainer:
        sentences.append(
            f"{top_gainer['symbol']} was the top performer with +{top_gainer['change_percent']:.2f}% for the session."
        )
    elif top_loser:
        sentences.append(
            f"{top_loser['symbol']} was the session's biggest laggard at {top_loser['change_percent']:.2f}%."
        )

    return " ".join(sentences)


def _sector_trend_summary(sector_performance: list[dict]) -> str:
    """Return a human-readable sector narrative, e.g. 'IT weak, FMCG strong'."""
    if not sector_performance:
        return "No sector data available."

    sorted_sectors = sorted(sector_performance, key=lambda s: s.get("performance", 0))

    weakest = sorted_sectors[:2]
    strongest = sorted_sectors[-2:]

    parts: list[str] = []
    for s in strongest[::-1]:  # strongest first
        pct = s.get("performance", 0)
        label = "strong" if pct >= 1.0 else "up"
        parts.append(f"{s['sector']} {label} (+{pct:.2f}%)")

    for s in weakest:
        pct = s.get("performance", 0)
        label = "weak" if pct <= -1.0 else "down"
        parts.append(f"{s['sector']} {label} ({pct:.2f}%)")

    return ", ".join(parts)


def _sector_breakdown(sector_performance: list[dict]) -> list[dict]:
    """Return full sector list with direction tags."""
    result = []
    for s in sorted(sector_performance, key=lambda x: x.get("performance", 0), reverse=True):
        pct = s.get("performance", 0)
        result.append(
            {
                "sector": s["sector"],
                "performance": round(pct, 2),
                "direction": _direction(pct),
                "intensity": _intensity(pct),
                "count": s.get("count", 0),
            }
        )
    return result


# ─── Main ─────────────────────────────────────────────────────────────────────

def compute_market_pulse(overview: dict[str, Any]) -> dict[str, Any]:
    """
    overview: the dict stored in Redis under `nse:india_overview`

    Returns a structured daily market pulse.
    """
    nifty = overview.get("nifty") or {}
    banknifty = overview.get("banknifty") or {}
    heatmap: list[dict] = overview.get("heatmap") or []
    top_gainers: list[dict] = overview.get("top_gainers") or []
    top_losers: list[dict] = overview.get("top_losers") or []
    sector_performance: list[dict] = overview.get("sector_performance") or []

    # ── Index metrics ──
    nifty_change = nifty.get("change_percent", 0) or 0
    banknifty_change = banknifty.get("change_percent", 0) or 0

    # ── Market direction: weighted vote across NIFTY50 stocks ──
    up_count = sum(1 for s in heatmap if s.get("pChange", 0) > 0)
    down_count = sum(1 for s in heatmap if s.get("pChange", 0) < 0)
    total_stocks = len(heatmap)

    if total_stocks:
        up_ratio = up_count / total_stocks
    else:
        up_ratio = 0.5

    # Also factor in NIFTY direction
    if nifty_change >= 1.0 or up_ratio >= 0.6:
        market_direction = "bullish"
    elif nifty_change <= -1.0 or up_ratio <= 0.4:
        market_direction = "bearish"
    else:
        market_direction = "neutral"

    # ── Top gainer / loser ──
    def _stock_card(s: dict) -> dict:
        return {
            "symbol": s.get("symbol", ""),
            "name": s.get("name", s.get("symbol", "")),
            "price": round(s.get("price", 0), 2),
            "change": round(s.get("change", 0), 2),
            "change_percent": round(s.get("pChange", s.get("change_percent", 0)), 2),
            "sector": s.get("sector", "Other"),
            "volume": s.get("volume", 0),
            "intensity": _intensity(s.get("pChange", 0)),
        }

    top_gainer: dict | None = None
    top_loser: dict | None = None

    if top_gainers:
        top_gainer = _stock_card(top_gainers[0])
    elif heatmap:
        best = max(heatmap, key=lambda s: s.get("pChange", 0))
        top_gainer = _stock_card(best)

    if top_losers:
        top_loser = _stock_card(top_losers[0])
    elif heatmap:
        worst = min(heatmap, key=lambda s: s.get("pChange", 0))
        top_loser = _stock_card(worst)

    # ── Breadth ──
    advance_decline_ratio = round(up_count / max(down_count, 1), 2)

    # ── Sector trend ──
    sector_trend = _sector_trend_summary(sector_performance)
    sectors = _sector_breakdown(sector_performance)

    # ── Strongest / weakest sector ──
    strongest_sector = sectors[0] if sectors else None
    weakest_sector = sectors[-1] if sectors else None

    # ── Notable movers (top 3 up + top 3 down from heatmap) ──
    sorted_heatmap = sorted(heatmap, key=lambda s: s.get("pChange", 0))
    notable_movers = [_stock_card(s) for s in sorted_heatmap[-3:][::-1]] + \
                     [_stock_card(s) for s in sorted_heatmap[:3]]

    # ── Narrative ──
    breadth_dict = {
        "advancing": up_count,
        "declining": down_count,
        "total": total_stocks,
    }
    narrative = _generate_narrative(
        market_direction=market_direction,
        market_intensity=_intensity(nifty_change),
        nifty_change=nifty_change,
        banknifty_change=banknifty_change,
        strongest_sector=strongest_sector,
        weakest_sector=weakest_sector,
        breadth=breadth_dict,
        top_gainer=top_gainer,
        top_loser=top_loser,
    )

    return {
        "as_of": overview.get("as_of"),
        "source": overview.get("source", "nse_worker"),

        # Core verdict
        "market_direction": market_direction,
        "market_intensity": _intensity(nifty_change),
        "narrative": narrative,
        "summary": (
            f"NIFTY 50 {'+' if nifty_change >= 0 else ''}{nifty_change:.2f}% — "
            f"market is {market_direction}. "
            f"{up_count} stocks advancing, {down_count} declining."
        ),

        # Index snapshot
        "indices": {
            "nifty": {
                "name": nifty.get("name", "NIFTY 50"),
                "value": nifty.get("value", 0),
                "change_percent": round(nifty_change, 2),
                "direction": _direction(nifty_change),
            },
            "banknifty": {
                "name": banknifty.get("name", "NIFTY BANK"),
                "value": banknifty.get("value", 0),
                "change_percent": round(banknifty_change, 2),
                "direction": _direction(banknifty_change),
            },
        },

        # Movers
        "top_gainer": top_gainer,
        "top_loser": top_loser,
        "notable_movers": notable_movers,

        # Breadth
        "breadth": {
            "advancing": up_count,
            "declining": down_count,
            "unchanged": total_stocks - up_count - down_count,
            "total": total_stocks,
            "advance_decline_ratio": advance_decline_ratio,
        },

        # Sectors
        "sector_trend": sector_trend,
        "sectors": sectors,
        "strongest_sector": strongest_sector,
        "weakest_sector": weakest_sector,
    }
