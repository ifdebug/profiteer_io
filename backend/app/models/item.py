"""Item model — represents a product that can be tracked/analyzed."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Item(TimestampMixin, Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(500), index=True)
    upc: Mapped[str | None] = mapped_column(String(50), index=True, default=None)
    sku: Mapped[str | None] = mapped_column(String(100), default=None)
    category: Mapped[str | None] = mapped_column(String(100), index=True, default=None)
    image_url: Mapped[str | None] = mapped_column(String(1000), default=None)
    description: Mapped[str | None] = mapped_column(Text, default=None)

    price_history = relationship("PriceHistory", back_populates="item")
    inventory_items = relationship("InventoryItem", back_populates="item")
    alerts = relationship("Alert", back_populates="item")
