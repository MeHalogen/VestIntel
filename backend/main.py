from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import stocks, markets, portfolio, insights, alerts
from api.routes import billing
from api.routes import risk
from api.routes import pulse
from api.routes import opportunities
from core.config import settings
from core.database import engine
from models.models import Base
from workers.news_ingestion import run_forever as run_news_ingestion
from workers.nse_worker import run_worker as run_nse_worker
import asyncio

app = FastAPI(
    title="VestIntel API",
    description="AI-Powered Stock Intelligence Platform API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(markets.router, prefix="/api/markets", tags=["markets"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(risk.router, prefix="/api/risk", tags=["risk"])
app.include_router(pulse.router, prefix="/api/pulse", tags=["pulse"])
app.include_router(opportunities.router, prefix="/api/opportunities", tags=["opportunities"])


@app.on_event("startup")
async def startup_event():
    # Create all DB tables (idempotent — safe to run on every start).
    Base.metadata.create_all(bind=engine)
    if not settings.DISABLE_WORKERS:
        # Background news ingestion worker (doesn't touch NSE).
        asyncio.create_task(run_news_ingestion())
        # NSE market data worker — runs inside the web process on Render free plan.
        asyncio.create_task(run_nse_worker())


@app.on_event("shutdown")
async def shutdown_event():
    pass

@app.get("/")
async def root():
    return {
        "message": "VestIntel API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
