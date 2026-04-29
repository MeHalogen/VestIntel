"""
Portfolio Risk Engine — VestIntel
Pure maths, no AI dependency.
"""

from __future__ import annotations
from typing import Any

# ─── Sector mapping (NSE stocks → broad sector) ───────────────────────────────
SECTOR_MAP: dict[str, str] = {
    # IT / Technology
    "TCS": "IT",
    "INFY": "IT",
    "WIPRO": "IT",
    "HCLTECH": "IT",
    "TECHM": "IT",
    "LTIM": "IT",
    "MPHASIS": "IT",
    "COFORGE": "IT",
    "PERSISTENT": "IT",
    # Banking / Finance
    "HDFCBANK": "Banking",
    "ICICIBANK": "Banking",
    "SBIN": "Banking",
    "KOTAKBANK": "Banking",
    "AXISBANK": "Banking",
    "INDUSINDBK": "Banking",
    "BAJFINANCE": "Banking",
    "BAJAJFINSV": "Banking",
    "FEDERALBNK": "Banking",
    "IDFCFIRSTB": "Banking",
    # FMCG / Consumer
    "ITC": "FMCG",
    "HINDUNILVR": "FMCG",
    "NESTLEIND": "FMCG",
    "BRITANNIA": "FMCG",
    "DABUR": "FMCG",
    "MARICO": "FMCG",
    "GODREJCP": "FMCG",
    "COLPAL": "FMCG",
    # Energy / Oil & Gas
    "RELIANCE": "Energy",
    "ONGC": "Energy",
    "BPCL": "Energy",
    "IOC": "Energy",
    "GAIL": "Energy",
    "POWERGRID": "Energy",
    "NTPC": "Energy",
    "TATAPOWER": "Energy",
    "ADANIGREEN": "Energy",
    "ADANIPOWER": "Energy",
    # Pharma / Healthcare
    "SUNPHARMA": "Pharma",
    "DRREDDY": "Pharma",
    "CIPLA": "Pharma",
    "DIVISLAB": "Pharma",
    "APOLLOHOSP": "Pharma",
    "LUPIN": "Pharma",
    "BIOCON": "Pharma",
    # Auto
    "MARUTI": "Auto",
    "TATAMOTORS": "Auto",
    "M&M": "Auto",
    "BAJAJ-AUTO": "Auto",
    "HEROMOTOCO": "Auto",
    "EICHERMOT": "Auto",
    # Metals / Materials
    "TATASTEEL": "Metals",
    "JSWSTEEL": "Metals",
    "HINDALCO": "Metals",
    "COALINDIA": "Metals",
    "VEDL": "Metals",
    "SAIL": "Metals",
    # Telecom
    "BHARTIARTL": "Telecom",
    "IDEA": "Telecom",
    # Infra / Cement
    "ADANIPORTS": "Infra",
    "ULTRACEMCO": "Infra",
    "SHREECEM": "Infra",
    "GRASIM": "Infra",
    "LT": "Infra",
}

DEFAULT_SECTOR = "Other"

# Sector-diversification suggestions
SECTOR_SUGGESTIONS: dict[str, str] = {
    "IT": "Reduce IT exposure — consider Banking or FMCG stocks for balance.",
    "Banking": "Reduce Banking exposure — consider IT or Pharma stocks.",
    "FMCG": "Reduce FMCG exposure — consider Energy or IT stocks.",
    "Energy": "Reduce Energy exposure — consider Banking or FMCG stocks.",
    "Pharma": "Reduce Pharma exposure — consider IT or Banking stocks.",
    "Auto": "Reduce Auto exposure — consider FMCG or Banking stocks.",
    "Metals": "Reduce Metals exposure — consider FMCG or IT stocks.",
    "Infra": "Reduce Infra exposure — consider IT or Banking stocks.",
    "Telecom": "Reduce Telecom exposure — consider FMCG or Energy stocks.",
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _normalize_weights(holdings: list[dict]) -> list[dict]:
    """Ensure weights sum to 100. Scale proportionally if not."""
    total = sum(h.get("weight", 0) for h in holdings)
    if total == 0:
        raise ValueError("All weights are zero.")
    factor = 100.0 / total
    return [
        {**h, "weight": round(h["weight"] * factor, 4)}
        for h in holdings
    ]


def _sector_for(symbol: str) -> str:
    return SECTOR_MAP.get(symbol.upper().strip(), DEFAULT_SECTOR)


def _concentration_risk(
    holdings: list[dict],
) -> tuple[str, int, list[str], str, str]:
    """
    Returns (level, penalty, issues, tooltip, why)
    """
    sorted_w = sorted([h["weight"] for h in holdings], reverse=True)
    issues: list[str] = []
    penalty = 0
    level = "LOW"

    if sorted_w and sorted_w[0] > 40:
        level = "HIGH"
        penalty = 30
        sym = next(h["symbol"] for h in holdings if h["weight"] == sorted_w[0])
        issues.append(
            f"{sym} has {sorted_w[0]:.1f}% weight — single stock concentration is HIGH (>40%)."
        )
        tooltip = f"Concentration risk is HIGH because {sym} exceeds 40% of the portfolio. A single stock drawdown can cause major losses."
        why = f"{sym} alone makes up {sorted_w[0]:.1f}% of your portfolio. Best practice caps any single stock at 20–25%."
    elif len(sorted_w) >= 2 and sorted_w[0] + sorted_w[1] > 60:
        level = "MEDIUM"
        penalty = 15
        top2 = sorted(holdings, key=lambda h: h["weight"], reverse=True)[:2]
        syms = " + ".join(h["symbol"] for h in top2)
        issues.append(
            f"Top 2 stocks ({syms}) account for {sorted_w[0]+sorted_w[1]:.1f}% — concentration is MEDIUM (>60%)."
        )
        tooltip = f"Concentration risk is MEDIUM because the top 2 stocks ({syms}) together exceed 60% of the portfolio."
        why = f"{syms} combine for {sorted_w[0]+sorted_w[1]:.1f}%. Spreading across more stocks reduces dependency on any two positions."
    else:
        top = sorted_w[0] if sorted_w else 0
        tooltip = "Concentration risk is LOW — no single stock dominates the portfolio. Weight is well distributed."
        why = f"Largest single holding is {top:.1f}% — within healthy limits (below 40%)."

    return level, penalty, issues, tooltip, why


def _sector_risk(
    holdings: list[dict],
) -> tuple[str, int, list[str], list[str], str, str]:
    """
    Returns (level, penalty, issues, suggestions, tooltip, why)
    """
    sector_weights: dict[str, float] = {}
    for h in holdings:
        s = _sector_for(h["symbol"])
        sector_weights[s] = sector_weights.get(s, 0) + h["weight"]

    issues: list[str] = []
    suggestions: list[str] = []
    penalty = 0
    level = "LOW"
    dominant_sector = max(sector_weights, key=lambda k: sector_weights[k]) if sector_weights else "Other"
    dominant_pct = sector_weights.get(dominant_sector, 0)

    for sector, weight in sector_weights.items():
        if weight > 50:
            level = "HIGH"
            penalty = max(penalty, 20)
            issues.append(
                f"{sector} sector accounts for {weight:.1f}% of portfolio — sector exposure is HIGH (>50%)."
            )
            if sector in SECTOR_SUGGESTIONS:
                suggestions.append(SECTOR_SUGGESTIONS[sector])

    if level == "HIGH":
        tooltip = f"Sector exposure is HIGH because the {dominant_sector} sector makes up {dominant_pct:.1f}% of the portfolio (threshold: 50%). A single-sector downturn can severely impact returns."
        why = f"Your portfolio is heavily concentrated in {dominant_sector} ({dominant_pct:.1f}%). Regulatory changes, earnings misses, or macro shifts in {dominant_sector} affect all your holdings simultaneously."
    else:
        num_sectors = len(sector_weights)
        tooltip = f"Sector exposure is LOW — portfolio spans {num_sectors} sector(s) with no single sector exceeding 50%."
        why = f"Largest sector is {dominant_sector} at {dominant_pct:.1f}%. Healthy diversification across {num_sectors} sector(s) reduces sector-specific risk."

    return level, penalty, issues, suggestions, tooltip, why


def _volatility_risk(
    holdings: list[dict],
    nse_data: dict[str, float],
) -> tuple[str, int, list[str], str, str]:
    """
    nse_data: {symbol: pChange}
    Weighted average absolute % change as volatility proxy.
    Returns (level, penalty, issues, tooltip, why)
    """
    issues: list[str] = []
    weighted_vol = 0.0
    missing = []

    for h in holdings:
        sym = h["symbol"].upper()
        p_change = nse_data.get(sym)
        if p_change is None:
            missing.append(sym)
            continue
        weighted_vol += abs(p_change) * (h["weight"] / 100)

    if missing:
        issues.append(f"No live data for: {', '.join(missing)} — volatility estimate may be understated.")

    # Score mapping: 0–0.5% → low, 0.5–1.5% → medium, >1.5% → high
    if weighted_vol > 1.5:
        level = "HIGH"
        penalty = 20
        issues.append(
            f"Weighted daily volatility is {weighted_vol:.2f}% — portfolio is experiencing HIGH short-term movement."
        )
        tooltip = f"Volatility is HIGH — your portfolio's weighted daily price movement is {weighted_vol:.2f}%, well above the 1.5% threshold. Short-term swings are large."
        why = f"A {weighted_vol:.2f}% average daily swing means your portfolio value can fluctuate significantly day-to-day. Consider adding stable, low-beta stocks."
    elif weighted_vol > 0.5:
        level = "MEDIUM"
        penalty = 10
        issues.append(
            f"Weighted daily volatility is {weighted_vol:.2f}% — MEDIUM short-term movement."
        )
        tooltip = f"Volatility is MEDIUM — weighted daily movement is {weighted_vol:.2f}% (range: 0.5–1.5%). Portfolio shows moderate daily swings."
        why = f"Daily portfolio movement of {weighted_vol:.2f}% is moderate. Adding FMCG or Pharma stocks with lower beta could reduce this."
    else:
        level = "LOW"
        penalty = 0
        tooltip = f"Volatility is LOW — weighted daily movement is only {weighted_vol:.2f}%. Portfolio is relatively stable in current market conditions."
        why = f"Portfolio shows minimal daily price swings ({weighted_vol:.2f}%). This is well within a healthy range."

    return level, penalty, issues, tooltip, why


def _diversification_suggestions(holdings: list[dict], existing_suggestions: list[str]) -> list[str]:
    suggestions = list(existing_suggestions)

    if len(holdings) < 5:
        suggestions.append(
            f"Portfolio has only {len(holdings)} stock(s) — consider holding at least 8–12 stocks for proper diversification."
        )
    elif len(holdings) < 8:
        suggestions.append(
            "Consider adding 2–3 more stocks across different sectors to improve diversification."
        )

    sectors = {_sector_for(h["symbol"]) for h in holdings}
    if len(sectors) == 1:
        suggestions.append(
            "All stocks are in the same sector — this is a high-risk single-sector portfolio."
        )
    elif len(sectors) <= 2:
        suggestions.append(
            "Portfolio spans only 2 sectors — add exposure to FMCG, Pharma, or Banking for resilience."
        )

    return suggestions


# ─── Main public function ──────────────────────────────────────────────────────

def compute_portfolio_risk(
    holdings: list[dict[str, Any]],
    nse_data: dict[str, float],
) -> dict[str, Any]:
    """
    holdings: [{"symbol": "RELIANCE", "weight": 30}, ...]
    nse_data: {"RELIANCE": 0.85, "INFY": -0.32, ...}  (pChange values)

    Returns structured risk report.
    """
    # Step 0: normalize
    holdings = _normalize_weights(holdings)

    # Step 1: concentration
    conc_level, conc_penalty, conc_issues, conc_tooltip, conc_why = _concentration_risk(holdings)

    # Step 2: sector
    sec_level, sec_penalty, sec_issues, sec_suggestions, sec_tooltip, sec_why = _sector_risk(holdings)

    # Step 3: volatility
    vol_level, vol_penalty, vol_issues, vol_tooltip, vol_why = _volatility_risk(holdings, nse_data)

    # Step 4: score
    total_penalty = conc_penalty + sec_penalty + vol_penalty
    score = max(0, min(100, 100 - total_penalty))

    # Step 5: overall risk level
    levels = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
    max_level = max(
        [conc_level, sec_level, vol_level],
        key=lambda l: levels.get(l, 1),
    )

    # Step 6: suggestions
    all_issues = conc_issues + sec_issues + vol_issues
    all_suggestions = _diversification_suggestions(holdings, sec_suggestions)

    # Step 7: breakdown
    sector_breakdown: dict[str, float] = {}
    for h in holdings:
        s = _sector_for(h["symbol"])
        sector_breakdown[s] = round(sector_breakdown.get(s, 0) + h["weight"], 2)

    # Step 8: plain-English explanation
    dominant_sector = max(sector_breakdown, key=lambda k: sector_breakdown[k]) if sector_breakdown else "Unknown"
    dominant_pct = sector_breakdown.get(dominant_sector, 0)
    num_stocks = len(holdings)
    num_sectors = len(sector_breakdown)

    explanation_parts: list[str] = []
    if conc_level == "HIGH":
        top_sym = max(holdings, key=lambda h: h["weight"])
        explanation_parts.append(
            f"{top_sym['symbol']} dominates your portfolio at {top_sym['weight']:.1f}%, creating high single-stock risk."
        )
    elif conc_level == "MEDIUM":
        explanation_parts.append("Your top two holdings account for a large share of the portfolio.")

    if sec_level == "HIGH":
        explanation_parts.append(
            f"Your portfolio is heavily exposed to the {dominant_sector} sector ({dominant_pct:.1f}%), increasing sector-specific risk."
        )
    elif num_sectors >= 3:
        explanation_parts.append(
            f"Sector spread across {num_sectors} industries provides reasonable diversification."
        )

    if vol_level == "HIGH":
        explanation_parts.append("Current market conditions are causing high day-to-day swings in your holdings.")
    elif vol_level == "LOW":
        explanation_parts.append("Your holdings are showing stable price movement in the current session.")

    if not explanation_parts:
        explanation_parts.append(
            f"Portfolio of {num_stocks} stocks across {num_sectors} sector(s) — risk is well managed."
        )

    explanation = " ".join(explanation_parts)

    return {
        "score": score,
        "risk_level": max_level.lower(),
        "explanation": explanation,
        "issues": all_issues,
        "suggestions": all_suggestions,
        "breakdown": {
            "concentration": {
                "level": conc_level.lower(),
                "penalty": conc_penalty,
                "tooltip": conc_tooltip,
                "why": conc_why,
            },
            "sector_exposure": {
                "level": sec_level.lower(),
                "penalty": sec_penalty,
                "tooltip": sec_tooltip,
                "why": sec_why,
                "sector_weights": sector_breakdown,
            },
            "volatility": {
                "level": vol_level.lower(),
                "penalty": vol_penalty,
                "tooltip": vol_tooltip,
                "why": vol_why,
            },
        },
        "holdings_analyzed": [
            {
                "symbol": h["symbol"].upper(),
                "weight": h["weight"],
                "sector": _sector_for(h["symbol"]),
            }
            for h in holdings
        ],
    }
