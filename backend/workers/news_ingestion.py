from __future__ import annotations

import asyncio
import time
from typing import List

from sqlalchemy.orm import Session

from core.cache import CacheService
from core.config import settings
from core.database import SessionLocal
from models.models import News
from providers.news import NewsProvider


def _cache_key() -> str:
    return "news:latest"


async def ingest_once() -> List[dict]:
    provider = NewsProvider(settings.NEWS_API_KEY)
    # Per spec keywords
    items = await provider.fetch_latest(q="stocks OR markets OR earnings OR finance", page_size=40)

    payload: List[dict] = []
    db: Session = SessionLocal()
    try:
        for n in items:
            # upsert by url (best-effort)
            db_item = News(
                title=n.title,
                source=n.source,
                url=n.url,
                published_at=n.published_at,
                sentiment_score=n.sentiment_score,
            )
            try:
                db.add(db_item)
                db.flush()
            except Exception:
                db.rollback()
                # likely constraint (duplicate url). ignore.
                continue

            payload.append(
                {
                    "title": n.title,
                    "url": n.url,
                    "source": n.source,
                    "published_at": n.published_at.isoformat(),
                    "summary": None,
                }
            )

        db.commit()
    finally:
        db.close()

    # Cache for 10 minutes
    await CacheService.set(_cache_key(), payload, ttl=10 * 60)
    return payload


async def run_forever() -> None:
    while True:
        started = time.time()
        try:
            await ingest_once()
        except Exception as e:
            print(f"[news_ingestion] error: {e}")

        elapsed = time.time() - started
        sleep_for = max(0.0, (10 * 60) - elapsed)
        await asyncio.sleep(sleep_for)
