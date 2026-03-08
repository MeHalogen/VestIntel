from __future__ import annotations

import asyncio
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List

from sqlalchemy.orm import Session

from core.cache import CacheService
from core.database import SessionLocal
from models.models import Stock, StockPrice
from providers.nse import NSEProvider


INDEXES = ["NIFTY 500", "NIFTY BANK", "NIFTY IT", "NIFTY PHARMA", "NIFTY AUTO"]
HEATMAP_CACHE_KEY = "market:india:heatmap"


def _cache_key(symbol: str) -> str:
    return f"stock:price:{symbol.upper()}"


def _now_ts() -> int:
    return int(time.time())


def _normalize(rows: List[List[Dict]]) -> List[Dict]:
    by_symbol: Dict[str, Dict] = {}
    for dataset in rows:
        for row in dataset:
            sym = row["symbol"].upper().strip()
            if not sym:
                continue
            if sym not in by_symbol:
                by_symbol[sym] = row
            else:
                prev = by_symbol[sym]
                # Prefer row with richer market cap/sector.
                if (row.get("market_cap") or 0) > (prev.get("market_cap") or 0):
                    by_symbol[sym] = row
                elif not prev.get("sector") and row.get("sector"):
                    prev["sector"] = row["sector"]
            if not by_symbol[sym].get("sector"):
                idx = (row.get("index_name") or "").upper()
                if "BANK" in idx:
                    by_symbol[sym]["sector"] = "Banking"
                elif "IT" in idx:
                    by_symbol[sym]["sector"] = "IT"
                elif "PHARMA" in idx:
                    by_symbol[sym]["sector"] = "Pharma"
                elif "AUTO" in idx:
                    by_symbol[sym]["sector"] = "Auto"
                else:
                    by_symbol[sym]["sector"] = "Unknown"
    return list(by_symbol.values())


def _compute_sector_performance(stocks: List[Dict]) -> List[Dict]:
    bucket = defaultdict(list)
    for s in stocks:
        bucket[(s.get("sector") or "Unknown")].append(float(s.get("change_percent") or 0.0))
    out = []
    for sector, vals in bucket.items():
        avg = sum(vals) / max(len(vals), 1)
        out.append({"sector": sector, "performance": round(avg, 2), "count": len(vals)})
    out.sort(key=lambda x: x["performance"], reverse=True)
    return out


def _compute_index_summary(stocks: List[Dict], name: str) -> Dict:
    if not stocks:
        return {"name": name, "value": 0.0, "change_percent": 0.0}
    weighted_sum = 0.0
    total_weight = 0.0
    weighted_change = 0.0
    for s in stocks:
        cap = float(s.get("market_cap") or 0.0) or 1.0
        weighted_sum += float(s.get("price") or 0.0) * cap
        weighted_change += float(s.get("change_percent") or 0.0) * cap
        total_weight += cap
    return {
        "name": name,
        "value": round(weighted_sum / total_weight, 2),
        "change_percent": round(weighted_change / total_weight, 2),
    }


async def ingest_once() -> Dict:
    provider = NSEProvider()
    try:
        bundles = await asyncio.gather(*(provider.fetch_index_bundle(idx) for idx in INDEXES))
    finally:
        await provider.aclose()

    fetched = [b.get("rows") or [] for b in bundles]
    metas = [b.get("meta") or {} for b in bundles]
    merged = _normalize(list(fetched))
    ts = _now_ts()
    now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    db: Session = SessionLocal()
    try:
        for row in merged:
            sym = row["symbol"]
            stock = db.query(Stock).filter(Stock.symbol == sym).first()
            if not stock:
                db.add(Stock(symbol=sym, exchange="NSE", company_name=row.get("sector")))

            db.add(
                StockPrice(
                    symbol=sym,
                    price=float(row.get("price") or 0.0),
                    volume=row.get("volume"),
                    timestamp=ts,
                )
            )
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    for row in merged:
        sym = row["symbol"]
        await CacheService.set(
            _cache_key(sym),
            {
                "symbol": sym,
                "exchange": "NSE",
                "price": float(row.get("price") or 0.0),
                "change_percent": float(row.get("change_percent") or 0.0),
                "volume": int(row.get("volume") or 0),
                "timestamp": ts,
                "sector": row.get("sector"),
                "market_cap": float(row.get("market_cap") or 0.0),
                "source": "nse",
                "as_of": now_iso,
            },
            ttl=60,
        )

    nifty500 = fetched[0] if len(fetched) > 0 else []
    bank = fetched[1] if len(fetched) > 1 else []
    nifty_summary = _compute_index_summary(nifty500, "NIFTY 500")
    bank_summary = _compute_index_summary(bank, "NIFTY BANK")
    # Prefer official NSE index-level values when present.
    if metas:
        if metas[0].get("value") is not None:
            nifty_summary["value"] = float(metas[0]["value"])
        if metas[0].get("change_percent") is not None:
            nifty_summary["change_percent"] = float(metas[0]["change_percent"])
    if len(metas) > 1:
        if metas[1].get("value") is not None:
            bank_summary["value"] = float(metas[1]["value"])
        if metas[1].get("change_percent") is not None:
            bank_summary["change_percent"] = float(metas[1]["change_percent"])

    payload = {
        "as_of": now_iso,
        "source": "nse",
        "nifty": nifty_summary,
        "banknifty": bank_summary,
        "sector_performance": _compute_sector_performance(merged),
        "heatmap": [
            {
                "symbol": s["symbol"],
                "price": float(s.get("price") or 0.0),
                "pChange": float(s.get("change_percent") or 0.0),
                "sector": s.get("sector") or "Unknown",
                "marketCap": float(s.get("market_cap") or 0.0),
                "volume": int(s.get("volume") or 0),
            }
            for s in merged
        ],
        # Keep compatibility with existing frontend cards.
        "indices": [
            {
                "symbol": "^NSEI",
                "name": "NIFTY 500",
                "region": "IN",
                "value": nifty_summary["value"],
                "change": 0.0,
                "change_percent": nifty_summary["change_percent"],
                "source": "nse",
                "as_of": now_iso,
            },
            {
                "symbol": "^NSEBANK",
                "name": "NIFTY BANK",
                "region": "IN",
                "value": bank_summary["value"],
                "change": 0.0,
                "change_percent": bank_summary["change_percent"],
                "source": "nse",
                "as_of": now_iso,
            },
        ],
    }

    await CacheService.set(HEATMAP_CACHE_KEY, payload, ttl=120)
    return payload


async def run_forever() -> None:
    while True:
        started = time.time()
        try:
            await ingest_once()
        except Exception as e:
            print(f"[nse_ingestion] error: {e}")
        elapsed = time.time() - started
        await asyncio.sleep(max(0.0, 60.0 - elapsed))
