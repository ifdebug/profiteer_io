"""Shipment model — tracks packages across carriers."""

from datetime import datetime

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Shipment(TimestampMixin, Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    tracking_number: Mapped[str] = mapped_column(String(100), index=True)
    carrier: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(50), default="label_created")
    origin: Mapped[str | None] = mapped_column(String(200), default=None)
    destination: Mapped[str | None] = mapped_column(String(200), default=None)
    estimated_delivery: Mapped[datetime | None] = mapped_column(default=None)
    items: Mapped[dict | None] = mapped_column(JSON, default=None)
    events: Mapped[list | None] = mapped_column(JSON, default=None)

    user = relationship("User", back_populates="shipments")
