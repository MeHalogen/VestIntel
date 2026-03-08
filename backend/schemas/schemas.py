from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class StockQuote(BaseModel):
    symbol: str
    exchange: str
    price: float
    change_percent: float
    volume: Optional[int] = None
    timestamp: int

    # Optional enrichment
    change: Optional[float] = None
    currency: Optional[str] = None
    source: Optional[str] = None
    market_cap: Optional[float] = None
    sector: Optional[str] = None


class NewsArticle(BaseModel):
    title: str
    url: str
    source: str
    published_at: datetime
    summary: Optional[str] = None
    tickers: Optional[List[str]] = None
    sentiment_score: Optional[float] = None
    as_of: Optional[datetime] = None


class Signal(BaseModel):
    id: str
    symbol: str
    type: str
    severity: str
    message: str
    timestamp: int
    source: Optional[str] = None
    as_of: Optional[datetime] = None

class StockHistory(BaseModel):
    date: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int

class MarketIndex(BaseModel):
    symbol: str
    name: str
    value: float
    change: float
    change_percent: float
    source: Optional[str] = None
    as_of: Optional[datetime] = None

class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None

class HoldingCreate(BaseModel):
    symbol: str
    shares: float
    avg_cost: float
    purchase_date: datetime

class AlertCreate(BaseModel):
    symbol: str
    alert_type: str
    condition: str
    value: float

class AIInsight(BaseModel):
    symbol: str
    sentiment_score: int
    technical_rating: str
    risk_level: str
    summary: str
    key_insights: List[str]
    related_stocks: Optional[List[str]] = None
    data_points: Optional[List[dict]] = None
    source: Optional[str] = None
    as_of: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
