"""Deals & Coupons Tracker endpoints — CRUD with voting and filtering."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.deal import (
    DealCreate,
    DealResponse,
    DealsListResponse,
)
from app.services.deal_service import deal_service

router = APIRouter()


@router.get("", response_model=DealsListResponse)
async def get_deals(
    category: str | None = Query(None),
    retailer: str | None = Query(None),
    sort: str = Query("newest"),
    db: AsyncSession = Depends(get_db),
):
    """List all deals with optional category/retailer filters."""
    return await deal_service.get_all(db, category=category, retailer=retailer, sort_by=sort)


@router.get("/{deal_id}", response_model=DealResponse)
async def get_deal(
    deal_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single deal."""
    result = await deal_service.get_by_id(db, deal_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    return result


@router.post("", response_model=DealResponse, status_code=201)
async def create_deal(
    data: DealCreate,
    db: AsyncSession = Depends(get_db),
):
    """Submit a new deal.

    Discount percentage and profit potential are auto-computed if not provided.
    """
    return await deal_service.create(db, data)


@router.delete("/{deal_id}")
async def delete_deal(
    deal_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a deal."""
    deleted = await deal_service.delete(db, deal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"success": True, "message": f"Deal {deal_id} deleted"}


@router.post("/{deal_id}/vote", response_model=DealResponse)
async def vote_deal(
    deal_id: int,
    direction: str = Query(..., pattern="^(up|down)$"),
    db: AsyncSession = Depends(get_db),
):
    """Upvote or downvote a deal.

    Pass `direction=up` or `direction=down` as a query parameter.
    """
    result = await deal_service.vote(db, deal_id, direction)
    if result is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    return result
