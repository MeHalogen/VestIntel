import os
import sys

import pytest
from fastapi.testclient import TestClient

# Ensure `backend/` is importable when tests are run from repo root or other cwd.
HERE = os.path.dirname(__file__)
BACKEND_ROOT = os.path.abspath(os.path.join(HERE, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

import main  # noqa: E402


@pytest.fixture
def client():
    return TestClient(main.app)


def test_requires_user_header(client):
    r = client.get("/api/stocks/quote", params={"symbol": "AAPL"})
    assert r.status_code == 401


def test_quote_uses_cache_first(client, monkeypatch):
    # Arrange: cache hit
    from core.cache import CacheService

    cached = {
        "symbol": "AAPL",
        "exchange": "US",
        "price": 123.45,
        "change_percent": 1.23,
        "volume": None,
        "timestamp": 111,
        "source": "cache",
    }

    async def fake_get(key):
        assert key == "stock:price:AAPL"
        return cached

    async def fake_set(*args, **kwargs):
        raise AssertionError("should not set cache when already cached")

    monkeypatch.setattr(CacheService, "get", fake_get)
    monkeypatch.setattr(CacheService, "set", fake_set)

    # Act
    r = client.get(
        "/api/stocks/quote",
        params={"symbol": "AAPL"},
        headers={"X-User-Email": "test@example.com"},
    )

    # Assert
    assert r.status_code == 200
    assert r.json()["source"] == "cache"


def test_routing_ns_uses_twelvedata(client, monkeypatch):
    # Force cache miss
    from core.cache import CacheService

    async def miss(_):
        return None

    async def ok_set(*args, **kwargs):
        return None

    monkeypatch.setattr(CacheService, "get", miss)
    monkeypatch.setattr(CacheService, "set", ok_set)

    # Mock TwelveData provider
    from providers import twelvedata as td_mod

    async def fake_fetch_quote(self, symbol):
        assert symbol == "RELIANCE.NSE"
        return td_mod.TwelveDataQuote(
            symbol=symbol,
            price=10.0,
            change=0.0,
            change_percent=0.0,
            timestamp=123,
            volume=1,
        )

    monkeypatch.setattr(td_mod.TwelveDataProvider, "fetch_quote", fake_fetch_quote)

    # Act
    r = client.get(
        "/api/stocks/quote",
        params={"symbol": "RELIANCE.NSE"},
        headers={"X-User-Email": "test@example.com"},
    )

    assert r.status_code == 200
    body = r.json()
    assert body["source"].startswith("twelvedata")
    assert body["exchange"] == "NSE"


def test_fallback_finnhub_to_twelvedata(client, monkeypatch):
    # Force cache miss
    from core.cache import CacheService

    async def miss(_):
        return None

    async def ok_set(*args, **kwargs):
        return None

    monkeypatch.setattr(CacheService, "get", miss)
    monkeypatch.setattr(CacheService, "set", ok_set)

    # Finnhub fails
    from providers import finnhub as fh_mod

    async def fail_fetch(self, symbol):
        raise RuntimeError("boom")

    monkeypatch.setattr(fh_mod.FinnhubProvider, "fetch_quote", fail_fetch)

    # TwelveData succeeds
    from providers import twelvedata as td_mod

    async def td_fetch(self, symbol):
        return td_mod.TwelveDataQuote(
            symbol=symbol,
            price=20.0,
            change=0.0,
            change_percent=0.0,
            timestamp=456,
            volume=None,
        )

    monkeypatch.setattr(td_mod.TwelveDataProvider, "fetch_quote", td_fetch)

    r = client.get(
        "/api/stocks/quote",
        params={"symbol": "AAPL"},
        headers={"X-User-Email": "test@example.com"},
    )

    assert r.status_code == 200
    assert r.json()["source"].startswith("twelvedata_fallback")
