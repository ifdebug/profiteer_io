"""Price Trend Tracker endpoints — real price history from PostgreSQL."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.item import Item
from app.models.price_history import PriceHistory
from app.schemas.trends import ItemSearchResult, TrendResponse
from app.services.price_tracker import price_tracker

router = APIRouter()


@router.get("", response_model=list[ItemSearchResult])
async def search_items(
    q: str = Query(..., min_length=1, description="Search query for item name"),
    db: AsyncSession = Depends(get_db),
):
    """Search items by name for the trends search bar."""
    # Subquery: count price_history rows per item for relevance
    price_count_sq = (
        select(
            PriceHistory.item_id,
            func.count(PriceHistory.id).label("price_count"),
        )
        .group_by(PriceHistory.item_id)
        .subquery()
    )

    stmt = (
        select(
            Item.id,
            Item.name,
            Item.category,
            Item.image_url,
            func.coalesce(price_count_sq.c.price_count, 0).label("price_count"),
        )
        .outerjoin(price_count_sq, Item.id == price_count_sq.c.item_id)
        .where(Item.name.ilike(f"%{q}%"))
        .order_by(func.coalesce(price_count_sq.c.price_count, 0).desc())
        .limit(10)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        ItemSearchResult(
            id=row.id,
            name=row.name,
            category=row.category,
            image_url=row.image_url,
            price_count=row.price_count,
        )
        for row in rows
    ]


@router.get("/{item_id}", response_model=TrendResponse)
async def get_trends(
    item_id: int,
    period: str = Query("30d", pattern="^(7d|30d|90d|1y|all)$"),
    db: AsyncSession = Depends(get_db),
):
    """Get price trend data for a specific item, grouped by marketplace."""
    result = await price_tracker.get_trends(db, item_id, period)
    if result is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return result
