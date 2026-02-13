"""Inventory CRUD service — real PostgreSQL operations."""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryItem
from app.models.user import User
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemResponse,
    InventorySummary,
    InventorySummaryStats,
)

logger = logging.getLogger(__name__)

DEFAULT_USER_ID = 1


class InventoryService:
    """Full CRUD for inventory items, scoped to user_id."""

    async def _ensure_default_user(self, db: AsyncSession) -> int:
        """Auto-create a default user if none exists. Returns user_id."""
        result = await db.execute(select(User).where(User.id == DEFAULT_USER_ID))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                id=DEFAULT_USER_ID,
                email="default@profiteer.io",
                username="default",
                hashed_password="not-a-real-hash",
            )
            db.add(user)
            await db.commit()
            logger.info("Created default user (id=%d)", DEFAULT_USER_ID)
        return DEFAULT_USER_ID

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_all(
        self,
        db: AsyncSession,
        user_id: int = DEFAULT_USER_ID,
        status: str | None = None,
    ) -> InventorySummary:
        """Return all inventory items + summary stats for a user."""
        stmt = select(InventoryItem).where(InventoryItem.user_id == user_id)
        if status:
            stmt = stmt.where(InventoryItem.listing_status == status)
        stmt = stmt.order_by(InventoryItem.id.desc())

        result = await db.execute(stmt)
        rows = result.scalars().all()

        # Build response items with computed profit_loss
        items: list[InventoryItemResponse] = []
        for row in rows:
            items.append(self._to_response(row))

        # Summary — exclude sold items from value calculations
        active = [r for r in rows if r.listing_status != "sold"]
        total_items = sum(r.quantity for r in active)
        total_value = sum(float(r.current_value or 0) for r in active)
        total_cost = sum(float(r.purchase_price) * r.quantity for r in active)

        return InventorySummary(
            summary=InventorySummaryStats(
                total_items=total_items,
                total_value=round(total_value, 2),
                total_cost=round(total_cost, 2),
                unrealized_pl=round(total_value - total_cost, 2),
            ),
            items=items,
        )

    async def get_by_id(
        self,
        db: AsyncSession,
        item_id: int,
        user_id: int = DEFAULT_USER_ID,
    ) -> InventoryItemResponse | None:
        """Return a single item scoped to user, or None."""
        stmt = select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.user_id == user_id,
        )
        result = await db.execute(stmt)
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
        data: InventoryItemCreate,
        user_id: int = DEFAULT_USER_ID,
    ) -> InventoryItemResponse:
        """Insert a new inventory item."""
        await self._ensure_default_user(db)

        item = InventoryItem(
            user_id=user_id,
            **data.model_dump(),
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        logger.info("Created inventory item id=%d name=%r", item.id, item.name)
        return self._to_response(item)

    async def update(
        self,
        db: AsyncSession,
        item_id: int,
        data: InventoryItemUpdate,
        user_id: int = DEFAULT_USER_ID,
    ) -> InventoryItemResponse | None:
        """Partial update — only sets fields provided by the client."""
        stmt = select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.user_id == user_id,
        )
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
        if item is None:
            return None

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)

        await db.commit()
        await db.refresh(item)
        logger.info("Updated inventory item id=%d", item.id)
        return self._to_response(item)

    async def delete(
        self,
        db: AsyncSession,
        item_id: int,
        user_id: int = DEFAULT_USER_ID,
    ) -> bool:
        """Delete an item. Returns False if not found."""
        stmt = select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.user_id == user_id,
        )
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
        if item is None:
            return False

        await db.delete(item)
        await db.commit()
        logger.info("Deleted inventory item id=%d", item_id)
        return True

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _to_response(row: InventoryItem) -> InventoryItemResponse:
        """Convert a SQLAlchemy model instance to a Pydantic response."""
        price = float(row.purchase_price)
        value = float(row.current_value) if row.current_value is not None else None
        profit_loss = round(value - price, 2) if value is not None else None

        return InventoryItemResponse(
            id=row.id,
            user_id=row.user_id,
            name=row.name,
            purchase_price=price,
            purchase_date=row.purchase_date,
            purchase_source=row.purchase_source,
            condition=row.condition,
            quantity=row.quantity,
            listing_status=row.listing_status,
            storage_location=row.storage_location,
            notes=row.notes,
            current_value=value,
            profit_loss=profit_loss,
        )


inventory_service = InventoryService()
