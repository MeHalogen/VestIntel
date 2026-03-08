from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx


@dataclass(frozen=True)
class NewsItem:
    title: str
    source: str
    url: str
    published_at: datetime
    sentiment_score: Optional[float] = None


class NewsProvider:
    """NewsAPI provider.

    Endpoint (top headlines / everything vary by plan):
    https://newsapi.org/v2/top-headlines?category=business&apiKey=...
    """

    def __init__(self, api_key: str):
        self.api_key = (api_key or "").strip()

    async def fetch_latest(self, q: str = "markets OR stocks OR earnings", page_size: int = 20) -> List[NewsItem]:
        if not self.api_key:
            raise RuntimeError("NEWS_API_KEY not configured")

        url = "https://newsapi.org/v2/everything"
        params = {
            "q": q,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": page_size,
            "apiKey": self.api_key,
        }
        timeout = httpx.Timeout(8.0, connect=2.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data: Dict[str, Any] = r.json()

        items: List[NewsItem] = []
        for a in data.get("articles") or []:
            title = (a.get("title") or "").strip()
            url_ = (a.get("url") or "").strip()
            source = ((a.get("source") or {}).get("name") or "NewsAPI").strip()
            published = a.get("publishedAt")
            try:
                published_at = datetime.fromisoformat(published.replace("Z", "+00:00")) if published else datetime.utcnow()
            except Exception:
                published_at = datetime.utcnow()

            if not title or not url_:
                continue

            items.append(
                NewsItem(
                    title=title,
                    source=source,
                    url=url_,
                    published_at=published_at,
                    sentiment_score=None,
                )
            )

        return items
