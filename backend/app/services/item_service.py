"""Item service — find-or-create items by name for price tracking."""

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item import Item

logger = logging.getLogger(__name__)


class ItemService:
    """Lookup and auto-create items in the items table."""

    async def find_or_create(self, db: AsyncSession, name: str) -> Item:
        """Find an item by name (case-insensitive), or create if not found.

        Used by the analyzer to resolve item_id when persisting prices,
        and by the trends router for item lookup.
        """
        stmt = select(Item).where(func.lower(Item.name) == name.lower()).limit(1)
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()

        if item is not None:
            return item

        # Create new item
        item = Item(name=name)
        db.add(item)
        await db.commit()
        await db.refresh(item)
        logger.info("Created item id=%d name=%r", item.id, item.name)
        return item

    async def get_by_id(self, db: AsyncSession, item_id: int) -> Item | None:
        """Fetch a single item by ID."""
        result = await db.execute(select(Item).where(Item.id == item_id))
        return result.scalar_one_or_none()

    async def search(self, db: AsyncSession, query: str, limit: int = 10) -> list[Item]:
        """Search items by name (case-insensitive ILIKE)."""
        stmt = (
            select(Item)
            .where(Item.name.ilike(f"%{query}%"))
            .order_by(Item.name)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())


item_service = ItemService()
