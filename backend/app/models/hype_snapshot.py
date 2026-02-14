"""HypeSnapshot model — stores computed hype scores over time for items."""

from datetime import datetime

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class HypeSnapshot(TimestampMixin, Base):
    __tablename__ = "hype_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    trend: Mapped[str] = mapped_column(String(20), default="stable")

    # Individual signal scores (0-100 each)
    price_velocity_score: Mapped[float] = mapped_column(Float, default=0.0)
    volume_score: Mapped[float] = mapped_column(Float, default=0.0)
    marketplace_spread_score: Mapped[float] = mapped_column(Float, default=0.0)
    price_premium_score: Mapped[float] = mapped_column(Float, default=0.0)
    momentum_score: Mapped[float] = mapped_column(Float, default=0.0)
    recency_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Raw signal values for display
    total_data_points: Mapped[int] = mapped_column(Integer, default=0)
    marketplace_count: Mapped[int] = mapped_column(Integer, default=0)
    price_change_pct: Mapped[float] = mapped_column(Float, default=0.0)
    avg_daily_volume: Mapped[float] = mapped_column(Float, default=0.0)

    recorded_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, index=True
    )

    item = relationship("Item", backref="hype_snapshots")
