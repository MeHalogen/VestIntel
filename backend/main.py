from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import stocks, markets, portfolio, insights, alerts
from api.routes import billing
from core.config import settings
from workers.news_ingestion import run_forever as run_news_ingestion
from workers.nse_ingestion import run_forever as run_nse_ingestion
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


@app.on_event("startup")
async def startup_event():
    # Background ingestion: NSE + news (user traffic reads cache/DB only).
    if not settings.DISABLE_WORKERS:
        asyncio.create_task(run_news_ingestion())
        asyncio.create_task(run_nse_ingestion())

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
