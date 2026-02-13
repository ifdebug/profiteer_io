"""Profitability Analyzer endpoint — scrapes marketplaces and computes profitability."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.analyzer import ProfitabilityRequest, ProfitabilityResponse
from app.services.analyzer import analyzer_service

router = APIRouter()


@router.post("/analyze", response_model=ProfitabilityResponse)
async def analyze_item(
    request: ProfitabilityRequest,
    db: AsyncSession = Depends(get_db),
):
    """Analyze profitability of an item across all supported marketplaces.

    Scrapes eBay, TCGPlayer, and Mercari for sold/active listings,
    calculates fees and shipping, and returns sorted profitability results.
    """
    return await analyzer_service.analyze(request, db=db)
