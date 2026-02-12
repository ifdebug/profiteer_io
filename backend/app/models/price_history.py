"""Price history model — tracks item prices across marketplaces over time."""

from datetime import datetime

from sqlalchemy import ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    marketplace: Mapped[str] = mapped_column(String(50), index=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    condition: Mapped[str | None] = mapped_column(String(50), default=None)
    sold_date: Mapped[datetime | None] = mapped_column(default=None)
    recorded_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    item = relationship("Item", back_populates="price_history")
