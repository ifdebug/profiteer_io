"""Inventory item model — tracks user's owned items."""

from datetime import date

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class InventoryItem(TimestampMixin, Base):
    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    item_id: Mapped[int | None] = mapped_column(
        ForeignKey("items.id"), index=True, default=None
    )
    name: Mapped[str] = mapped_column(String(500))
    purchase_price: Mapped[float] = mapped_column(Numeric(10, 2))
    purchase_date: Mapped[date | None] = mapped_column(default=None)
    purchase_source: Mapped[str | None] = mapped_column(String(200), default=None)
    condition: Mapped[str] = mapped_column(String(50), default="new")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    listing_status: Mapped[str] = mapped_column(
        String(50), default="unlisted", index=True
    )
    storage_location: Mapped[str | None] = mapped_column(String(200), default=None)
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    current_value: Mapped[float | None] = mapped_column(Numeric(10, 2), default=None)

    user = relationship("User", back_populates="inventory_items")
    item = relationship("Item", back_populates="inventory_items")
