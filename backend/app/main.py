"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    analyzer,
    arbitrage,
    dashboard,
    deals,
    hype,
    inventory,
    notifications,
    shipments,
    trends,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    from app.database import engine
    from app.services.cache import cache_service

    await cache_service.close()
    await engine.dispose()


app = FastAPI(
    title="Profiteer.io API",
    description="Backend API for the Profiteer.io reseller tools platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(analyzer.router, prefix="/api/v1/analyzer", tags=["analyzer"])
app.include_router(trends.router, prefix="/api/v1/trends", tags=["trends"])
app.include_router(shipments.router, prefix="/api/v1/shipments", tags=["shipments"])
app.include_router(arbitrage.router, prefix="/api/v1/arbitrage", tags=["arbitrage"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["inventory"])
app.include_router(deals.router, prefix="/api/v1/deals", tags=["deals"])
app.include_router(hype.router, prefix="/api/v1/hype", tags=["hype"])
app.include_router(
    notifications.router, prefix="/api/v1/notifications", tags=["notifications"]
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "profiteer-api"}
