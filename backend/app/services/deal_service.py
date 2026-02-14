"""Deal service — CRUD + voting + profit estimation for retail deals.

Provides full CRUD for deals in PostgreSQL, with category/retailer filtering,
upvote/downvote support, and profit estimation using the fee calculator.
"""

import logging
from datetime import date, datetime

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deal import Deal
from app.schemas.deal import (
    DealCreate,
    DealResponse,
    DealsListResponse,
    UpcomingEvent,
)

logger = logging.getLogger(__name__)

# Static upcoming sale events (would be DB-driven in Phase 5)
UPCOMING_EVENTS = [
    UpcomingEvent(name="Presidents Day Sales", date="2026-02-16", retailers=["Walmart", "Target", "Best Buy", "Home Depot"]),
    UpcomingEvent(name="Amazon Spring Sale", date="2026-03-15", retailers=["Amazon"]),
    UpcomingEvent(name="Target Circle Week", date="2026-04-06", retailers=["Target"]),
    UpcomingEvent(name="Prime Day (Expected)", date="2026-07-15", retailers=["Amazon"]),
    UpcomingEvent(name="Back to School Sales", date="2026-08-01", retailers=["Walmart", "Target", "Best Buy", "Staples"]),
]

DEFAULT_CATEGORIES = ["electronics", "trading_cards", "toys", "collectibles", "sneakers"]
DEFAULT_RETAILERS = ["Walmart", "Target", "Amazon", "Best Buy", "GameStop", "Costco"]


class DealService:
    """Full CRUD for deals with voting and filtering."""

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_all(
        self,
        db: AsyncSession,
        category: str | None = None,
        retailer: str | None = None,
        sort_by: str = "newest",
    ) -> DealsListResponse:
        """Return all deals with optional filters + metadata."""
        stmt = select(Deal).order_by(desc(Deal.created_at))

        if category:
            stmt = stmt.where(Deal.category == category)
        if retailer:
            stmt = stmt.where(func.lower(Deal.retailer) == retailer.lower())

        if sort_by == "popular":
            stmt = stmt.order_by(desc(Deal.upvotes - Deal.downvotes))
        elif sort_by == "discount":
            stmt = stmt.order_by(desc(Deal.discount_pct).nulls_last())
        elif sort_by == "profit":
            stmt = stmt.order_by(desc(Deal.profit_potential).nulls_last())

        result = await db.execute(stmt)
        rows = list(result.scalars().all())

        deals = [self._to_response(row) for row in rows]

        # Get distinct categories and retailers from the data
        categories = await self._get_categories(db)
        retailers = await self._get_retailers(db)

        return DealsListResponse(
            deals=deals,
            total=len(deals),
            upcoming_events=UPCOMING_EVENTS,
            categories=categories,
            retailers=retailers,
        )

    async def get_by_id(
        self,
        db: AsyncSession,
        deal_id: int,
    ) -> DealResponse | None:
        """Return a single deal."""
        result = await db.execute(select(Deal).where(Deal.id == deal_id))
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return self._to_response(row)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create(
        self,
        db: AsyncSession,
        data: DealCreate,
    ) -> DealResponse:
        """Create a new deal with auto-computed discount and profit."""
        # Auto-compute discount percentage if not provided
        discount_pct = data.discount_pct
        if discount_pct is None and data.original_price and data.deal_price:
            if data.original_price > 0:
                discount_pct = round(
                    (1 - data.deal_price / data.original_price) * 100, 1
                )

        # Estimate profit potential if not provided
        profit_potential = data.profit_potential
        if profit_potential is None and data.original_price and data.deal_price:
            profit_potential = self._estimate_profit(
                data.deal_price, data.original_price
            )

        deal = Deal(
            retailer=data.retailer,
            title=data.title,
            description=data.description,
            url=data.url,
            original_price=data.original_price,
            deal_price=data.deal_price,
            discount_pct=discount_pct,
            category=data.category,
            start_date=data.start_date,
            end_date=data.end_date,
            upvotes=0,
            downvotes=0,
            profit_potential=profit_potential,
        )
        db.add(deal)
        await db.commit()
        await db.refresh(deal)
        logger.info("Created deal id=%d title=%r", deal.id, deal.title)
        return self._to_response(deal)

    async def delete(
        self,
        db: AsyncSession,
        deal_id: int,
    ) -> bool:
        """Delete a deal. Returns False if not found."""
        result = await db.execute(select(Deal).where(Deal.id == deal_id))
        deal = result.scalar_one_or_none()
        if deal is None:
            return False

        await db.delete(deal)
        await db.commit()
        logger.info("Deleted deal id=%d", deal_id)
        return True

    # ------------------------------------------------------------------
    # Voting
    # ------------------------------------------------------------------

    async def vote(
        self,
        db: AsyncSession,
        deal_id: int,
        direction: str,  # "up" or "down"
    ) -> DealResponse | None:
        """Upvote or downvote a deal."""
        result = await db.execute(select(Deal).where(Deal.id == deal_id))
        deal = result.scalar_one_or_none()
        if deal is None:
            return None

        if direction == "up":
            deal.upvotes += 1
        elif direction == "down":
            deal.downvotes += 1

        await db.commit()
        await db.refresh(deal)
        return self._to_response(deal)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _estimate_profit(self, buy_price: float, sell_price: float) -> float:
        """Estimate resale profit using rough 15% fee + $9 shipping."""
        if sell_price <= 0:
            return 0.0
        fees = sell_price * 0.15  # ~15% marketplace fees
        shipping = 9.0
        profit = sell_price - buy_price - fees - shipping
        return round(max(0, profit), 2)

    async def _get_categories(self, db: AsyncSession) -> list[str]:
        """Get distinct deal categories."""
        result = await db.execute(
            select(func.distinct(Deal.category))
            .where(Deal.category.isnot(None))
            .order_by(Deal.category)
        )
        cats = [r[0] for r in result.all() if r[0]]
        return sorted(set(cats + DEFAULT_CATEGORIES))

    async def _get_retailers(self, db: AsyncSession) -> list[str]:
        """Get distinct retailers."""
        result = await db.execute(
            select(func.distinct(Deal.retailer)).order_by(Deal.retailer)
        )
        retailers = [r[0] for r in result.all() if r[0]]
        return sorted(set(retailers + DEFAULT_RETAILERS))

    @staticmethod
    def _to_response(row: Deal) -> DealResponse:
        """Convert SQLAlchemy model to Pydantic response."""
        return DealResponse(
            id=row.id,
            retailer=row.retailer,
            title=row.title,
            description=row.description,
            url=row.url,
            original_price=float(row.original_price) if row.original_price is not None else None,
            deal_price=float(row.deal_price),
            discount_pct=float(row.discount_pct) if row.discount_pct is not None else None,
            category=row.category,
            start_date=row.start_date,
            end_date=row.end_date,
            upvotes=row.upvotes,
            downvotes=row.downvotes,
            profit_potential=float(row.profit_potential) if row.profit_potential is not None else None,
            created_at=row.created_at,
        )


deal_service = DealService()
