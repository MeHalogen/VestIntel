from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union

BACKEND_DIR = Path(__file__).resolve().parents[1]

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/vestintel"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # API Keys
    ALPHA_VANTAGE_API_KEY: str = ""
    FINNHUB_API_KEY: str = ""
    TWELVEDATA_API_KEY: str = ""
    NEWS_API_KEY: str = ""

    # Market data ingestion
    # Predefined watchlist to keep warm in cache & store in DB
    INGEST_WATCHLIST: str = (
    "AAPL,NVDA,MSFT,MCO,TSLA,AMZN,META,GOOGL,"
    "RELIANCE.NSE,TCS.NSE,INFY.NSE,HDFCBANK.NSE,ITC.NSE"
    )

    # Keep workers OFF by default for safety in tests/CI; enable in .env for local runtime.
    DISABLE_WORKERS: bool = True

    # Cache TTL overrides (seconds)
    PRICE_CACHE_TTL_SECONDS: int = 60
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Admin
    # Used to protect manual plan assignment endpoints until Razorpay/Stripe is integrated.
    ADMIN_API_KEY: str = ""
    
    # CORS
    # Accept both:
    # - list style (e.g. via JSON): ["http://...","http://..."]
    # - comma-separated string (common in .env): http://...,http://...
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3100",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3100",
    ]

    def allowed_origins_list(self) -> List[str]:
        v = self.ALLOWED_ORIGINS
        if isinstance(v, list):
            return [s.strip() for s in v if str(s).strip()]
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return []
    
    # Cache
    CACHE_TTL: int = 300  # 5 minutes
    
    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
