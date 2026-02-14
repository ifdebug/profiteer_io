"""Arbitrage Finder endpoints — real cross-marketplace price gap detection.

- GET  /arbitrage/opportunities → find arbitrage from existing price_history
- POST /arbitrage/scan          → scrape + find arbitrage for a specific query
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.arbitrage import ArbitrageScanRequest, OpportunitiesResponse
from app.services.arbitrage import arbitrage_service

router = APIRouter()


@router.get("/opportunities", response_model=OpportunitiesResponse)
async def get_opportunities(
    category: str | None = Query(None, description="Filter by item category"),
    min_profit: float | None = Query(None, description="Minimum profit threshold"),
    sort: str = Query("profit", pattern="^(profit|roi|margin)$"),
    db: AsyncSession = Depends(get_db),
):
    """Find arbitrage opportunities from existing price history data."""
    return await arbitrage_service.find_opportunities(
        db,
        category=category,
        min_profit=min_profit,
        sort_by=sort,
    )


@router.post("/scan", response_model=OpportunitiesResponse)
async def scan_for_arbitrage(
    request: ArbitrageScanRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run a fresh scrape for a query and then find arbitrage opportunities.

    This triggers the marketplace scrapers, persists new prices to the
    database, then scans all items for cross-marketplace price gaps.
    """
    return await arbitrage_service.scan_and_find(
        db,
        query=request.query,
        purchase_price=request.purchase_price,
        condition=request.condition,
    )
