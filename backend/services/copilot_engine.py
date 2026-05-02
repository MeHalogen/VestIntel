"""
VestIntel Rule-Based Copilot Engine
=====================================
No OpenAI. No external APIs. Pure NSE data → structured response.

All responses are deterministic, fast (<5ms) and drawn entirely from
the nse:market / nse:nifty50 Redis payload.

Query types handled
-------------------
- gainers       → top gainers today
- losers        → top losers today
- market        → overall market summary
- why <SYMBOL>  → explain a stock's move
- compare X Y   → head-to-head comparison
- sector        → sector performance
- volume        → unusual volume movers
- fallback      → help message with suggestions
"""

from __future__ import annotations

import re
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("vestintel.copilot")

# ─── NSE universe (used for symbol extraction) ────────────────────────────────
_NSE_SYMBOLS = {
    # NIFTY 50
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR",
    "SBIN", "BAJFINANCE", "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK",
    "MARUTI", "SUNPHARMA", "TITAN", "WIPRO", "ULTRACEMCO", "NTPC",
    "POWERGRID", "ONGC", "COALINDIA", "TATASTEEL", "HINDALCO",
    "JSWSTEEL", "BAJAJFINSV", "ADANIPORTS", "TECHM", "DRREDDY",
    "CIPLA", "EICHERMOT", "HEROMOTOCO", "DIVISLAB", "BRITANNIA",
    "GRASIM", "INDUSINDBK", "BPCL", "IOC", "TATACONSUM",
    "ETERNAL", "APOLLOHOSP", "NESTLEIND", "ASIANPAINT", "HCLTECH",
    "BAJAJ-AUTO", "TATAPOWER", "ADANIENT", "TMPV",
    # Popular beyond NIFTY 50
    "ADANIGREEN", "ADANITRANS", "ADANIGAS", "ADANIWILMAR",
    "ZOMATO", "NYKAA", "PAYTM", "POLICYBZR", "DELHIVERY",
    "IRCTC", "IRFC", "RVNL", "HAL", "BEL", "BHEL", "SAIL",
    "TATACOMM", "TATAMOTORS", "TATAELXSI", "TATACHEM",
    "PIDILITIND", "ABBOTINDIA", "ALKEM", "AUROPHARMA", "BIOCON",
    "HDFCLIFE", "SBILIFE", "ICICIlombard", "ICICIGI",
    "MUTHOOTFIN", "BAJAJHLDNG", "CHOLAFIN", "MANAPPURAM",
    "VEDL", "NMDC", "MOIL", "NATIONALUM",
    "DLF", "GODREJPROP", "OBEROIRLTY", "PRESTIGE",
    "ZYDUSLIFE", "LUPIN", "TORNTPHARM", "IPCALAB",
    "INDIGO", "SPICEJET", "TITAGARH",
    "HDFCAMC", "NAUKRI", "JUSTDIAL",
    "PNB", "CANBK", "UNIONBANK", "BANKBARODA",
    "SIEMENS", "ABB", "CUMMINSIND", "THERMAX",
    "VOLTAS", "HAVELLS", "CROMPTON", "BLUESTARCO",
}

# ─── Common-English stopwords that must NOT be treated as ticker symbols ──────
_STOPWORDS: frozenset = frozenset({
    "WHAT", "ABOUT", "WITH", "FROM", "HAVE", "THIS", "THAT", "THEY",
    "WILL", "BEEN", "WERE", "WHEN", "THEN", "THAN", "ALSO", "INTO",
    "JUST", "LIKE", "SOME", "TELL", "SHOW", "GIVE", "DOES", "MAKE",
    "SHOULD", "COULD", "WOULD", "WHICH", "WHERE", "THERE", "THEIR",
    "YOUR", "DOING", "GOING", "HELP", "KNOW", "LOOK", "MOVE", "MOST",
    "MUCH", "MORE", "MANY", "ONLY", "OVER", "SAME", "SUCH", "TAKE",
    "VERY", "WANT", "WELL", "BEEN", "BOTH", "EACH", "EVEN", "EVER",
    "FIND", "GOOD", "BEST", "LAST", "LONG", "NEXT", "HIGH", "OPEN",
    "DOWN", "YEAR", "WEAK", "STRONG", "PRICE", "STOCK", "SHARE",
    "INDEX", "FUND", "TRADE", "TODAY", "WEEK", "DATA", "NEWS",
    "GIVE", "BULL", "BEAR", "NIFTY", "SENSEX", "NSE", "BSE",
})

# ─── Alias map: lower-case natural-language name → NSE ticker ─────────────────
_ALIASES: Dict[str, str] = {
    # Adani group
    "adani green":          "ADANIGREEN",
    "adani green energy":   "ADANIGREEN",
    "adani enterprises":    "ADANIENT",
    "adani ports":          "ADANIPORTS",
    "adani transmission":   "ADANITRANS",
    "adani total gas":      "ADANIGAS",
    "adani wilmar":         "ADANIWILMAR",
    # Tata group
    "tata motors":          "TATAMOTORS",
    "tata steel":           "TATASTEEL",
    "tata power":           "TATAPOWER",
    "tata consumer":        "TATACONSUM",
    "tata chemicals":       "TATACHEM",
    "tata comm":            "TATACOMM",
    "tata communications":  "TATACOMM",
    "tata elxsi":           "TATAELXSI",
    # HDFC group
    "hdfc bank":            "HDFCBANK",
    "hdfc life":            "HDFCLIFE",
    "hdfc amc":             "HDFCAMC",
    # ICICI group
    "icici bank":           "ICICIBANK",
    "icici lombard":        "ICICIlombard",
    # Bajaj group
    "bajaj finance":        "BAJFINANCE",
    "bajaj finserv":        "BAJAJFINSV",
    "bajaj auto":           "BAJAJ-AUTO",
    # Common single-word aliases
    "zomato":               "ZOMATO",
    "nykaa":                "NYKAA",
    "paytm":                "PAYTM",
    "irctc":                "IRCTC",
    "reliance":             "RELIANCE",
    "infosys":              "INFY",
    "wipro":                "WIPRO",
    "hcl":                  "HCLTECH",
    "hcl tech":             "HCLTECH",
    "tech mahindra":        "TECHM",
    "ultratech":            "ULTRACEMCO",
    "ultratech cement":     "ULTRACEMCO",
    "sun pharma":           "SUNPHARMA",
    "sun pharmaceutical":   "SUNPHARMA",
    "axis bank":            "AXISBANK",
    "kotak bank":           "KOTAKBANK",
    "kotak mahindra":       "KOTAKBANK",
    "state bank":           "SBIN",
    "sbi":                  "SBIN",
    "ongc":                 "ONGC",
    "coal india":           "COALINDIA",
    "power grid":           "POWERGRID",
    "ntpc":                 "NTPC",
    "l&t":                  "LT",
    "larsen":               "LT",
    "larsen and toubro":    "LT",
    "hindustan unilever":   "HINDUNILVR",
    "hul":                  "HINDUNILVR",
    "asian paints":         "ASIANPAINT",
    "hero motocorp":        "HEROMOTOCO",
    "eicher":               "EICHERMOT",
    "royal enfield":        "EICHERMOT",
    "dr reddy":             "DRREDDY",
    "dr reddys":            "DRREDDY",
    "cipla":                "CIPLA",
    "divis":                "DIVISLAB",
    "britannia":            "BRITANNIA",
    "nestle":               "NESTLEIND",
    "maruti":               "MARUTI",
    "maruti suzuki":        "MARUTI",
    "indusind":             "INDUSINDBK",
    "indusind bank":        "INDUSINDBK",
    "grasim":               "GRASIM",
    "bpcl":                 "BPCL",
    "ioc":                  "IOC",
    "indian oil":           "IOC",
    "hindalco":             "HINDALCO",
    "jsw steel":            "JSWSTEEL",
    "apollo hospital":      "APOLLOHOSP",
    "apollo hospitals":     "APOLLOHOSP",
    "titan":                "TITAN",
    "bharti airtel":        "BHARTIARTL",
    "airtel":               "BHARTIARTL",
    "hal":                  "HAL",
    "hindustan aeronautics": "HAL",
    "bel":                  "BEL",
    "bhel":                 "BHEL",
    "sail":                 "SAIL",
    "dlf":                  "DLF",
    "indigo":               "INDIGO",
    "interglobe":           "INDIGO",
    "vedanta":              "VEDL",
    "nmdc":                 "NMDC",
    "rvnl":                 "RVNL",
    "irfc":                 "IRFC",
    "zydus":                "ZYDUSLIFE",
    "lupin":                "LUPIN",
    "siemens":              "SIEMENS",
    "havells":              "HAVELLS",
    "voltas":               "VOLTAS",
    "naukri":               "NAUKRI",
    "info edge":            "NAUKRI",
    "pidilite":             "PIDILITIND",
    "muthoot":              "MUTHOOTFIN",
    "muthoot finance":      "MUTHOOTFIN",
    "cholamandalam":        "CHOLAFIN",
    "pnb":                  "PNB",
    "bank of baroda":       "BANKBARODA",
    "bob":                  "BANKBARODA",
}

# ─── Intent patterns ──────────────────────────────────────────────────────────
_INTENT_PATTERNS: List[Tuple[str, List[str]]] = [
    ("gainers",  ["gainer", "gaining", "top gain", "rising", "up today", "best perform"]),
    ("losers",   ["loser", "losing", "falling", "down today", "worst perform", "declining"]),
    ("compare",  ["compare", "vs ", "versus", "better than", "outperform"]),
    ("sector",   ["sector", "industry", "segment", "nifty bank", "nifty it", "nifty auto"]),
    ("volume",   ["volume", "unusual", "breakout", "spike"]),
    ("why",      ["why", "reason", "cause", "moving", "jump", "drop", "rally", "crash"]),
    ("market",   ["market", "summary", "overview", "today", "sentiment", "broad", "nifty", "sensex"]),
]


# ─── Public API ───────────────────────────────────────────────────────────────

def parse_query(query: str) -> Dict[str, Any]:
    """Detect intent and extract symbols from free-text query."""
    q = query.lower().strip()
    raw_upper = query.upper()
    symbols: List[str] = []

    # 1 — Alias resolution: scan the query (lowercased) for multi-word company names
    #     Longest match first so "adani green energy" beats "adani green"
    for phrase in sorted(_ALIASES, key=len, reverse=True):
        if phrase in q:
            ticker = _ALIASES[phrase]
            if ticker not in symbols:
                symbols.append(ticker)

    # 2 — Direct NSE ticker match (e.g. user typed "RELIANCE" or "TCS")
    for sym in _NSE_SYMBOLS:
        if sym not in symbols and re.search(rf"\b{re.escape(sym)}\b", raw_upper):
            symbols.append(sym)

    # 3 — Generic ALL-CAPS token fallback, but exclude stopwords and short noise
    if not symbols:
        for token in re.findall(r"\b[A-Z][A-Z0-9\-]{2,9}\b", raw_upper):
            if token not in _STOPWORDS and token not in symbols:
                symbols.append(token)

    # Detect intent (first match wins)
    intent = "unknown"
    for name, patterns in _INTENT_PATTERNS:
        if any(p in q for p in patterns):
            intent = name
            break

    # If a symbol was found but no intent recognised, default to explain
    if intent == "unknown" and symbols:
        intent = "why"

    return {"intent": intent, "symbols": symbols[:4]}


def handle_query(query: str, market_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main dispatch function.
    market_data = parsed nse:market payload from Redis.
    Breadth is always computed and merged into every response.
    """
    parsed = parse_query(query)
    intent = parsed["intent"]
    symbols = parsed["symbols"]

    logger.info("copilot intent=%s symbols=%s query=%r", intent, symbols, query[:80])

    if intent == "gainers":
        result = _top_gainers(market_data)
    elif intent == "losers":
        result = _top_losers(market_data)
    elif intent == "sector":
        result = _sector_summary(market_data)
    elif intent == "volume":
        result = _volume_movers(market_data)
    elif intent == "market":
        result = _market_summary(market_data)
    elif intent == "compare" and len(symbols) >= 2:
        result = _compare_stocks(symbols[0], symbols[1], market_data)
    elif intent == "why" and symbols:
        result = _explain_stock(symbols[0], market_data)
    elif intent == "compare" and len(symbols) == 1:
        result = _explain_stock(symbols[0], market_data)
    elif symbols:
        result = _explain_stock(symbols[0], market_data)
    else:
        result = _fallback()

    # Always attach breadth so every response carries market context
    if "breadth" not in result:
        nifty50: List[Dict] = market_data.get("nifty50") or []
        result["breadth"] = _market_breadth(nifty50)

    return result


# ─── Response generators ──────────────────────────────────────────────────────

def _stock_lookup(symbol: str, market_data: Dict) -> Optional[Dict]:
    """Find a stock in nifty50 list."""
    nifty50: List[Dict] = market_data.get("nifty50") or []
    sym = symbol.upper()
    for s in nifty50:
        if s.get("symbol", "").upper() == sym:
            return s
    return None


# ─── Confidence + Context helpers ────────────────────────────────────────────

def _confidence(abs_chg: float) -> str:
    """Rate signal confidence from absolute % change magnitude."""
    if abs_chg >= 2.0:
        return "HIGH"
    elif abs_chg >= 1.0:
        return "MEDIUM"
    return "LOW"


def _market_breadth(nifty50: List[Dict]) -> Dict[str, Any]:
    """
    Compute market breadth from nifty50 constituents.

    Rules:
      >60% advancing  → bullish
      <40% advancing  → bearish
      else            → neutral

    Returns:
      {"advancing": int, "declining": int, "unchanged": int,
       "total": int, "adv_pct": int, "sentiment": "bullish|bearish|neutral"}
    """
    advancing = sum(1 for s in nifty50 if float(s.get("change_percent", 0) or 0) > 0)
    declining = sum(1 for s in nifty50 if float(s.get("change_percent", 0) or 0) < 0)
    unchanged = sum(1 for s in nifty50 if float(s.get("change_percent", 0) or 0) == 0)
    total     = len(nifty50) or 1
    adv_pct   = round(advancing / total * 100)

    if adv_pct > 60:
        sentiment = "bullish"
    elif adv_pct < 40:
        sentiment = "bearish"
    else:
        sentiment = "neutral"

    return {
        "advancing": advancing,
        "declining": declining,
        "unchanged": unchanged,
        "total":     total,
        "adv_pct":   adv_pct,
        "sentiment": sentiment,
    }


def _avg_abs_change(nifty50: List[Dict]) -> float:
    """Average absolute % change across all nifty50 constituents."""
    if not nifty50:
        return 0.0
    vals = [abs(float(s.get("change_percent", 0) or 0)) for s in nifty50]
    return sum(vals) / len(vals)

def _relative_rank(symbol: str, nifty50: List[Dict]) -> Optional[Tuple[int, int]]:
    """Return (rank, total) of `symbol` sorted by absolute change, 1 = most moved."""
    if not nifty50:
        return None
    ranked = sorted(
        nifty50,
        key=lambda x: abs(float(x.get("change_percent", 0) or 0)),
        reverse=True,
    )
    for i, s in enumerate(ranked):
        if s.get("symbol", "").upper() == symbol.upper():
            return (i + 1, len(ranked))
    return None


def _movement_context(chg: float, nifty50: List[Dict], symbol: str = "") -> List[str]:
    """
    Build 2–3 context strings:
      1. Compare absolute move vs NIFTY 50 average
      2. Relative rank among constituents (if symbol given)
      3. Buying / selling pressure label
    """
    ctx: List[str] = []
    abs_chg = abs(chg)
    avg = _avg_abs_change(nifty50)

    # 1 — vs market average
    if avg > 0:
        ratio = abs_chg / avg
        if ratio >= 2.0:
            ctx.append(f"Movement is {ratio:.1f}× the NIFTY 50 average ({avg:.2f}%)")
        elif ratio >= 1.2:
            ctx.append(f"Above-average movement vs NIFTY 50 mean ({avg:.2f}%)")
        elif ratio >= 0.8:
            ctx.append(f"In line with NIFTY 50 average ({avg:.2f}%)")
        else:
            ctx.append(f"Below-average vs NIFTY 50 mean ({avg:.2f}%)")

    # 2 — relative rank
    if symbol and nifty50:
        rank_info = _relative_rank(symbol, nifty50)
        if rank_info:
            rank, total = rank_info
            pct = round(rank / total * 100)
            if pct <= 10:
                ctx.append(f"Top 10% mover — #{rank} of {total} by magnitude")
            elif pct <= 25:
                ctx.append(f"Top quartile mover — #{rank} of {total}")
            elif pct >= 75:
                ctx.append(f"Low relative movement — #{rank} of {total}")
            else:
                ctx.append(f"Mid-range movement — #{rank} of {total}")

    # 3 — pressure label
    if chg >= 2.0:
        ctx.append("Strong buying pressure sustained")
    elif chg >= 0.5:
        ctx.append("Moderate buying interest")
    elif chg <= -2.0:
        ctx.append("Strong selling pressure")
    elif chg <= -0.5:
        ctx.append("Moderate selling pressure")
    else:
        ctx.append("Neutral — minimal directional conviction")

    return ctx[:3]


def _relative_performance(stock_chg: float, nifty_chg: float) -> Dict[str, Any]:
    """
    Compare a stock's % change vs NIFTY 50 index change.
    Returns relative_performance label and delta.
    """
    delta = stock_chg - nifty_chg
    label = "outperforming" if delta >= 0 else "underperforming"
    return {
        "relative_performance": label,
        "delta": round(delta, 2),
        "stock_change": round(stock_chg, 2),
        "nifty_change": round(nifty_chg, 2),
    }


def _market_summary(data: Dict) -> Dict[str, Any]:
    nifty: Dict = data.get("nifty") or {}
    banknifty: Dict = data.get("banknifty") or {}
    nifty50: List[Dict] = data.get("nifty50") or []

    nifty_chg = float(nifty.get("change_percent", 0) or 0)
    bank_chg  = float(banknifty.get("change_percent", 0) or 0)

    breadth = _market_breadth(nifty50)
    advancing = breadth["advancing"]
    declining = breadth["declining"]
    total     = breadth["total"]
    adv_pct   = breadth["adv_pct"]

    if nifty_chg > 1.0:
        sentiment, emoji = "strongly bullish", "🟢"
    elif nifty_chg > 0.25:
        sentiment, emoji = "mildly bullish", "🟢"
    elif nifty_chg < -1.0:
        sentiment, emoji = "strongly bearish", "🔴"
    elif nifty_chg < -0.25:
        sentiment, emoji = "mildly bearish", "🔴"
    else:
        sentiment, emoji = "flat / sideways", "⚪"

    answer = (
        f"{emoji} Markets are {sentiment} today. "
        f"NIFTY 50 is at {nifty.get('value', '—')} ({nifty_chg:+.2f}%), "
        f"BANK NIFTY at {banknifty.get('value', '—')} ({bank_chg:+.2f}%). "
        f"{advancing} of {total} stocks are advancing — breadth is {breadth['sentiment']}."
    )

    top_g = sorted(nifty50, key=lambda x: float(x.get("change_percent", 0) or 0), reverse=True)[:3]
    top_l = sorted(nifty50, key=lambda x: float(x.get("change_percent", 0) or 0))[:3]

    data_points = [
        {"label": "NIFTY 50",   "value": f"{nifty_chg:+.2f}%"},
        {"label": "BANK NIFTY", "value": f"{bank_chg:+.2f}%"},
        {"label": "Advancing",  "value": f"{advancing}/{total}"},
        {"label": "Breadth",    "value": breadth["sentiment"].capitalize()},
    ]

    # breadth-derived context
    if adv_pct >= 65:
        breadth_ctx = f"Broad-based rally — {adv_pct}% of stocks advancing"
    elif adv_pct >= 50:
        breadth_ctx = f"Majority advancing — {adv_pct}% breadth"
    elif adv_pct >= 35:
        breadth_ctx = f"Mixed session — {adv_pct}% advancing, {100 - adv_pct}% declining"
    else:
        breadth_ctx = f"Broad-based selloff — only {adv_pct}% advancing"

    bank_vs_nifty = bank_chg - nifty_chg
    if abs(bank_vs_nifty) >= 0.5:
        bank_ctx = (
            f"BANK NIFTY {'outperforming' if bank_vs_nifty > 0 else 'underperforming'} "
            f"NIFTY by {abs(bank_vs_nifty):.2f}%"
        )
    else:
        bank_ctx = "BANK NIFTY and NIFTY moving in tandem"

    return {
        "answer":     answer,
        "confidence": _confidence(abs(nifty_chg)),
        "context":    [breadth_ctx, bank_ctx],
        "breadth":    breadth,
        "suggestions": [
            "Which sectors are performing best?",
            "Top gainers today",
            "Top losers today",
        ],
        "data_points":    data_points,
        "related_stocks": [s["symbol"] for s in top_g] + [s["symbol"] for s in top_l],
        "source": "nse_worker",
    }


def _top_gainers(data: Dict) -> Dict[str, Any]:
    gainers: List[Dict] = data.get("top_gainers") or []
    nifty50: List[Dict] = data.get("nifty50") or []
    if not gainers:
        gainers = sorted(nifty50, key=lambda x: float(x.get("change_percent", 0) or 0), reverse=True)

    top = gainers[:5]
    if not top:
        return _fallback("No gainer data available right now.")

    lines = [f"{s['symbol']} +{float(s.get('change_percent', 0)):.2f}%" for s in top]
    answer = "📈 Top gainers today: " + " · ".join(lines)

    data_points = [
        {"label": s["symbol"], "value": f"+{float(s.get('change_percent', 0)):.2f}%"}
        for s in top
    ]

    best_chg = float(top[0].get("change_percent", 0) or 0)
    avg = _avg_abs_change(nifty50)
    advancing = sum(1 for s in nifty50 if float(s.get("change_percent", 0) or 0) > 0)
    total = len(nifty50) or 1

    context = [
        f"Best gain: +{best_chg:.2f}% vs NIFTY 50 avg move of {avg:.2f}%",
        f"{advancing}/{total} stocks advancing today",
    ]
    if best_chg >= 2 * avg:
        context.append("Lead gainer is a significant outlier — possible news catalyst")

    top_sym = top[0].get("symbol", "")
    return {
        "answer":         answer,
        "confidence":     _confidence(best_chg),
        "context":        context,
        "suggestions": [
            f"Why is {top_sym} moving?" if top_sym else "Market summary today",
            "Top losers today",
            "Which sectors are strong?",
        ],
        "data_points":    data_points,
        "related_stocks": [s["symbol"] for s in top],
        "source":         "nse_worker",
    }


def _top_losers(data: Dict) -> Dict[str, Any]:
    losers: List[Dict] = data.get("top_losers") or []
    nifty50: List[Dict] = data.get("nifty50") or []
    if not losers:
        losers = sorted(nifty50, key=lambda x: float(x.get("change_percent", 0) or 0))

    top = losers[:5]
    if not top:
        return _fallback("No loser data available right now.")

    lines = [f"{s['symbol']} {float(s.get('change_percent', 0)):.2f}%" for s in top]
    answer = "📉 Top losers today: " + " · ".join(lines)

    data_points = [
        {"label": s["symbol"], "value": f"{float(s.get('change_percent', 0)):.2f}%"}
        for s in top
    ]

    worst_chg = float(top[0].get("change_percent", 0) or 0)
    avg = _avg_abs_change(nifty50)
    declining = sum(1 for s in nifty50 if float(s.get("change_percent", 0) or 0) < 0)
    total = len(nifty50) or 1

    context = [
        f"Worst loss: {worst_chg:.2f}% vs NIFTY 50 avg move of {avg:.2f}%",
        f"{declining}/{total} stocks declining today",
    ]
    if abs(worst_chg) >= 2 * avg:
        context.append("Lead loser is a significant outlier — possible news catalyst")

    worst_sym = top[0].get("symbol", "")
    return {
        "answer":         answer,
        "confidence":     _confidence(abs(worst_chg)),
        "context":        context,
        "suggestions": [
            f"Why is {worst_sym} falling?" if worst_sym else "Market summary today",
            "Top gainers today",
            "Market summary today",
        ],
        "data_points":    data_points,
        "related_stocks": [s["symbol"] for s in top],
        "source":         "nse_worker",
    }


def _explain_stock(symbol: str, data: Dict) -> Dict[str, Any]:
    sym = symbol.upper()
    stock = _stock_lookup(sym, data)
    nifty50: List[Dict] = data.get("nifty50") or []

    if not stock:
        return {
            "answer":     (
                f"I don't have live data for {sym} right now. "
                f"It may not be a NIFTY 50 constituent — only the 50 index stocks are tracked "
                f"in real time. For broader NSE stocks, try asking about a NIFTY 50 name."
            ),
            "confidence": "LOW",
            "context":    [f"{sym} is not in the NIFTY 50 live feed"],
            "data_points":    [],
            "related_stocks": [],
            "source":         "nse_worker",
        }

    chg    = float(stock.get("change_percent", 0) or 0)
    price  = float(stock.get("price", 0) or 0)
    vol    = int(stock.get("volume", 0) or 0)
    sector = stock.get("sector", "unknown sector")
    name   = stock.get("name", sym)

    nifty_chg = float((data.get("nifty") or {}).get("change_percent", 0) or 0)
    rel_perf  = _relative_performance(chg, nifty_chg)

    # Determine direction narrative
    if chg >= 3:
        reason = f"strong buying momentum — up {chg:.2f}% with high conviction"
        icon = "🚀"
    elif chg >= 1:
        reason = f"positive momentum in the {sector} sector ({chg:+.2f}%)"
        icon = "📈"
    elif chg >= 0:
        reason = f"holding steady, up marginally {chg:+.2f}%"
        icon = "➡️"
    elif chg >= -1:
        reason = f"mild selling pressure in {sector} ({chg:.2f}%)"
        icon = "📉"
    elif chg >= -3:
        reason = f"notable selling in the {sector} space ({chg:.2f}%)"
        icon = "⚠️"
    else:
        reason = f"heavy selling pressure — down {chg:.2f}%, sector: {sector}"
        icon = "🔴"

    answer = f"{icon} {name} ({sym}) is at ₹{price:,.2f} today due to {reason}."
    if vol > 0:
        answer += f" Volume: {vol:,} shares traded."
    answer += (
        f" {sym} is {rel_perf['relative_performance']} the market today "
        f"(NIFTY: {nifty_chg:+.2f}%, {sym}: {chg:+.2f}%, delta: {rel_perf['delta']:+.2f}%)."
    )

    data_points = [
        {"label": "Price",        "value": f"₹{price:,.2f}"},
        {"label": "Change",       "value": f"{chg:+.2f}%"},
        {"label": "NIFTY Change", "value": f"{nifty_chg:+.2f}%"},
        {"label": "vs NIFTY",     "value": f"{rel_perf['delta']:+.2f}% ({rel_perf['relative_performance']})"},
        {"label": "Volume",       "value": f"{vol:,}" if vol else "—"},
        {"label": "Sector",       "value": sector},
    ]

    related = [
        s["symbol"] for s in nifty50
        if s.get("sector") == sector and s.get("symbol") != sym
    ][:4]

    # Suggestions: compare with a sector peer, sector view, gainer/loser list
    compare_peer = related[0] if related else ("INFY" if sym != "INFY" else "TCS")
    direction_suggestion = "Top gainers today" if chg < 0 else "Top losers today"

    return {
        "answer":               answer,
        "confidence":           _confidence(abs(chg)),
        "context":              _movement_context(chg, nifty50, sym),
        "relative_performance": rel_perf,
        "suggestions": [
            f"Compare {sym} vs {compare_peer}",
            f"Which sectors are strong?",
            direction_suggestion,
        ],
        "data_points":    data_points,
        "related_stocks": related or [sym],
        "source":         "nse_worker",
    }


def _compare_stocks(sym1: str, sym2: str, data: Dict) -> Dict[str, Any]:
    s1 = _stock_lookup(sym1, data)
    s2 = _stock_lookup(sym2, data)
    nifty50: List[Dict] = data.get("nifty50") or []

    if not s1 and not s2:
        return _fallback(f"I don't have live data for {sym1} or {sym2}.")
    if not s1:
        return _fallback(f"I don't have live data for {sym1}.")
    if not s2:
        return _fallback(f"I don't have live data for {sym2}.")

    chg1 = float(s1.get("change_percent", 0) or 0)
    chg2 = float(s2.get("change_percent", 0) or 0)
    p1   = float(s1.get("price", 0) or 0)
    p2   = float(s2.get("price", 0) or 0)
    diff = abs(chg1 - chg2)
    leader, trailer = (sym1, sym2) if chg1 >= chg2 else (sym2, sym1)

    if chg1 > chg2:
        verdict = f"📊 {sym1} is outperforming {sym2} today by {diff:.2f}%."
    elif chg2 > chg1:
        verdict = f"📊 {sym2} is outperforming {sym1} today by {diff:.2f}%."
    else:
        verdict = f"📊 {sym1} and {sym2} are moving in lockstep today."

    data_points = [
        {"label": sym1,     "value": f"₹{p1:,.2f} ({chg1:+.2f}%)"},
        {"label": sym2,     "value": f"₹{p2:,.2f} ({chg2:+.2f}%)"},
        {"label": "Spread", "value": f"{diff:.2f}%"},
        {"label": "Leader", "value": leader},
    ]

    avg = _avg_abs_change(nifty50)
    leader_chg = chg1 if chg1 >= chg2 else chg2

    context: List[str] = [f"{leader} leads by {diff:.2f}% spread"]
    if avg > 0:
        leader_ratio = abs(leader_chg) / avg
        if leader_ratio >= 1.5:
            context.append(f"{leader} moving {leader_ratio:.1f}× faster than NIFTY 50 avg")
        else:
            context.append(f"Both stocks near NIFTY 50 average move ({avg:.2f}%)")
    if diff >= 2.0:
        context.append("Wide divergence — strong relative strength differential")
    elif diff >= 0.5:
        context.append("Moderate divergence — one stock showing relative strength")
    else:
        context.append("Tight spread — both stocks highly correlated today")

    return {
        "answer":         verdict,
        "confidence":     _confidence(abs(leader_chg)),
        "context":        context[:3],
        "suggestions": [
            f"Why is {leader} moving?",
            f"Why is {trailer} moving?",
            "Which sectors are strong?",
        ],
        "data_points":    data_points,
        "related_stocks": [sym1, sym2],
        "source":         "nse_worker",
    }


def _sector_summary(data: Dict) -> Dict[str, Any]:
    sectors: List[Dict] = data.get("sector_performance") or []

    if not sectors:
        return _fallback("Sector data not available right now.")

    sorted_sectors = sorted(sectors, key=lambda x: float(x.get("performance", 0) or 0), reverse=True)
    bullish = [s for s in sorted_sectors if float(s.get("performance", 0) or 0) > 0]
    bearish = [s for s in sorted_sectors if float(s.get("performance", 0) or 0) < 0]
    total_s = len(sorted_sectors)

    top_s = sorted_sectors[0] if sorted_sectors else {}
    bot_s = sorted_sectors[-1] if sorted_sectors else {}
    top_perf = float(top_s.get("performance", 0) or 0)
    bot_perf = float(bot_s.get("performance", 0) or 0)

    answer = (
        f"🏭 Sector snapshot: {top_s.get('sector', '—')} leads "
        f"(+{top_perf:.2f}%), "
        f"{bot_s.get('sector', '—')} lags "
        f"({bot_perf:.2f}%). "
        f"{len(bullish)} sectors bullish, {len(bearish)} bearish."
    )

    data_points = [
        {"label": s["sector"], "value": f"{float(s.get('performance', 0)):+.2f}%"}
        for s in sorted_sectors[:6]
    ]

    spread = top_perf - bot_perf
    context: List[str] = [
        f"{len(bullish)}/{total_s} sectors advancing",
        f"Sector spread: {spread:.2f}% between best and worst",
    ]
    if spread >= 3.0:
        context.append("High sector dispersion — strong rotation underway")
    elif spread >= 1.5:
        context.append("Moderate dispersion — selective sector participation")
    else:
        context.append("Low dispersion — broad-based uniform movement")

    # Suggest drilling into the best and worst sector stocks
    top_sector_name = top_s.get("sector", "")
    bot_sector_name = bot_s.get("sector", "")
    return {
        "answer":         answer,
        "confidence":     _confidence(top_perf),
        "context":        context,
        "suggestions": [
            "Top gainers today",
            "Top losers today",
            "Market summary today",
        ],
        "data_points":    data_points,
        "related_stocks": [],
        "source":         "nse_worker",
    }


def _volume_movers(data: Dict) -> Dict[str, Any]:
    nifty50: List[Dict] = data.get("nifty50") or []
    if not nifty50:
        return _fallback("Volume data not available right now.")

    sorted_vol = sorted(nifty50, key=lambda x: int(x.get("volume", 0) or 0), reverse=True)[:5]
    lines = [f"{s['symbol']} ({int(s.get('volume', 0)):,})" for s in sorted_vol]
    answer = "📊 Highest volume stocks today: " + " · ".join(lines)

    data_points = [
        {"label": s["symbol"], "value": f"{int(s.get('volume', 0)):,}"}
        for s in sorted_vol
    ]

    # Confidence based on the price change of the top volume mover
    top_chg = abs(float(sorted_vol[0].get("change_percent", 0) or 0)) if sorted_vol else 0.0

    # avg volume baseline (simple — relative to median)
    all_vols = sorted([int(s.get("volume", 0) or 0) for s in nifty50], reverse=True)
    median_vol = all_vols[len(all_vols) // 2] if all_vols else 1
    top_vol = int(sorted_vol[0].get("volume", 0) or 0) if sorted_vol else 0
    vol_ratio = top_vol / median_vol if median_vol else 0

    context: List[str] = [
        f"Top volume: {top_vol:,} shares ({vol_ratio:.1f}× median)",
        "High volume often signals institutional activity or news catalyst",
    ]
    if top_chg >= 2.0:
        context.append("Volume spike accompanied by strong price movement")
    elif top_chg < 0.5:
        context.append("High volume with muted price — possible accumulation / distribution")

    top_vol_sym = sorted_vol[0].get("symbol", "") if sorted_vol else ""
    return {
        "answer":         answer,
        "confidence":     _confidence(top_chg),
        "context":        context,
        "suggestions": [
            f"Why is {top_vol_sym} moving?" if top_vol_sym else "Market summary today",
            "Top gainers today",
            "Market summary today",
        ],
        "data_points":    data_points,
        "related_stocks": [s["symbol"] for s in sorted_vol],
        "source":         "nse_worker",
    }


def _fallback(msg: str = "") -> Dict[str, Any]:
    return {
        "answer": msg or (
            "Try asking: 'Top gainers today', 'Why is RELIANCE moving?', "
            "'Compare TCS vs INFY', 'Which sectors are strong?', or 'Market summary'."
        ),
        "confidence": "LOW",
        "context":    [],
        "suggestions": [
            "Top gainers today",
            "Market summary today",
            "Which sectors are strong?",
        ],
        "data_points":    [],
        "related_stocks": [],
        "source":         "rule_engine",
    }


# ─── Pre-emptive Key Insights ─────────────────────────────────────────────────

def generate_key_insights(market_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Auto-generate 2–3 pre-emptive insights from live NSE market data.
    Called on page load — no user query needed.

    Returns:
        {
          "insights": ["...", "...", "..."],   # 2–3 plain-English sentences
          "source": "nse_worker"
        }
    """
    insights: List[str] = []

    nifty50:    List[Dict] = market_data.get("nifty50") or []
    gainers:    List[Dict] = market_data.get("top_gainers") or []
    losers:     List[Dict] = market_data.get("top_losers") or []
    sectors:    List[Dict] = market_data.get("sector_performance") or []
    nifty:      Dict       = market_data.get("nifty") or {}

    # ── 1. Top gainer momentum ─────────────────────────────────────────────
    gainer_pool = gainers or sorted(
        nifty50, key=lambda x: float(x.get("change_percent", 0) or 0), reverse=True
    )
    if gainer_pool:
        g = gainer_pool[0]
        sym  = g.get("symbol", "—")
        chg  = float(g.get("change_percent", 0) or 0)
        name = g.get("name") or sym
        sector = g.get("sector", "")

        if chg >= 3:
            strength = "surging"
        elif chg >= 1:
            strength = "gaining strong momentum"
        else:
            strength = "edging higher"

        sector_tag = f" ({sector})" if sector else ""
        insights.append(
            f"{name}{sector_tag} is {strength} today, up {chg:.2f}% — the top NSE mover."
        )

    # ── 2. Top loser weakness ──────────────────────────────────────────────
    loser_pool = losers or sorted(
        nifty50, key=lambda x: float(x.get("change_percent", 0) or 0)
    )
    if loser_pool:
        l = loser_pool[0]
        sym  = l.get("symbol", "—")
        chg  = float(l.get("change_percent", 0) or 0)
        name = l.get("name") or sym
        sector = l.get("sector", "")

        if chg <= -3:
            pressure = "heavy selling pressure"
        elif chg <= -1:
            pressure = "notable weakness"
        else:
            pressure = "mild selling"

        sector_tag = f" ({sector})" if sector else ""
        insights.append(
            f"{name}{sector_tag} faces {pressure}, down {abs(chg):.2f}% — weakest on the index."
        )

    # ── 3. Sector trend ────────────────────────────────────────────────────
    if sectors:
        sorted_s = sorted(sectors, key=lambda x: float(x.get("performance", 0) or 0), reverse=True)
        best  = sorted_s[0]
        worst = sorted_s[-1]
        best_perf  = float(best.get("performance", 0) or 0)
        worst_perf = float(worst.get("performance", 0) or 0)

        if best_perf > 0 and worst_perf < 0:
            insights.append(
                f"Sector rotation active: {best.get('sector', '—')} leads "
                f"(+{best_perf:.2f}%) while {worst.get('sector', '—')} lags "
                f"({worst_perf:.2f}%)."
            )
        elif best_perf > 0:
            insights.append(
                f"{best.get('sector', '—')} is the strongest sector today (+{best_perf:.2f}%)."
            )
        else:
            insights.append(
                f"Broad-based selling: {worst.get('sector', '—')} leads losses "
                f"({worst_perf:.2f}%)."
            )
    elif nifty50:
        # Fallback: compute breadth from nifty50
        advancing = sum(1 for s in nifty50 if float(s.get("change_percent", 0) or 0) > 0)
        total     = len(nifty50)
        adv_pct   = round(advancing / total * 100) if total else 0
        nifty_chg = float(nifty.get("change_percent", 0) or 0)

        if adv_pct >= 60:
            breadth = "positive"
        elif adv_pct <= 40:
            breadth = "negative"
        else:
            breadth = "neutral"

        insights.append(
            f"Market breadth is {breadth}: {advancing}/{total} stocks advancing "
            f"({adv_pct}%), NIFTY {nifty_chg:+.2f}%."
        )

    if not insights:
        insights = ["Live NSE data is loading. Refresh in a few seconds."]

    return {"insights": insights, "source": "nse_worker"}
