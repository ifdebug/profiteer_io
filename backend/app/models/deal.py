"""Deal model — retail deals and coupons for sourcing inventory."""

from datetime import date

from sqlalchemy import Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Deal(TimestampMixin, Base):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(primary_key=True)
    retailer: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    url: Mapped[str | None] = mapped_column(String(1000), default=None)
    original_price: Mapped[float | None] = mapped_column(Numeric(10, 2), default=None)
    deal_price: Mapped[float] = mapped_column(Numeric(10, 2))
    discount_pct: Mapped[float | None] = mapped_column(Numeric(5, 2), default=None)
    category: Mapped[str | None] = mapped_column(String(100), index=True, default=None)
    start_date: Mapped[date | None] = mapped_column(default=None)
    end_date: Mapped[date | None] = mapped_column(default=None)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, default=0)
