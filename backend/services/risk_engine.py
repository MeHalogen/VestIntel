"""
Rule-Based Portfolio Risk Engine — VestIntel
Score out of 100 (higher = safer).
"""
from __future__ import annotations
from typing import Any

_SECTOR_MAP: dict[str, str] = {
    "RELIANCE": "Energy", "ONGC": "Energy", "BPCL": "Energy", "POWERGRID": "Utilities",
    "NTPC": "Utilities", "ADANIPORTS": "Industrials", "ADANIENT": "Industrials",
    "TCS": "IT", "INFY": "IT", "WIPRO": "IT", "TECHM": "IT", "HCLTECH": "IT",
    "HDFCBANK": "Banking", "ICICIBANK": "Banking", "KOTAKBANK": "Banking",
    "AXISBANK": "Banking", "SBIN": "Banking", "INDUSINDBK": "Banking", "BANDHANBNK": "Banking",
    "BAJFINANCE": "NBFC", "BAJAJFINSV": "NBFC", "SBILIFE": "Insurance", "HDFCLIFE": "Insurance",
    "HINDUNILVR": "FMCG", "ITC": "FMCG", "NESTLEIND": "FMCG", "BRITANNIA": "FMCG",
    "MARUTI": "Auto", "M&M": "Auto", "TATAMOTORS": "Auto", "HEROMOTOCO": "Auto",
    "BAJAJ-AUTO": "Auto", "EICHERMOT": "Auto",
    "SUNPHARMA": "Pharma", "DRREDDY": "Pharma", "CIPLA": "Pharma", "DIVISLAB": "Pharma",
    "APOLLOHOSP": "Healthcare", "TATASTEEL": "Metals", "JSWSTEEL": "Metals", "HINDALCO": "Metals",
    "ULTRACEMCO": "Cement", "GRASIM": "Cement", "BHARTIARTL": "Telecom",
    "ASIANPAINT": "Paints", "TITAN": "Consumer Discretionary", "LT": "Engineering",
    "COALINDIA": "Mining",
}
_HIGH_VOL = {"TATAMOTORS","ADANIENT","ADANIPORTS","INDUSINDBK","BANDHANBNK","BAJFINANCE","DIVISLAB","COALINDIA"}
_LOW_VOL  = {"HINDUNILVR","ITC","NESTLEIND","BRITANNIA","ASIANPAINT","POWERGRID","NTPC","TCS","INFY"}

def _sector(sym: str) -> str:
    s = sym.upper().replace(".NS","").replace(".BO","")
    return _SECTOR_MAP.get(s, "Other")

def _vol(sym: str) -> str:
    s = sym.upper().replace(".NS","").replace(".BO","")
    if s in _HIGH_VOL: return "high"
    if s in _LOW_VOL: return "low"
    return "medium"

def _concentration(holdings):
    if not holdings: return {"level":"low","penalty":0,"why":"No holdings."}
    ws = sorted([h["weight"] for h in holdings], reverse=True)
    t1, t2 = ws[0], sum(ws[:2])
    if t1 > 50: return {"level":"high","penalty":30,"why":f"Single holding is {t1:.0f}% — extreme concentration."}
    if t1 > 30: return {"level":"high","penalty":20,"why":f"Largest holding is {t1:.0f}% — high concentration."}
    if t2 > 50: return {"level":"medium","penalty":10,"why":f"Top 2 holdings are {t2:.0f}% — moderate concentration."}
    if t1 > 20: return {"level":"medium","penalty":5,"why":f"Largest holding is {t1:.0f}% — slight concentration."}
    return {"level":"low","penalty":0,"why":"Well-diversified across individual holdings."}

def _sector_exp(holdings):
    sw: dict[str,float] = {}
    for h in holdings:
        s = _sector(h["symbol"])
        sw[s] = sw.get(s, 0) + h["weight"]
    if not sw: return {"level":"low","penalty":0,"why":"No sector data.","sector_weights":{}}
    top  = max(sw, key=sw.__getitem__)
    pct  = sw[top]
    n    = len(sw)
    if pct > 60: r = {"level":"high","penalty":20,"why":f"{pct:.0f}% in {top} — very high sector risk."}
    elif pct > 40: r = {"level":"medium","penalty":10,"why":f"{pct:.0f}% in {top} — moderate sector concentration."}
    elif n < 3: r = {"level":"medium","penalty":5,"why":f"Only {n} sector(s) — consider broader diversification."}
    else: r = {"level":"low","penalty":0,"why":f"Good diversification across {n} sectors."}
    r["sector_weights"] = {k: round(v,1) for k,v in sorted(sw.items(), key=lambda x: -x[1])}
    return r

def _volatility(holdings):
    hvw = sum(h["weight"] for h in holdings if _vol(h["symbol"]) == "high")
    if hvw > 50: return {"level":"high","penalty":15,"why":f"{hvw:.0f}% in high-volatility stocks."}
    if hvw > 25: return {"level":"medium","penalty":8,"why":f"{hvw:.0f}% in high-volatility names."}
    return {"level":"low","penalty":0,"why":"Portfolio skews toward lower-volatility stocks."}

def analyze_risk(holdings_raw: list[dict[str, Any]]) -> dict[str, Any]:
    holdings = [
        {"symbol": h["symbol"].upper().strip(), "weight": float(h.get("weight", 0))}
        for h in holdings_raw if h.get("symbol") and float(h.get("weight", 0)) > 0
    ]
    conc  = _concentration(holdings)
    sec   = _sector_exp(holdings)
    vol   = _volatility(holdings)
    score = max(0, 100 - conc["penalty"] - sec["penalty"] - vol["penalty"])
    level = "low" if score >= 75 else "medium" if score >= 50 else "high"

    issues = [x["why"] for x in [conc, sec, vol] if x["level"] != "low"]
    suggestions = []
    if conc["level"] == "high":   suggestions.append("Trim your largest position to below 30%.")
    if len(sec.get("sector_weights", {})) < 4: suggestions.append("Add stocks from under-represented sectors.")
    if vol["level"] == "high":    suggestions.append("Balance with stable large-caps (e.g. INFY, TCS, HINDUNILVR).")
    if not issues:                suggestions.append("Portfolio is well-balanced. Monitor periodically for drift.")

    return {
        "score": score, "risk_level": level,
        "explanation": (
            f"Your portfolio scores {score}/100 — {level} risk. "
            + (f"Key concern: {issues[0]}" if issues else "No major risk flags detected.")
        ),
        "issues": issues, "suggestions": suggestions,
        "breakdown": {"concentration": conc, "sector_exposure": sec, "volatility": vol},
        "holdings_analyzed": [
            {"symbol": h["symbol"], "weight": h["weight"], "sector": _sector(h["symbol"])}
            for h in holdings
        ],
    }
