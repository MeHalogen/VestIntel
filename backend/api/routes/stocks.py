from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from schemas.schemas import StockQuote, StockHistory, AIInsight, NewsArticle, Signal
from services.market_data import MarketDataService
from services.ai_service import AIService
from core.cache import CacheService
from core.config import settings
from api.deps.auth import require_user
from api.deps.entitlements import get_user_and_plan, enforce_ai_quota
from core.plans import PlanType
from providers.news import NewsProvider
from providers.finnhub import FinnhubProvider
from providers.twelvedata import TwelveDataProvider
from core.database import SessionLocal
from models.models import Stock, StockPrice
from workers.nse_ingestion import HEATMAP_CACHE_KEY
from models.models import Watchlist
from services.user_context import get_or_create_user_by_email
from core.database import get_db
from sqlalchemy.orm import Session
from core.plans import PLAN_LIMITS

router = APIRouter()

market_data_service = MarketDataService()
ai_service = AIService()


@router.get("/watchlist")
async def get_watchlist(
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user),
):
    user = get_or_create_user_by_email(db, user_email)
    rows = db.query(Watchlist).filter(Watchlist.user_id == user.id).order_by(Watchlist.id.desc()).all()
    return [{"symbol": r.symbol, "added_at": r.added_at.isoformat() if r.added_at else None} for r in rows]


@router.post("/watchlist")
async def add_to_watchlist(
    symbol: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    ctx=Depends(get_user_and_plan),
):
    user, plan = ctx
    limit = PLAN_LIMITS[plan].watchlist_symbols
    if limit is not None:
        existing = db.query(Watchlist).filter(Watchlist.user_id == user.id).count()
        if existing >= limit:
            raise HTTPException(
                status_code=403,
                detail="Free plan watchlist supports up to 10 stocks. Upgrade to Pro for unlimited watchlists.",
            )

    sym = symbol.upper().strip()
    row = db.query(Watchlist).filter(Watchlist.user_id == user.id, Watchlist.symbol == sym).first()
    if row:
        return {"symbol": row.symbol, "status": "exists"}
    row = Watchlist(user_id=user.id, symbol=sym)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"symbol": row.symbol, "status": "added"}


def _ts_now() -> int:
    import time
    return int(time.time())


def _period_days(period: str) -> int:
    p = (period or "1M").upper().strip()
    if p == "1D":
        return 1
    if p == "5D":
        return 5
    if p == "1M":
        return 30
    if p == "6M":
        return 180
    if p == "1Y":
        return 365
    if p == "5Y":
        return 365 * 5
    return 30


def _downsample_rows(rows: list, target_points: int = 240) -> list:
    if len(rows) <= target_points:
        return rows
    step = max(1, len(rows) // target_points)
    sampled = rows[::step]
    if rows[-1] is not sampled[-1]:
        sampled.append(rows[-1])
    return sampled


def _extract_tickers(text: str) -> list[str]:
    import re
    candidates = re.findall(r"\b[A-Z]{2,5}\b", (text or "").upper())
    # De-dup while preserving order
    out = []
    for c in candidates:
        if c not in out:
            out.append(c)
    return out[:4]


def _normalize_symbol_for_cache(symbol: str) -> str:
    sym = (symbol or "").upper().strip()
    if sym.endswith(".NS"):
        return sym[:-3]
    if sym.endswith(".NSE"):
        return sym[:-4]
    return sym


def _looks_indian_symbol(symbol: str) -> bool:
    sym = (symbol or "").upper().strip()
    return sym.endswith(".NS") or sym.endswith(".NSE")


def _normalize_index_symbol(symbol: str) -> str | None:
    sym = (symbol or "").upper().strip()
    sym = sym.replace(".NSE", "").replace(".NS", "").replace("^", "")
    sym = sym.replace("%20", " ").replace("_", " ").replace("-", " ")
    sym = " ".join(sym.split())
    if sym in {"NIFTY500", "NIFTY 500"}:
        return "NIFTY 500"
    if sym in {"NIFTY BANK", "NIFTYBANK", "BANKNIFTY", "BANK NIFTY"}:
        return "NIFTY BANK"
    return None


async def _get_index_quote(symbol: str) -> dict | None:
    name = _normalize_index_symbol(symbol)
    if not name:
        return None
    india = await CacheService.get(HEATMAP_CACHE_KEY) or {}
    now_iso = india.get("as_of")
    if name == "NIFTY 500":
        idx = india.get("nifty") or {}
    else:
        idx = india.get("banknifty") or {}
    if not idx:
        return None
    value = float(idx.get("value") or 0.0)
    chg = float(idx.get("change_percent") or 0.0)
    return {
        "symbol": name,
        "exchange": "NSE",
        "price": value,
        "change_percent": chg,
        "volume": None,
        "timestamp": _ts_now(),
        "source": "nse_index_cache",
        "market_cap": None,
        "sector": "Index",
        "as_of": str(now_iso) if now_iso is not None else None,
    }


async def _get_nse_cached_quote(symbol: str):
    base = _normalize_symbol_for_cache(symbol)
    cached = await CacheService.get(f"stock:price:{base}")
    if cached and (cached.get("exchange") == "NSE" or cached.get("source") == "nse"):
        return cached
    return None


def _is_known_nse_symbol(symbol: str) -> bool:
    db = SessionLocal()
    try:
        sym = _normalize_symbol_for_cache(symbol)
        row = db.query(Stock).filter(Stock.symbol == sym, Stock.exchange == "NSE").first()
        return row is not None
    finally:
        db.close()


@router.get("/quote", response_model=StockQuote)
async def quote(
    symbol: str = Query(..., min_length=1),
    _: str = Depends(require_user),
):
    """Internal quote endpoint.

    Frontend must call: GET /api/quote?symbol=AAPL
    """
    cache_key = f"stock:price:{symbol.upper()}"
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    sym = symbol.upper().strip()
    index_quote = await _get_index_quote(sym)
    if index_quote:
        return index_quote

    # NSE-first path: users read cached/DB data; only worker should hit NSE APIs.
    nse_cached = await _get_nse_cached_quote(sym)
    if nse_cached:
        return nse_cached

    # Plain symbols (e.g., RELIANCE) that are known NSE names should also be served from local cache/DB.
    if "." not in sym:
        try:
            db = SessionLocal()
            try:
                nse_stock = db.query(Stock).filter(Stock.symbol == sym, Stock.exchange == "NSE").first()
                if nse_stock:
                    last = (
                        db.query(StockPrice)
                        .filter(StockPrice.symbol == sym)
                        .order_by(StockPrice.timestamp.desc())
                        .first()
                    )
                    if last:
                        payload = {
                            "symbol": sym,
                            "exchange": "NSE",
                            "price": float(last.price),
                            "change_percent": 0.0,
                            "volume": int(last.volume or 0),
                            "timestamp": int(last.timestamp),
                            "source": "nse_db_fallback",
                            "market_cap": None,
                            "sector": None,
                        }
                        await CacheService.set(f"stock:price:{sym}", payload, ttl=settings.PRICE_CACHE_TTL_SECONDS)
                        return payload
            finally:
                db.close()
        except Exception:
            # DB unavailable -> continue provider routing without hard-failing.
            pass

    if _looks_indian_symbol(sym):
        try:
            db = SessionLocal()
            try:
                base = _normalize_symbol_for_cache(sym)
                last = (
                    db.query(StockPrice)
                    .filter(StockPrice.symbol == base)
                    .order_by(StockPrice.timestamp.desc())
                    .first()
                )
                if last:
                    payload = {
                        "symbol": base,
                        "exchange": "NSE",
                        "price": float(last.price),
                        "change_percent": 0.0,
                        "volume": int(last.volume or 0),
                        "timestamp": int(last.timestamp),
                        "source": "nse_db_fallback",
                        "market_cap": None,
                        "sector": None,
                    }
                    await CacheService.set(f"stock:price:{base}", payload, ttl=settings.PRICE_CACHE_TTL_SECONDS)
                    return payload
            finally:
                db.close()
        except Exception:
            # DB unavailable: continue to legacy provider path below.
            pass

    # Routing: .NS / .NSE -> TwelveData, otherwise Finnhub (with fallback to TwelveData)
    if sym.endswith(".NS") or sym.endswith(".NSE"):
        td = TwelveDataProvider(settings.TWELVEDATA_API_KEY)
        try:
            q = await td.fetch_quote(sym)
            normalized = {
                "symbol": q.symbol,
                "exchange": "NSE",
                "price": float(q.price),
                "change_percent": float(q.change_percent),
                "volume": q.volume,
                "timestamp": int(q.timestamp),
                "source": "twelvedata",
                "market_cap": None,
                "sector": None,
            }
        except Exception:
            fallback = await market_data_service.get_quote(sym)
            if not fallback:
                raise HTTPException(status_code=502, detail="No quote source available for NSE symbol")
            normalized = {
                "symbol": fallback.get("symbol") or sym,
                "exchange": fallback.get("exchange") or "NSE",
                "price": float(fallback.get("price") or 0.0),
                "change_percent": float(fallback.get("change_percent") or 0.0),
                "volume": fallback.get("volume"),
                "timestamp": _ts_now(),
                "source": fallback.get("source") or "mock_fallback",
                "market_cap": fallback.get("market_cap"),
                "sector": fallback.get("sector"),
            }
    else:
        try:
            finnhub = FinnhubProvider(settings.FINNHUB_API_KEY)
            q = await finnhub.fetch_quote(sym)
            normalized = {
                "symbol": q.symbol,
                "exchange": "US",
                "price": float(q.price),
                "change_percent": float(q.change_percent),
                "volume": q.volume,
                "timestamp": int(q.timestamp),
                "source": "finnhub",
                "market_cap": None,
                "sector": None,
            }
        except Exception as e:
            # Fallback: Finnhub request fails -> TwelveData
            try:
                td = TwelveDataProvider(settings.TWELVEDATA_API_KEY)
                q = await td.fetch_quote(sym)
                normalized = {
                    "symbol": q.symbol,
                    "exchange": "US",
                    "price": float(q.price),
                    "change_percent": float(q.change_percent),
                    "volume": q.volume,
                    "timestamp": int(q.timestamp),
                    "source": f"twelvedata_fallback:{type(e).__name__}",
                    "market_cap": None,
                    "sector": None,
                }
            except Exception:
                fallback = await market_data_service.get_quote(sym)
                if not fallback:
                    raise HTTPException(status_code=502, detail="No quote source available")
                normalized = {
                    "symbol": fallback.get("symbol") or sym,
                    "exchange": fallback.get("exchange") or "US",
                    "price": float(fallback.get("price") or 0.0),
                    "change_percent": float(fallback.get("change_percent") or 0.0),
                    "volume": fallback.get("volume"),
                    "timestamp": _ts_now(),
                    "source": fallback.get("source") or f"service_fallback:{type(e).__name__}",
                    "market_cap": fallback.get("market_cap"),
                    "sector": fallback.get("sector"),
                }

    # Persist to DB (best-effort)
    db = SessionLocal()
    try:
        db.add(
            StockPrice(
                symbol=normalized["symbol"],
                price=float(normalized["price"]),
                volume=normalized.get("volume"),
                timestamp=int(normalized["timestamp"]),
            )
        )
        db.commit()
    except Exception as e:
        db.rollback()
        # Don’t fail the request if DB write fails; cache + response still work.
        print(f"quote db write failed: {e}")
    finally:
        db.close()

    await CacheService.set(cache_key, normalized, ttl=settings.PRICE_CACHE_TTL_SECONDS)
    return normalized


@router.get("/history", response_model=List[StockHistory])
async def history(
    symbol: str = Query(..., min_length=1),
    period: str = Query("1M"),
    _: str = Depends(require_user),
):
    """Internal history endpoint.

    Frontend must call: GET /api/history?symbol=AAPL&period=1M
    """
    cache_key = f"stock:history:v3:{symbol.upper()}:{period.upper()}"
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    sym = symbol.upper().strip()
    base = _normalize_symbol_for_cache(sym)
    index_quote = await _get_index_quote(sym)
    if index_quote:
        price = float(index_quote.get("price") or 0.0)
        chg = float(index_quote.get("change_percent") or 0.0)
        prev = price / (1.0 + (chg / 100.0)) if chg != 0 else price
        now_dt = datetime.now(timezone.utc).replace(microsecond=0)
        prev_dt = now_dt - timedelta(days=1)
        history_payload = [
            {"date": prev_dt.isoformat(), "open": prev, "high": prev, "low": prev, "close": prev, "volume": 0},
            {"date": now_dt.isoformat(), "open": price, "high": price, "low": price, "close": price, "volume": 0},
        ]
        await CacheService.set(cache_key, history_payload, ttl=60 * 10)
        return history_payload

    india_cache = await CacheService.get(HEATMAP_CACHE_KEY)
    heatmap_symbols = {str(x.get("symbol") or "").upper().strip() for x in (india_cache or {}).get("heatmap") or []}
    in_heatmap = base in heatmap_symbols

    # For NSE symbols, serve historical series from locally ingested DB prices.
    if _looks_indian_symbol(sym) or await _get_nse_cached_quote(base) or _is_known_nse_symbol(base) or in_heatmap:
        days = _period_days(period)

        since_ts = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp())
        db = SessionLocal()
        try:
            rows = (
                db.query(StockPrice)
                .filter(StockPrice.symbol == base, StockPrice.timestamp >= since_ts)
                .order_by(StockPrice.timestamp.asc())
                .all()
            )
            p = period.upper().strip()
            if p not in {"1D", "5D"} and rows:
                # Long-range chart periods should use one bar per day.
                by_day = {}
                for r in rows:
                    day_key = datetime.fromtimestamp(int(r.timestamp), tz=timezone.utc).date().isoformat()
                    by_day[day_key] = r
                rows = [by_day[k] for k in sorted(by_day.keys())]
            rows = _downsample_rows(rows)
            history_payload = [
                {
                    "date": datetime.fromtimestamp(int(r.timestamp), tz=timezone.utc).isoformat(),
                    "open": float(r.price),
                    "high": float(r.price),
                    "low": float(r.price),
                    "close": float(r.price),
                    "volume": int(r.volume or 0),
                }
                for r in rows
            ]

            # When ingestion just started or market is closed, provide at least a 2-point line.
            if len(history_payload) <= 1:
                q = await _get_nse_cached_quote(base)
                close = float((q or {}).get("price") or (history_payload[0]["close"] if history_payload else 0.0))
                chg = float((q or {}).get("change_percent") or 0.0)
                prev = close / (1.0 + (chg / 100.0)) if chg != 0 else close
                now_dt = datetime.now(timezone.utc).replace(microsecond=0)
                prev_dt = now_dt - timedelta(days=1)
                vol = int((q or {}).get("volume") or (history_payload[0]["volume"] if history_payload else 0))
                history_payload = [
                    {
                        "date": prev_dt.isoformat(),
                        "open": prev,
                        "high": prev,
                        "low": prev,
                        "close": prev,
                        "volume": vol,
                    },
                    {
                        "date": now_dt.isoformat(),
                        "open": close,
                        "high": close,
                        "low": close,
                        "close": close,
                        "volume": vol,
                    },
                ]

            await CacheService.set(cache_key, history_payload, ttl=60 * 60)
            return history_payload
        finally:
            db.close()

    history_payload = await market_data_service.get_history(symbol, period)
    await CacheService.set(cache_key, history_payload, ttl=60 * 60)  # 1 hour
    return history_payload


@router.get("/news", response_model=List[NewsArticle])
async def news(_: str = Depends(require_user)):
    """Internal news endpoint backed by NewsAPI (cached)."""
    cache_key = "news:latest"
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    provider = NewsProvider(settings.NEWS_API_KEY)
    items = await provider.fetch_latest(page_size=20)

    payload = [
        {
            "title": n.title,
            "url": n.url,
            "source": n.source,
            "published_at": n.published_at,
            "summary": n.title[:180],
            "tickers": _extract_tickers(n.title),
            "sentiment_score": None,
            "as_of": n.published_at,
        }
        for n in items
    ]

    await CacheService.set(cache_key, payload, ttl=5 * 60)
    return payload


@router.get("/signals", response_model=List[Signal])
async def signals(_: str = Depends(require_user)):
    """Internal signals endpoint (NSE heatmap-derived)."""
    india = await CacheService.get(HEATMAP_CACHE_KEY)
    heatmap = (india or {}).get("heatmap") or []
    if not heatmap:
        return []

    sorted_by_move = sorted(heatmap, key=lambda x: abs(float(x.get("pChange") or 0.0)), reverse=True)[:30]
    out = []
    for row in sorted_by_move:
        sym = str(row.get("symbol") or "").upper().strip()
        if not sym:
            continue
        chg = float(row.get("pChange") or 0.0)
        if abs(chg) < 0.75:
            continue

        signal_type = "momentum_up" if chg > 0 else "momentum_down"
        severity = "high" if abs(chg) >= 2.0 else "medium"
        out.append(
            {
                "id": f"sig_{sym}_{_ts_now()}",
                "symbol": sym,
                "type": signal_type,
                "severity": severity,
                "message": f"{sym} moved {chg:+.2f}% in latest session",
                "timestamp": _ts_now(),
                "source": "nse",
                "as_of": (india or {}).get("as_of"),
            }
        )

    if not out:
        return []
    return out

@router.get("/{symbol}/quote", response_model=StockQuote)
async def get_stock_quote(symbol: str, _: str = Depends(require_user)):
    """Get real-time stock quote"""
    cache_key = f"stock:price:{symbol.upper()}"
    cached = await CacheService.get(cache_key)
    if cached:
        return cached
    
    quote = await market_data_service.get_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    normalized = {
        "symbol": quote.get("symbol") or symbol.upper(),
        "exchange": quote.get("exchange") or "US",
        "price": float(quote.get("price") or 0.0),
        "change_percent": float(quote.get("change_percent") or 0.0),
        "volume": quote.get("volume"),
        "timestamp": _ts_now(),
        "change": quote.get("change"),
        "currency": quote.get("currency"),
        "source": quote.get("source"),
        "market_cap": quote.get("market_cap"),
        "sector": quote.get("sector"),
    }

    await CacheService.set(cache_key, normalized, ttl=settings.PRICE_CACHE_TTL_SECONDS)
    return normalized

@router.get("/{symbol}/history", response_model=List[StockHistory])
async def get_stock_history(symbol: str, period: str = "1M", _: str = Depends(require_user)):
    """Get historical stock data"""
    cache_key = f"stock:history:v3:{symbol.upper()}:{period.upper()}"
    cached = await CacheService.get(cache_key)
    if cached:
        return cached
    
    history = await market_data_service.get_history(symbol, period)
    await CacheService.set(cache_key, history, ttl=60 * 60)
    return history

@router.get("/{symbol}/analysis", response_model=AIInsight)
async def get_ai_analysis(
    symbol: str,
    ctx=Depends(get_user_and_plan),
):
    """Get AI-powered analysis for a stock"""
    user, plan = ctx
    if plan == PlanType.free:
        raise HTTPException(status_code=403, detail="This feature is available in VestIntel Pro.")
    await enforce_ai_quota(user.id, plan)

    cache_key = f"analysis:v2:{symbol.upper()}"
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    sym = symbol.upper().strip()
    base = _normalize_symbol_for_cache(sym)

    quote_payload = await _get_index_quote(sym) or await _get_nse_cached_quote(base) or await market_data_service.get_quote(sym) or {}
    if not quote_payload:
        raise HTTPException(status_code=404, detail="Stock not found")

    days = 90
    since_ts = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp())
    db = SessionLocal()
    try:
        rows = (
            db.query(StockPrice)
            .filter(StockPrice.symbol == base, StockPrice.timestamp >= since_ts)
            .order_by(StockPrice.timestamp.asc())
            .all()
        )
    finally:
        db.close()

    history_rows = [
        {
            "date": datetime.fromtimestamp(int(r.timestamp), tz=timezone.utc).isoformat(),
            "close": float(r.price),
            "volume": int(r.volume or 0),
        }
        for r in _downsample_rows(rows, target_points=180)
    ]

    india = await CacheService.get(HEATMAP_CACHE_KEY)
    sector_perf = None
    sector = None
    heatmap = (india or {}).get("heatmap") or []
    for row in heatmap:
        if str(row.get("symbol") or "").upper().strip() == base:
            sector = row.get("sector")
            break
    if sector:
        for s in (india or {}).get("sector_performance") or []:
            if str(s.get("sector")) == str(sector):
                sector_perf = float(s.get("performance") or 0.0)
                break

    analysis = await ai_service.analyze_stock(
        sym,
        quote=quote_payload,
        history=history_rows,
        sector_performance=sector_perf,
    )
    if sector:
        dp = list(analysis.get("data_points") or [])
        dp.append({"label": "Sector", "value": str(sector)})
        analysis["data_points"] = dp

    await CacheService.set(cache_key, analysis, ttl=600)
    return analysis

@router.get("/search")
async def search_stocks(q: str, _: str = Depends(require_user)):
    """Search NSE stocks only (cache/DB)."""
    results = []
    seen = set()

    db = SessionLocal()
    try:
        query = (q or "").strip().upper()
        if query:
            nse_rows = (
                db.query(Stock)
                .filter(Stock.exchange == "NSE", Stock.symbol.ilike(f"%{query}%"))
                .limit(20)
                .all()
            )
            for row in nse_rows:
                item = {"symbol": f"{row.symbol}.NSE", "name": row.company_name or row.symbol, "exchange": "NSE"}
                key = item["symbol"]
                if key not in seen:
                    seen.add(key)
                    results.append(item)
    finally:
        db.close()

    india = await CacheService.get(HEATMAP_CACHE_KEY)
    heatmap = (india or {}).get("heatmap") or []
    query = (q or "").strip().upper()
    if query:
        for row in heatmap:
            sym = str(row.get("symbol") or "").upper()
            if query in sym:
                item = {"symbol": f"{sym}.NSE", "name": row.get("sector") or sym, "exchange": "NSE"}
                key = item["symbol"]
                if key not in seen:
                    seen.add(key)
                    results.append(item)
    return results
