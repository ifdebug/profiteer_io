"""Hype Analyzer endpoints — real hype scores computed from price history.

- GET /hype?q=          → search items for hype analysis
- GET /hype/leaderboards → top items per category by hype score
- GET /hype/{item_id}    → compute + return hype score for an item
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.hype import (
    HypeResponse,
    HypeSearchResult,
    LeaderboardResponse,
)
from app.services.hype_scorer import hype_scorer

router = APIRouter()


@router.get("", response_model=list[HypeSearchResult])
async def search_items_for_hype(
    q: str = Query(..., min_length=1, description="Search query for item name"),
    db: AsyncSession = Depends(get_db),
):
    """Search items by name for the hype search bar."""
    results = await hype_scorer.search_items(db, q)
    return [
        HypeSearchResult(
            id=r["id"],
            name=r["name"],
            category=r["category"],
            latest_score=r["latest_score"],
        )
        for r in results
    ]


@router.get("/leaderboards", response_model=LeaderboardResponse)
async def get_leaderboards(
    db: AsyncSession = Depends(get_db),
):
    """Get hype leaderboards grouped by item category."""
    return await hype_scorer.get_leaderboards(db)


@router.get("/{item_id}", response_model=HypeResponse)
async def get_hype_score(
    item_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Compute and return a hype score for a specific item."""
    result = await hype_scorer.get_hype(db, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return result
