"""User model."""

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    settings: Mapped[dict | None] = mapped_column(JSON, default=None)

    inventory_items = relationship("InventoryItem", back_populates="user")
    shipments = relationship("Shipment", back_populates="user")
    alerts = relationship("Alert", back_populates="user")
